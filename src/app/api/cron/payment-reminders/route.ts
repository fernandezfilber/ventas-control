import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ message: 'Falta configurar CRON_SECRET' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!accessToken || !phoneNumberId || !templateName) {
    return NextResponse.json({ message: 'La integración de WhatsApp no está configurada' }, { status: 503 });
  }

  const now = new Date();
  const reminderWindow = new Date(now);
  reminderWindow.setDate(reminderWindow.getDate() + 3);
  const retryAfter = new Date(now);
  retryAfter.setHours(retryAfter.getHours() - 24);

  const receipts = await prisma.receipt.findMany({
    where: {
      status: 'PENDING',
      dueDate: { lte: reminderWindow },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: retryAfter } }],
      contract: {
        is: {
          reminderMode: 'AUTOMATIC',
          clientUser: { is: { whatsappRemindersEnabled: true } },
        },
      },
    },
    include: {
      contract: {
        include: {
          clientUser: { select: { fullName: true } },
          sale: { select: { names: true, phone: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 100,
  });

  let sent = 0;
  let failed = 0;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es_PE';
  const countryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '51';

  for (const receipt of receipts) {
    const digits = receipt.contract.sale.phone.replace(/\D/g, '');
    const phone = digits.length === 9 ? `${countryCode}${digits}` : digits;
    if (phone.length < 10) {
      failed += 1;
      continue;
    }

    const claimed = await prisma.receipt.updateMany({
      where: {
        id: receipt.id,
        status: 'PENDING',
        OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: retryAfter } }],
      },
      data: { lastReminderAt: now },
    });
    if (claimed.count === 0) continue;

    try {
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [{
              type: 'body',
              parameters: [
                { type: 'text', text: receipt.contract.clientUser?.fullName || receipt.contract.sale.names },
                { type: 'text', text: receipt.amount.toFixed(2) },
                { type: 'text', text: receipt.dueDate.toLocaleDateString('es-PE') },
              ],
            }],
          },
        }),
      });

      if (!response.ok) throw new Error('WhatsApp API rejected the message');
      sent += 1;
    } catch {
      await prisma.receipt.updateMany({
        where: { id: receipt.id, lastReminderAt: now },
        data: { lastReminderAt: null },
      });
      failed += 1;
    }
  }

  return NextResponse.json({ scanned: receipts.length, sent, failed });
}