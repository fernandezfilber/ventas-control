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

const providerRuc = "206081592";
const pageWidth = 210;
const margin = 19;
const contentWidth = pageWidth - margin * 2;

async function loadLogo() {
  const response = await fetch("/forward-vision-logo.png");
  if (!response.ok) {
    throw new Error("No se pudo cargar el logo de Forward Vision.");
  }

  const reader = new FileReader();
  const logo = new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo procesar el logo de Forward Vision."));
    };
    reader.onerror = () => reject(new Error("No se pudo procesar el logo de Forward Vision."));
  });
  reader.readAsDataURL(await response.blob());
  return logo;
}

function createWaveImage(position: "top" | "bottom") {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 190;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar el diseño del contrato.");

  const isTop = position === "top";
  context.fillStyle = "#07518a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#16b9d3";
  context.beginPath();
  if (isTop) {
    context.moveTo(0, 105);
    context.bezierCurveTo(220, 170, 330, 50, 570, 98);
    context.bezierCurveTo(810, 148, 980, 25, 1200, 76);
    context.lineTo(1200, 190);
    context.lineTo(0, 190);
  } else {
    context.moveTo(0, 86);
    context.bezierCurveTo(200, 22, 390, 160, 600, 94);
    context.bezierCurveTo(850, 18, 1010, 150, 1200, 67);
    context.lineTo(1200, 190);
    context.lineTo(0, 190);
  }
  context.closePath();
  context.fill();
  return canvas.toDataURL("image/png");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatSignedAt(value: string | null) {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

export async function downloadServiceContractPdf(contract: ContractPdfData) {
  const logo = await loadLogo();
  const topWave = createWaveImage("top");
  const bottomWave = createWaveImage("bottom");
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pages: number[] = [];
  let y = 0;

  const drawHeader = () => {
    doc.addImage(topWave, "PNG", 0, 0, pageWidth, 31);
    doc.addImage(logo, "PNG", 88, 0, 34, 38);
    doc.setTextColor(18, 45, 75);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("FORWARD VISION S.A.C.", pageWidth / 2, 45, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`RUC: ${providerRuc}  |  +51 955 318 590`, pageWidth / 2, 50, { align: "center" });
  };

  const addPage = () => {
    if (pages.length > 0) doc.addPage();
    pages.push(doc.getNumberOfPages());
    drawHeader();
    y = 61;
  };

  const ensureSpace = (height: number) => {
    if (y + height > 263) addPage();
  };

  const addText = (text: string, size = 9, bold = false, color = [42, 54, 68]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const lineHeight = size * 0.48;
    ensureSpace(lines.length * lineHeight + 2);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 2;
  };

  const addSection = (title: string) => {
    ensureSpace(9);
    y += 2;
    doc.setFillColor(225, 245, 250);
    doc.roundedRect(margin, y - 4.5, contentWidth, 7, 1.5, 1.5, "F");
    addText(title, 9, true, [7, 81, 138]);
  };

  addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(18, 45, 75);
  doc.text("CONTRATO DE PRESTACIÓN DEL SERVICIO DE INTERNET", pageWidth / 2, y, { align: "center" });
  y += 7;
  addText(`Contrato N.° ${contract.contractNumber}`, 9, true, [7, 81, 138]);
  addText(
    `Conste por el presente documento el acuerdo de prestación del servicio de internet entre FORWARD VISION S.A.C., identificada con RUC ${providerRuc}, y la persona cliente cuyos datos se indican a continuación.`
  );

  addSection("1. DATOS DEL CLIENTE");
  addText(`Nombre completo: ${contract.sale.names}`);
  addText(`DNI: ${contract.sale.dni}     Teléfono: ${contract.sale.phone}`);
  addText(`Dirección de instalación: ${contract.sale.address}`);

  addSection("2. SERVICIO CONTRATADO");
  addText(`Plan de internet: ${contract.sale.internetPlan || "No especificado"}`);
  addText(`Inicio del servicio: ${formatDate(contract.startDate)}     Fin del periodo: ${formatDate(contract.endDate)}`);

  addSection("3. PRECIO Y FORMA DE PAGO");
  addText(`La tarifa mensual es de S/ ${contract.monthlyAmount.toFixed(2)}. El pago vence el día ${contract.paymentDay} de cada mes.`);
  contract.receipts.forEach((receipt) => {
    addText(`Cuota ${receipt.monthNumber}: S/ ${receipt.amount.toFixed(2)} — vence el ${formatDate(receipt.dueDate)}`, 8);
  });

  addSection("4. PERMANENCIA");
  addText(
    "La persona cliente acepta un periodo mínimo de permanencia de tres (3) meses, contado desde la fecha de inicio del servicio indicada en este contrato."
  );
  addText(
    "Si solicita la cancelación antes de completar dicho periodo, se aplicará el cargo por cancelación anticipada informado por Forward Vision, de S/ 100.00."
  );

  addSection("5. MATERIALES DE INSTALACIÓN");
  addText(
    "La persona cliente asumirá el costo comprobable de reparación o reposición de los materiales de instalación cuando el daño sea atribuible a uso indebido o negligencia. Forward Vision comunicará previamente el detalle y el importe correspondiente."
  );

  addSection("6. ACEPTACIÓN Y FIRMAS");
  addText(
    "Las partes declaran haber leído y comprendido las condiciones de este contrato. La firma digital queda registrada en el sistema junto con su fecha y hora."
  );
  ensureSpace(42);
  const signatureY = y + 16;
  const signatureWidth = 71;
  const rightSignatureX = pageWidth - margin - signatureWidth;
  doc.setDrawColor(110, 130, 145);
  doc.line(margin, signatureY, margin + signatureWidth, signatureY);
  doc.line(rightSignatureX, signatureY, rightSignatureX + signatureWidth, signatureY);
  if (contract.sellerSignature) {
    doc.addImage(contract.sellerSignature, "PNG", margin + 7, signatureY - 22, 56, 20);
  }
  if (contract.clientSignature) {
    doc.addImage(contract.clientSignature, "PNG", rightSignatureX + 7, signatureY - 22, 56, 20);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(42, 54, 68);
  doc.text("FORWARD VISION / ASESOR", margin + signatureWidth / 2, signatureY + 5, { align: "center" });
  doc.text("CLIENTE", rightSignatureX + signatureWidth / 2, signatureY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Fecha: ${formatSignedAt(contract.sellerSignedAt)}`, margin + signatureWidth / 2, signatureY + 10, { align: "center" });
  doc.text(`Fecha: ${formatSignedAt(contract.clientSignedAt)}`, rightSignatureX + signatureWidth / 2, signatureY + 10, { align: "center" });

  pages.forEach((page, index) => {
    doc.setPage(page);
    doc.addImage(bottomWave, "PNG", 0, 283, pageWidth, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(18, 45, 75);
    doc.text(`FORWARD VISION S.A.C.  ·  RUC ${providerRuc}`, pageWidth / 2, 279, { align: "center" });
    if (pages.length > 1) {
      doc.text(`${index + 1} / ${pages.length}`, pageWidth - margin, 279, { align: "right" });
    }
  });

  doc.save(`Contrato_${contract.contractNumber}.pdf`);
}
