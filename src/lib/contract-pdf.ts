import jsPDF from "jspdf";

interface ContractPdfData {
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  paymentDay: number;
  clientSignedAt: string | null;
  sellerSignedAt: string | null;
  clientSignature: string | null;
  sellerSignature: string | null;
  sale: {
    names: string;
    dni: string;
    address: string;
    phone: string;
    internetPlan: string | null;
  };
  receipts: { monthNumber: number; dueDate: string; amount: number }[];
}

export function downloadServiceContractPdf(contract: ContractPdfData) {
  const doc = new jsPDF();
  const left = 18;
  const width = 174;
  let y = 20;

  const addText = (text: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width) as string[];
    if (y + lines.length * (size * 0.48) > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, left, y);
    y += lines.length * (size * 0.48) + 4;
  };

  doc.setFillColor(15, 27, 61);
  doc.roundedRect(left, y - 7, 12, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FV", left + 6, y + 1, { align: "center" });
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(18);
  doc.text("ForwardVision", left + 16, y + 1);
  y += 14;

  doc.setTextColor(25, 25, 25);
  addText("CONTRATO DE PRESTACIÓN DE SERVICIO DE INTERNET", 13, true);
  addText(`Contrato N.° ${contract.contractNumber}`, 10, true);
  addText("Prestador: ForwardVision (nombre comercial). RUC y domicilio legal: no proporcionados.", 9);
  addText("Contacto: +51 955 318 590", 9);

  addText("1. IDENTIFICACIÓN DEL CLIENTE", 11, true);
  addText(`Nombre: ${contract.sale.names}`);
  addText(`DNI: ${contract.sale.dni}    Teléfono: ${contract.sale.phone}`);
  addText(`Dirección del servicio: ${contract.sale.address}`);

  addText("2. SERVICIO Y VIGENCIA", 11, true);
  addText(`Plan: ${contract.sale.internetPlan || "No especificado"}`);
  addText(`Inicio: ${new Date(contract.startDate).toLocaleDateString("es-PE")}    Fin: ${new Date(contract.endDate).toLocaleDateString("es-PE")}`);
  addText("El periodo mínimo informado es de tres meses, contado desde la fecha de inicio indicada.");

  addText("3. PRECIO Y CRONOGRAMA DE PAGOS", 11, true);
  addText(`Mensualidad: S/ ${contract.monthlyAmount.toFixed(2)}. Día de pago: ${contract.paymentDay} de cada mes.`);
  contract.receipts.forEach((receipt) => {
    addText(`Mes ${receipt.monthNumber}: S/ ${receipt.amount.toFixed(2)} — vence ${new Date(receipt.dueDate).toLocaleDateString("es-PE")}`);
  });

  addText("4. CANCELACIÓN ANTICIPADA", 11, true);
  addText("La cancelación del servicio antes de completar el periodo mínimo informado tiene un cargo de S/ 100.00, según las condiciones indicadas por ForwardVision.");

  addText("5. MATERIALES DE INSTALACIÓN", 11, true);
  addText("El cliente asumirá el costo comprobable de reparación o reposición de los materiales utilizados en la instalación cuando resulten dañados por uso indebido o negligencia. El detalle y el importe deberán comunicarse al cliente.");

  addText("6. CONSTANCIA Y FIRMAS", 11, true);
  addText("Las partes declaran haber leído las condiciones anteriores. La firma digital se registra en el portal junto con su fecha y hora.");
  if (y + 55 > 275) {
    doc.addPage();
    y = 20;
  }
  const signatureY = y + 6;
  doc.setDrawColor(130, 130, 130);
  doc.line(left, signatureY + 24, left + 68, signatureY + 24);
  doc.line(left + 106, signatureY + 24, left + width, signatureY + 24);
  if (contract.sellerSignature) doc.addImage(contract.sellerSignature, "PNG", left + 8, signatureY, 50, 21);
  if (contract.clientSignature) doc.addImage(contract.clientSignature, "PNG", left + 114, signatureY, 50, 21);
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.text("FORWARDVISION / ASESOR", left + 34, signatureY + 30, { align: "center" });
  doc.text("CLIENTE", left + 140, signatureY + 30, { align: "center" });
  doc.setFontSize(7);
  doc.text(
    `Fecha: ${contract.sellerSignedAt ? new Date(contract.sellerSignedAt).toLocaleString("es-PE") : "Pendiente"}`,
    left + 34,
    signatureY + 35,
    { align: "center" }
  );
  doc.text(
    `Fecha: ${contract.clientSignedAt ? new Date(contract.clientSignedAt).toLocaleString("es-PE") : "Pendiente"}`,
    left + 140,
    signatureY + 35,
    { align: "center" }
  );

  doc.setTextColor(150, 50, 40);
  doc.setFontSize(8);
  doc.text(
    "Borrador: completar RUC y domicilio legal, incorporar el logo y validar las condiciones antes de usar como contrato definitivo.",
    left,
    282,
    { maxWidth: width }
  );
  doc.save(`Contrato_${contract.contractNumber}.pdf`);
}
