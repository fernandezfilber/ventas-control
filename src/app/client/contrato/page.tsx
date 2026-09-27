"use client";

import { useEffect, useState, useRef } from "react";
import jsPDF from "jspdf";
import { FiDownload, FiCheck, FiX } from "react-icons/fi";

interface Contract {
  id: number;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  status: string;
  clientSignature: string | null;
  sellerSignature: string | null;
  sale: {
    names: string;
    dni: string;
    address: string;
    phone: string;
    internetPlan: string;
  };
}

export default function ClientContract() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetch("/api/contracts")
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) setContract(data[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Signature pad logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signature = canvas.toDataURL("image/png");
    
    // Check if empty (simple check: if dataURL is very short, it's likely blank, but typically it's longer)
    // A blank 300x150 canvas is ~1200 chars. 
    if (signature.length < 2000) {
      alert("Por favor, dibuje su firma antes de guardar.");
      return;
    }

    setSigning(true);
    try {
      const res = await fetch(`/api/contracts/${contract?.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, signerRole: "CLIENT" }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setContract(updated);
        alert("Firma guardada correctamente.");
      } else {
        alert("Error al guardar la firma.");
      }
    } catch {
      alert("Error de red.");
    } finally {
      setSigning(false);
    }
  };

  const downloadPDF = () => {
    if (!contract) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); // FV Blue
    doc.text("ForwardVision", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("CONTRATO DE PRESTACIÓN DE SERVICIOS", 105, 30, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Contrato N°: ${contract.contractNumber}`, 20, 45);
    doc.text(`Fecha de Inicio: ${new Date(contract.startDate).toLocaleDateString()}`, 20, 52);
    doc.text(`Fecha de Vencimiento: ${new Date(contract.endDate).toLocaleDateString()}`, 20, 59);
    
    // Client Info
    doc.setFontSize(12);
    doc.text("1. DATOS DEL CLIENTE", 20, 75);
    doc.setFontSize(10);
    doc.text(`Nombre/Razón Social: ${contract.sale.names}`, 20, 85);
    doc.text(`DNI/RUC: ${contract.sale.dni}`, 20, 92);
    doc.text(`Dirección: ${contract.sale.address}`, 20, 99);
    doc.text(`Teléfono: ${contract.sale.phone}`, 20, 106);
    
    // Service Info
    doc.setFontSize(12);
    doc.text("2. DETALLES DEL SERVICIO", 20, 120);
    doc.setFontSize(10);
    doc.text(`Plan Contratado: ${contract.sale.internetPlan}`, 20, 130);
    doc.text(`Monto Mensual: S/ ${contract.monthlyAmount.toFixed(2)}`, 20, 137);
    doc.text(`Periodo Forzoso: 3 Meses`, 20, 144);
    
    // Terms
    doc.setFontSize(12);
    doc.text("3. TÉRMINOS Y CONDICIONES", 20, 160);
    doc.setFontSize(9);
    const terms = "El cliente se compromete a mantener el servicio por un periodo mínimo de 3 meses. El pago deberá realizarse los días indicados en su cronograma de pagos. En caso de incumplimiento, ForwardVision se reserva el derecho de suspender el servicio.";
    const splitTerms = doc.splitTextToSize(terms, 170);
    doc.text(splitTerms, 20, 170);
    
    // Signatures
    doc.setFontSize(10);
    doc.text("LA EMPRESA", 50, 230, { align: "center" });
    doc.text("EL CLIENTE", 160, 230, { align: "center" });
    
    if (contract.sellerSignature) {
      doc.addImage(contract.sellerSignature, "PNG", 30, 200, 40, 20);
    }
    if (contract.clientSignature) {
      doc.addImage(contract.clientSignature, "PNG", 140, 200, 40, 20);
    }
    
    doc.save(`Contrato_${contract.contractNumber}.pdf`);
  };

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" /></div>;
  if (!contract) return <div className="client-card" style={{ textAlign: "center" }}>No hay contrato disponible.</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Tu Contrato</h2>
        <button onClick={downloadPDF} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px", width: "auto", padding: "8px 12px", background: "rgba(255,255,255,.05)", color: "#f8fafc", borderColor: "rgba(255,255,255,.2)" }}>
          <FiDownload /> PDF
        </button>
      </div>

      <div className="client-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "20px", background: "rgba(0,0,0,.2)", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase" }}>Contrato N°</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "1px" }}>{contract.contractNumber}</div>
        </div>
        
        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: "16px" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Servicio</span>
            <span style={{ fontWeight: 600 }}>{contract.sale.internetPlan}</span>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Monto Mensual</span>
              <span style={{ fontWeight: 600 }}>S/ {contract.monthlyAmount.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "4px" }}>Vigencia</span>
              <span style={{ fontWeight: 600 }}>3 Meses</span>
            </div>
          </div>
          
          <div style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, padding: "12px", background: "rgba(255,255,255,.03)", borderRadius: "8px", marginTop: "20px" }}>
            El presente contrato tiene una duración forzosa de 3 meses a partir de su instalación. Usted acepta las condiciones del servicio de ForwardVision.
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <h3 style={{ margin: "24px 0 16px", fontSize: "1.2rem", fontWeight: 600 }}>Firmas</h3>
      
      {!contract.clientSignature ? (
        <div className="client-card" style={{ border: "1px solid rgba(6,182,212,.3)" }}>
          <p style={{ fontSize: "0.9rem", marginBottom: "16px", color: "#cbd5e1" }}>
            Por favor, firme en el recuadro inferior para aceptar el contrato.
          </p>
          <div style={{ background: "#f8fafc", borderRadius: "12px", overflow: "hidden", marginBottom: "12px" }}>
            <canvas
              ref={canvasRef}
              width={300}
              height={150}
              style={{ width: "100%", height: "150px", touchAction: "none", cursor: "crosshair" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={clearCanvas} className="btn-outline" style={{ flex: 1, borderColor: "rgba(255,255,255,.2)", color: "#f8fafc" }}>
              <FiX style={{ marginRight: "4px" }} /> Borrar
            </button>
            <button onClick={handleSign} className="btn-primary" disabled={signing} style={{ flex: 2 }}>
              {signing ? "Guardando..." : <><FiCheck style={{ marginRight: "4px" }} /> Firmar Contrato</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="client-card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(16,185,129,.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
            <FiCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Firmado digitalmente</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Has aceptado este contrato</div>
          </div>
        </div>
      )}
    </div>
  );
}
