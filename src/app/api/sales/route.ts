import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
        referencePhotos: data.referencePhotos || '',
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
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { id: 'desc' },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ message: 'Error al obtener ventas' }, { status: 500 });
  }
}
