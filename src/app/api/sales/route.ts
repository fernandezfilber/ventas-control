import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Generar correlativo
    const lastSale = await prisma.sale.findFirst({
      orderBy: { id: "desc" },
    });
    
    let nextNumber = 1;
    if (lastSale && lastSale.correlativeId) {
      nextNumber = parseInt(lastSale.correlativeId, 10) + 1;
    }
    const correlativeId = nextNumber.toString().padStart(3, "0");

    const newSale = await prisma.sale.create({
      data: {
        correlativeId,
        dni: data.dni,
        names: data.names,
        address: data.address,
        phone: data.phone,
        locationLink: data.locationLink,
        referencePhotos: data.referencePhotos,
        sellerNameOrId: data.sellerId,
        status: "PENDING",
      },
    });

    return NextResponse.json(newSale, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ message: "Error al crear la venta" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dni = searchParams.get("dni");
    const date = searchParams.get("date");

    const where: any = {};
    
    if (dni) {
      where.dni = { contains: dni };
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
      orderBy: { id: "desc" },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ message: "Error al obtener ventas" }, { status: 500 });
  }
}
