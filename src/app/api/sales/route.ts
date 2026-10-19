import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'ventas-control-jwt-secret-prod-2024');

function getLimaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function parseLimaDateKey(key: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

function getLimaDateBoundary(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 5));
}

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

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth || !['ADMIN', 'SELLER'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: auth ? 403 : 401 });
  }

  try {
    const data = await req.json();
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 401 });

    const seller = auth.role === 'SELLER'
      ? user
      : data.sellerId
        ? await prisma.user.findFirst({
            where: { role: 'SELLER', OR: [{ username: data.sellerId }, { fullName: data.sellerId }] },
          })
        : user;
      if (auth.role === 'ADMIN' && data.sellerId && !seller) {
        return NextResponse.json({ message: 'No se encontró un asesor con ese usuario o nombre' }, { status: 400 });
      }
      if (!seller) return NextResponse.json({ message: 'Selecciona un asesor para esta venta' }, { status: 400 });

    const lastSale = await prisma.sale.findFirst({
      orderBy: { id: 'desc' },
    });

    let nextNumber = 1;
    if (lastSale && lastSale.correlativeId) {
      nextNumber = parseInt(lastSale.correlativeId, 10) + 1;
    }
    const correlativeId = nextNumber.toString().padStart(3, '0');

    const newSale = await prisma.sale.create({
      data: {
        correlativeId,
        clientId: data.clientId || null,
        sellerUserId: seller.id,
        dni: data.dni,
        names: data.names,
        address: data.address,
        phone: data.phone,
        locationLink: data.locationLink,
        installationDate: data.installationDate || null,
        installationTimeRange: data.installationTimeRange || null,
        internetPlan: data.internetPlan || null,
        details: data.details || null,
        sellerNameOrId: seller.fullName || seller.username,
        status: 'PENDING',
      },
    });

    return NextResponse.json(newSale, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ message: 'Error al crear la venta' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const auth = await getAuthUser();
  if (!auth || !['ADMIN', 'SELLER'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: auth ? 403 : 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dni = searchParams.get('dni');
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const period = searchParams.get('period');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (auth.role === 'SELLER') {
      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      where.OR = [
        { sellerUserId: auth.userId },
        { sellerNameOrId: auth.username },
        ...(user?.fullName ? [{ sellerNameOrId: user.fullName }] : []),
      ];
    }

    if (dni) {
      where.dni = { contains: dni };
    }

    if (status) {
      where.status = status;
    }

    if (date) {
      const startDay = parseLimaDateKey(date);
      if (!startDay) return NextResponse.json({ message: 'Fecha inválida' }, { status: 400 });
      const endDay = new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth(), startDay.getUTCDate() + 1));

      where.createdAt = {
        gte: getLimaDateBoundary(startDay),
        lt: getLimaDateBoundary(endDay),
      };
    }

    if (!date && month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return NextResponse.json({ message: 'Mes inválido' }, { status: 400 });
      }
      const [year, monthNumber] = month.split('-').map(Number);
      where.createdAt = {
        gte: getLimaDateBoundary(new Date(Date.UTC(year, monthNumber - 1, 1))),
        lt: getLimaDateBoundary(new Date(Date.UTC(year, monthNumber, 1))),
      };
    } else if (!date && !month && period) {
      if (!['day', 'week', 'month'].includes(period)) {
        return NextResponse.json({ message: 'Periodo inválido' }, { status: 400 });
      }
      const today = parseLimaDateKey(getLimaDateKey());
      if (!today) throw new Error('No se pudo calcular la fecha de Lima.');
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      if (period === 'week') start.setUTCDate(start.getUTCDate() - 6);
      if (period === 'month') start.setUTCDate(1);
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
      where.createdAt = {
        gte: getLimaDateBoundary(start),
        lt: getLimaDateBoundary(end),
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: { contract: { select: { monthlyAmount: true } } },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ message: 'Error al obtener ventas' }, { status: 500 });
  }
}
