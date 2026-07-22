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
    if (data.status === 'INSTALLED') updateData.installedAt = new Date();
    if (data.status === 'PENDING') updateData.installedAt = null;

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ message: 'Error al actualizar venta' }, { status: 500 });
  }
}
