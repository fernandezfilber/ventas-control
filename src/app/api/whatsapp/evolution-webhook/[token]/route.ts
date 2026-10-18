import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '51';

interface EvolutionMessageEvent {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: {
        mimetype?: string;
        caption?: string;
        base64?: string;
      };
      base64?: string;
    };
    messageType?: string;
    base64?: string;
  };
}

function isValidToken(provided: string) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret) return false;
  const expectedBytes = Buffer.from(secret);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes);
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 9 ? `${DEFAULT_COUNTRY_CODE}${digits}` : digits;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isValidToken(token)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 8_500_000) {
    return NextResponse.json({ message: 'La imagen supera el tamaño permitido.' }, { status: 413 });
  }

  let event: EvolutionMessageEvent;
  try {
    event = await request.json() as EvolutionMessageEvent;
  } catch {
    return NextResponse.json({ message: 'El cuerpo debe ser JSON válido.' }, { status: 400 });
  }

  if (!event || typeof event !== 'object' || !event.event || !event.data?.key) {
    return NextResponse.json({ message: 'Evento de Evolution API inválido.' }, { status: 400 });
  }

  const normalizedEvent = event.event.toUpperCase().replace(/[.-]/g, '_');
  if (!normalizedEvent.endsWith('MESSAGES_UPSERT') ||
    event.instance !== process.env.EVOLUTION_INSTANCE ||
    event.data.key.fromMe !== false) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const remoteJid = event.data.key.remoteJid;
  if (!remoteJid || !remoteJid.endsWith('@s.whatsapp.net')) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const messageText = event.data.message?.conversation ??
    event.data.message?.extendedTextMessage?.text ??
    '';
  const senderPhone = normalizePhone(remoteJid.slice(0, remoteJid.indexOf('@')));
  if (/^SALIR$/i.test(messageText.trim())) {
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT', phone: { not: null }, whatsappRemindersEnabled: true },
      select: { id: true, phone: true },
    });
    const matchingClientIds = clients
      .filter((client) => client.phone && normalizePhone(client.phone) === senderPhone)
      .map((client) => client.id);

    if (matchingClientIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: matchingClientIds }, whatsappRemindersEnabled: true },
        data: { whatsappRemindersEnabled: false },
      });
    }

    return NextResponse.json({ received: true, unsubscribed: matchingClientIds.length > 0 });
  }

  const imageMessage = event.data.message?.imageMessage;
  const isImage = event.data.messageType === 'imageMessage' || Boolean(imageMessage);
  if (!isImage) return NextResponse.json({ received: true, ignored: true });

  const base64Value = imageMessage?.base64 ??
    event.data.message?.base64 ??
    event.data.base64;
  const mimeType = imageMessage?.mimetype;
  if (!base64Value || !mimeType) {
    console.warn(`Evolution API no incluyó los datos de imagen para el mensaje ${event.data.key.id ?? 'sin ID'}. Revisa webhook_base64.`);
    return NextResponse.json({ received: true, proofCaptured: false, reason: 'Evolution API no incluyó el contenido de la imagen.' });
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType.toLowerCase())) {
    return NextResponse.json({ received: true, proofCaptured: false, reason: 'Formato de imagen no admitido.' });
  }

  const imageBase64 = base64Value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return NextResponse.json({ received: true, proofCaptured: false, reason: 'Contenido de imagen inválido.' });
  }
  const imageSize = Buffer.from(imageBase64, 'base64').length;
  if (imageSize === 0 || imageSize > 6 * 1024 * 1024) {
    return NextResponse.json({ received: true, proofCaptured: false, reason: 'La imagen está vacía o supera 6 MB.' });
  }

  const messageId = event.data.key.id;
  if (!messageId) {
    return NextResponse.json({ received: true, proofCaptured: false, reason: 'El mensaje no tiene un identificador.' });
  }

  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT', phone: { not: null } },
    select: { id: true, phone: true },
  });
  const matchingClients = clients.filter(
    (client) => client.phone && normalizePhone(client.phone) === senderPhone,
  );
  if (matchingClients.length !== 1) {
    console.warn(`Captura Yape recibida de ${senderPhone} sin coincidencia única con una cuenta de cliente.`);
    return NextResponse.json({ received: true, proofCaptured: false, reason: 'El número no identifica una única cuenta de cliente.' });
  }

  const clientUserId = matchingClients[0].id;
  const contracts = await prisma.contract.findMany({
    where: { clientUserId },
    select: {
      receipts: {
        where: { status: { not: 'PAID' } },
        select: { id: true },
      },
    },
  });
  const pendingReceiptIds = contracts.flatMap((contract) => contract.receipts.map((receipt) => receipt.id));
  const candidateReceiptId = pendingReceiptIds.length === 1 ? pendingReceiptIds[0] : null;

  const proof = await prisma.paymentProof.upsert({
    where: { messageId },
    update: {},
    create: {
      messageId,
      clientUserId,
      candidateReceiptId,
      senderPhone,
      mimeType: mimeType.toLowerCase(),
      imageBase64,
      caption: imageMessage?.caption?.slice(0, 2000) || null,
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ received: true, proofCaptured: true, proofId: proof.id, status: proof.status });
}
