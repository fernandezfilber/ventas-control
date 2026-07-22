import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    const { status } = await req.json();

    if (isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    if (!['APPROVED', 'BLOCKED', 'PENDING'].includes(status)) {
      return NextResponse.json({ message: 'Estado inválido' }, { status: 400 });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ message: 'Error al actualizar empleado' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ message: 'Empleado eliminado' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ message: 'Error al eliminar empleado' }, { status: 500 });
  }
}
