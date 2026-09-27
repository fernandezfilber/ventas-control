import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'ventas-control-jwt-secret-prod-2024');

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: number; username: string; role: string };
  } catch {
    return null;
  }
}

// GET — list users (ADMIN only, or SELLER sees only their clients)
export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  if (auth.role !== 'ADMIN' && auth.role !== 'SELLER') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  // Sellers can only see their assigned clients
  if (auth.role === 'SELLER') {
    where.sellerId = auth.userId;
    where.role = 'CLIENT';
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, username: true, role: true, fullName: true, phone: true, sellerId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

// POST — create user (ADMIN or SELLER)
export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SELLER')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { username, password, role, fullName, phone, sellerId } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (auth.role === 'SELLER' && role !== 'CLIENT') {
      return NextResponse.json({ message: 'Los asesores solo pueden crear cuentas de clientes' }, { status: 403 });
    }
    if (auth.role === 'ADMIN' && !['ADMIN', 'SELLER', 'CLIENT', 'TECHNICIAN'].includes(role)) {
      return NextResponse.json({ message: 'Rol inválido' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ message: 'El usuario ya existe' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        fullName: fullName || null,
        phone: phone || null,
        sellerId: auth.role === 'SELLER' ? auth.userId : (sellerId || null),
      },
      select: { id: true, username: true, role: true, fullName: true, phone: true, createdAt: true },
    });

    if (role === 'CLIENT') {
      const ownerId = auth.role === 'SELLER' ? auth.userId : (sellerId || undefined);
      const saleWhere = { dni: username, ...(ownerId ? { sellerUserId: ownerId } : {}) };
      await prisma.sale.updateMany({ where: saleWhere, data: { clientUserId: user.id } });
      await prisma.contract.updateMany({
        where: { sale: saleWhere },
        data: { clientUserId: user.id },
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Error al crear usuario' }, { status: 500 });
  }
}
