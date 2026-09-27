import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'ventas-control-jwt-secret-prod-2024');

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.role !== 'ADMIN') return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  } catch {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

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

    // Si se aprobó al empleado, creamos su cuenta de usuario (SELLER) automáticamente
    if (status === 'APPROVED') {
      const existingUser = await prisma.user.findUnique({ where: { username: updated.dni } });
      let sellerAccount = existingUser;
      if (!sellerAccount) {
        const hashedPassword = await bcrypt.hash(updated.dni, 10);
        sellerAccount = await prisma.user.create({
          data: {
            username: updated.dni,
            password: hashedPassword,
            role: 'SELLER',
            fullName: updated.name,
          }
        });
      } else if (sellerAccount.role !== 'ADMIN') {
        sellerAccount = await prisma.user.update({
          where: { id: sellerAccount.id },
          data: { role: 'SELLER', fullName: updated.name },
        });
      }

      await prisma.sale.updateMany({
        where: {
          sellerUserId: null,
          OR: [{ sellerNameOrId: updated.name }, { sellerNameOrId: updated.dni }],
        },
        data: { sellerUserId: sellerAccount.id },
      });
      await prisma.contract.updateMany({
        where: { sellerUserId: null, sale: { sellerUserId: sellerAccount.id } },
        data: { sellerUserId: sellerAccount.id },
      });
    }

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
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.role !== 'ADMIN') return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  } catch {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

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
