import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const COMPANY_WHATSAPP = '51955318590'; // +51 955 318 590

// GET — obtener recibos pendientes que necesitan recordatorio
export async function GET() {
  const now = new Date();
  const fiveDaysLater = new Date();
  fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

  // Recibos PENDIENTES con vencimiento en los próximos 5 días o ya vencidos
  const receipts = await prisma.receipt.findMany({
    where: {
      status: 'PENDING',
      dueDate: { lte: fiveDaysLater },
    },
    include: {
      contract: {
        include: {
          sale: { select: { names: true, phone: true, internetPlan: true } },
        },
      },
    },
  });

  // Filtrar: recordatorio si no se envió hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const needsReminder = receipts.filter(r => {
    if (!r.reminderLastSentAt) return true;
    const lastSent = new Date(r.reminderLastSentAt);
    lastSent.setHours(0, 0, 0, 0);
    return lastSent.getTime() < today.getTime();
  });

  const results = needsReminder.map(r => {
    const daysUntil = Math.ceil((new Date(r.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const phone = r.contract.sale.phone.replace(/\D/g, '');
    const clientPhone = phone.startsWith('51') ? phone : `51${phone}`;

    let msg = '';
    if (daysUntil > 0) {
      msg = `Hola *${r.contract.sale.names}*, le recordamos que su pago del mes ${r.monthNumber} de S/ ${r.amount.toFixed(2)} por su servicio *${r.contract.sale.internetPlan}* vence en *${daysUntil} día(s)*, el ${new Date(r.dueDate).toLocaleDateString('es-PE')}. Por favor realizar el pago a tiempo para evitar la suspensión del servicio. Gracias 🙏 — ForwardVision`;
    } else {
      msg = `Hola *${r.contract.sale.names}*, su pago del mes ${r.monthNumber} de S/ ${r.amount.toFixed(2)} está *VENCIDO*. Por favor regularice su cuenta a la brevedad para evitar la suspensión de su servicio *${r.contract.sale.internetPlan}*. — ForwardVision`;
    }

    return {
      receiptId: r.id,
      clientName: r.contract.sale.names,
      clientPhone: r.contract.sale.phone,
      amount: r.amount,
      dueDate: r.dueDate,
      daysUntil,
      monthNumber: r.monthNumber,
      waLink: `https://wa.me/${clientPhone}?text=${encodeURIComponent(msg)}`,
      lastSent: r.reminderLastSentAt,
      reminderCount: r.reminderCount,
    };
  });

  return NextResponse.json(results);
}

// POST — marcar como enviado (después de que el asesor haga click en el link de WA)
export async function POST(req: Request) {
  const { receiptIds } = await req.json();
  if (!receiptIds?.length) return NextResponse.json({ message: 'Sin IDs' }, { status: 400 });

  await prisma.receipt.updateMany({
    where: { id: { in: receiptIds } },
    data: {
      reminderLastSentAt: new Date(),
      reminderCount: { increment: 1 },
    },
  });

  return NextResponse.json({ message: 'Recordatorios marcados como enviados', count: receiptIds.length });
}
