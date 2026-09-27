import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    const data = await req.json();

    if (isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;

    const installedAt = new Date();
    if (data.status === 'INSTALLED') updateData.installedAt = installedAt;
    if (data.status === 'PENDING') updateData.installedAt = null;

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: updateData,
    });

    // Auto-generate contract when sale is marked as INSTALLED
    if (data.status === 'INSTALLED') {
      const existingContract = await prisma.contract.findUnique({ where: { saleId: id } });

      if (!existingContract) {
        const monthlyAmount = data.monthlyAmount || 0;
        const startDate = installedAt;
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
        const paymentDay = startDate.getDate();

        const lastContract = await prisma.contract.findFirst({ orderBy: { id: 'desc' } });
        const nextNum = lastContract ? lastContract.id + 1 : 1;
        const contractNumber = `FV-${new Date().getFullYear()}-${nextNum.toString().padStart(4, '0')}`;

        await prisma.contract.create({
          data: {
            contractNumber,
            saleId: id,
            clientUserId: data.clientUserId || null,
            sellerUserId: data.sellerUserId || null,
            startDate,
            endDate,
            monthlyAmount,
            paymentDay,
            receipts: {
              create: [1, 2, 3].map((month) => {
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + month);
                return { monthNumber: month, dueDate, amount: monthlyAmount };
              }),
            },
          },
        });
      }
    }

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ message: 'Error al actualizar venta' }, { status: 500 });
  }
}
