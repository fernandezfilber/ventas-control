import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const TIME_ZONE = 'America/Lima';
const CLAIM_TIMEOUT_MS = 15 * 60 * 1000;
const MIN_SEND_DELAY_MS = 5_000;
const MAX_SEND_DELAY_MS = 15_000;
const DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '51';

type ReminderStage = 'FIVE_DAYS' | 'DUE_TODAY';

function getDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function getPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.length === 9 ? `${DEFAULT_COUNTRY_CODE}${digits}` : digits;
  return /^\d{10,15}$/.test(normalized) ? normalized : null;
}

function waitBeforeNextMessage() {
  const delay = MIN_SEND_DELAY_MS + Math.floor(Math.random() * (MAX_SEND_DELAY_MS - MIN_SEND_DELAY_MS + 1));
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return false;
  const provided = authorization.slice('Bearer '.length);
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

async function sendTextMessage(number: string, text: string) {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!apiUrl || !apiKey || !instance) {
    throw new Error('La integración con Evolution API no está configurada.');
  }

  const response = await fetch(
    `${apiUrl.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(instance)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ number, text }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Evolution API respondió con estado HTTP ${response.status}.`);
  }
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Falta configurar CRON_SECRET.' }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const today = getDateKey(new Date());
  const fiveDaysFromNow = addDays(today, 5);
  const receipts = await prisma.receipt.findMany({
    where: {
      status: { not: 'PAID' },
      contract: {
        clientUser: { is: { whatsappRemindersEnabled: true } },
      },
    },
    include: {
      contract: {
        include: {
          clientUser: { select: { fullName: true, phone: true } },
          sale: { select: { names: true, phone: true } },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let sendAttempts = 0;
  const errors: { receiptId: number; stage: ReminderStage; message: string }[] = [];

  for (const receipt of receipts) {
    const dueDateKey = `${receipt.dueDate.getUTCFullYear()}-${String(receipt.dueDate.getUTCMonth() + 1).padStart(2, '0')}-${String(receipt.dueDate.getUTCDate()).padStart(2, '0')}`;
    const stage: ReminderStage | null = dueDateKey === today
      ? 'DUE_TODAY'
      : dueDateKey > today && dueDateKey <= fiveDaysFromNow
        ? 'FIVE_DAYS'
        : null;

    if (!stage) {
      skipped++;
      continue;
    }

    const sentAtField = stage === 'FIVE_DAYS'
      ? 'reminderFiveDaysSentAt'
      : 'reminderDueDateSentAt';
    if (receipt[sentAtField]) {
      skipped++;
      continue;
    }

    const claimedAt = new Date();
    const claim = await prisma.receipt.updateMany({
      where: {
        id: receipt.id,
        status: { not: 'PAID' },
        [sentAtField]: null,
        OR: [
          { reminderClaimedAt: null },
          { reminderClaimedAt: { lt: new Date(claimedAt.getTime() - CLAIM_TIMEOUT_MS) } },
        ],
      },
      data: { reminderClaimedAt: claimedAt, reminderClaimedStage: stage },
    });
    if (claim.count === 0) {
      skipped++;
      continue;
    }

    const phone = getPhoneNumber(
      receipt.contract.clientUser?.phone || receipt.contract.sale.phone,
    );
    if (!phone) {
      await prisma.receipt.updateMany({
        where: { id: receipt.id, reminderClaimedAt: claimedAt, reminderClaimedStage: stage },
        data: { reminderClaimedAt: null, reminderClaimedStage: null },
      });
      errors.push({ receiptId: receipt.id, stage, message: 'El número de teléfono no tiene un formato válido.' });
      continue;
    }

    const name = receipt.contract.clientUser?.fullName || receipt.contract.sale.names;
    const formattedDueDate = new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(receipt.dueDate);
    const timing = stage === 'FIVE_DAYS' ? 'dentro de cinco días' : 'hoy';
    const text = `Hola ${name}, te recordamos que el pago de S/ ${receipt.amount.toFixed(2)} vence ${timing} (${formattedDueDate}). Si ya pagaste, ignora este mensaje. Para dejar de recibir recordatorios, responde SALIR o desactívalos en tu cuenta de cliente, en Pagos. ForwardVision: +51 955 318 590.`;

    try {
      if (sendAttempts > 0) await waitBeforeNextMessage();
      sendAttempts++;
      await sendTextMessage(phone, text);
      const sentAt = new Date();
      await prisma.receipt.updateMany({
        where: { id: receipt.id, reminderClaimedAt: claimedAt, reminderClaimedStage: stage },
        data: {
          [sentAtField]: sentAt,
          lastReminderAt: sentAt,
          reminderCount: { increment: 1 },
          reminderClaimedAt: null,
          reminderClaimedStage: null,
        },
      });
      sent++;
    } catch (error) {
      await prisma.receipt.updateMany({
        where: { id: receipt.id, reminderClaimedAt: claimedAt, reminderClaimedStage: stage },
        data: { reminderClaimedAt: null, reminderClaimedStage: null },
      });
      const message = error instanceof Error ? error.message : 'Error desconocido al enviar el mensaje.';
      console.error(`Error enviando recordatorio WhatsApp para recibo ${receipt.id}:`, error);
      errors.push({ receiptId: receipt.id, stage, message });
    }
  }

  return NextResponse.json(
    { date: today, sent, skipped, failed: errors.length, errors },
    { status: errors.length ? 502 : 200 },
  );
}
