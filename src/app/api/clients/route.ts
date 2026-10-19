import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
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

async function getAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: number; username: string; role: string; fullName?: string };
  } catch { return null; }
}

// GET — listar clientes del asesor (o todos para admin)
export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  if (!['ADMIN', 'SELLER'].includes(auth.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const sellerId = searchParams.get('sellerId');
  const dni = searchParams.get('dni')?.replace(/\D/g, '') ?? '';

  const where: Record<string, unknown> = {};
  if (searchParams.has('dni')) {
    if (!/^\d{7,12}$/.test(dni)) {
      return NextResponse.json({ message: 'Ingresa un DNI válido de 7 a 12 dígitos.' }, { status: 400 });
    }
    where.dni = dni;
  }

  if (auth.role === 'SELLER') {
    where.sellerUserId = auth.userId;
  } else if (sellerId) {
    const id = Number(sellerId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: 'Asesor inválido' }, { status: 400 });
    }
    where.sellerUserId = id;
  }

  if (month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json({ message: 'Mes inválido' }, { status: 400 });
    }
    const [year, monthNumber] = month.split('-').map(Number);
    where.createdAt = {
      gte: new Date(year, monthNumber - 1, 1),
      lt: new Date(year, monthNumber, 1),
    };
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      contract: {
        include: {
          receipts: { orderBy: { dueDate: 'asc' } },
          clientUser: { select: { id: true, username: true, fullName: true } },
        },
      },
      sellerUser: { select: { id: true, username: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(sales);
}

// POST — crear nuevo cliente (sale)
export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'SELLER')) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const data = await req.json();
    const names = typeof data.names === 'string' ? data.names.trim() : '';
    const dni = typeof data.dni === 'string' ? data.dni.trim() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const installationDate = typeof data.installationDate === 'string' && data.installationDate
      ? data.installationDate
      : getLimaDateKey();
    const address = typeof data.address === 'string' ? data.address.trim() : '';
    const monthlyAmount = Number(String(data.monthlyAmount ?? '').replace(',', '.'));
    const installationDateMatch = installationDate
      ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(installationDate)
      : null;
    const installationYear = installationDateMatch ? Number(installationDateMatch[1]) : 0;
    const installationMonth = installationDateMatch ? Number(installationDateMatch[2]) - 1 : 0;
    const installationDay = installationDateMatch ? Number(installationDateMatch[3]) : 0;
    const parsedInstallationDate = installationDateMatch
      ? new Date(Date.UTC(installationYear, installationMonth, installationDay))
      : null;

    if (!names || !/^\d{7,12}$/.test(dni) || !address || !parsedInstallationDate ||
      !installationDateMatch ||
      parsedInstallationDate.getUTCFullYear() !== installationYear ||
      parsedInstallationDate.getUTCMonth() !== installationMonth ||
      parsedInstallationDate.getUTCDate() !== installationDay ||
      !Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
      return NextResponse.json({
        message: 'Completa nombre, DNI, teléfono, dirección y un monto mensual válido. La fecha de instalación debe ser válida.',
      }, { status: 400 });
    }
    const startedAt = parsedInstallationDate;

    let sellerId: number | null = auth.role === 'SELLER' ? auth.userId : null;
    if (auth.role === 'ADMIN' && data.sellerId !== undefined && data.sellerId !== null) {
      const requestedSellerId = Number(data.sellerId);
      const seller = await prisma.user.findFirst({
        where: { id: requestedSellerId, role: 'SELLER' },
        select: { id: true },
      });
      if (!seller) return NextResponse.json({ message: 'Asesor no encontrado' }, { status: 400 });
      sellerId = seller.id;
    }
    if (auth.role === 'ADMIN' && sellerId === null) {
      return NextResponse.json({ message: 'Selecciona el asesor responsable del cliente.' }, { status: 400 });
    }
    const sellerUser = sellerId === null
      ? null
      : await prisma.user.findUnique({
          where: { id: sellerId },
          select: { username: true, fullName: true },
        });

    const existingUser = await prisma.user.findUnique({ where: { username: dni } });
    if (existingUser && existingUser.role !== 'CLIENT') {
      return NextResponse.json({ message: 'El DNI ya pertenece a una cuenta que no es de cliente.' }, { status: 409 });
    }
    if (existingUser && sellerId !== null && existingUser.sellerId !== null &&
      existingUser.sellerId !== sellerId) {
      return NextResponse.json({ message: 'El cliente ya está asignado a otro asesor.' }, { status: 409 });
    }
    const effectivePhone = phone || existingUser?.phone || '';
    const existingSale = await prisma.sale.findFirst({ where: { dni }, select: { id: true } });
    if (existingSale && data.additionalService !== true) {
      return NextResponse.json({ message: 'Ya existe un servicio registrado con ese DNI.' }, { status: 409 });
    }

    const password = await bcrypt.hash(dni, 10);
    const paymentDay = startedAt.getUTCDate();
    const endDate = new Date(Date.UTC(startedAt.getUTCFullYear(), startedAt.getUTCMonth() + 3, 1));
    endDate.setUTCDate(Math.min(
      paymentDay,
      new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0)).getUTCDate(),
    ));

    const sale = await prisma.$transaction(async (tx) => {
      const lastSale = await tx.sale.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
      const lastContract = await tx.contract.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
      const clientUser = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              fullName: names,
              ...(phone ? { phone } : {}),
              ...(existingUser.sellerId === null && sellerId !== null ? { sellerId } : {}),
            },
          })
        : await tx.user.create({
            data: {
          username: dni,
          password,
          role: 'CLIENT',
          fullName: names,
          phone: effectivePhone || null,
          sellerId,
            },
          });
      const contractNumber = `FV-${startedAt.getUTCFullYear()}-${String((lastContract?.id ?? 0) + 1).padStart(4, '0')}`;
      const correlativeId = String((lastSale?.id ?? 0) + 1).padStart(4, '0');
      const receipts = [1, 2, 3].map((month) => {
        const dueDate = new Date(Date.UTC(startedAt.getUTCFullYear(), startedAt.getUTCMonth() + month - 1, 1));
        dueDate.setUTCDate(Math.min(
          paymentDay,
          new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth() + 1, 0)).getUTCDate(),
        ));
        return {
          monthNumber: month,
          dueDate,
          amount: monthlyAmount,
          ...(month === 1 ? { status: 'PAID', paidAt: startedAt } : {}),
        };
      });

      return tx.sale.create({
        data: {
          correlativeId,
          clientUserId: clientUser.id,
          sellerUserId: sellerId,
          dni,
          names,
          address,
          phone: effectivePhone,
          locationLink: typeof data.locationLink === 'string' ? data.locationLink.trim() : '',
          referencePhotos: '',
          installationDate,
          installationTimeRange: typeof data.installationTimeRange === 'string' ? data.installationTimeRange.trim() : null,
          internetPlan: typeof data.internetPlan === 'string' ? data.internetPlan.trim() : null,
          details: typeof data.details === 'string' ? data.details.trim() : null,
          sellerNameOrId: sellerUser?.fullName || sellerUser?.username || auth.fullName || auth.username,
          status: 'INSTALLED',
          installedAt: startedAt,
          contract: {
            create: {
              contractNumber,
              clientUserId: clientUser.id,
              sellerUserId: sellerId,
              startDate: startedAt,
              endDate,
              monthlyAmount,
              paymentDay,
              receipts: { create: receipts },
            },
          },
        },
        include: {
          contract: {
            include: {
              receipts: true,
              clientUser: { select: { id: true, username: true, fullName: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ message: 'Error al crear cliente' }, { status: 500 });
  }
}
