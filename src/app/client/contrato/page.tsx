"use client";

import { useEffect, useState, useRef } from "react";
import { FiDownload, FiCheck, FiX } from "react-icons/fi";
import { downloadServiceContractPdf } from "@/lib/contract-pdf";

interface Contract {
  id: number;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  paymentDay: number;
  status: string;
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
    downloadServiceContractPdf(contract);
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
          
          <div style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.6, padding: "12px", background: "rgba(255,255,255,.03)", borderRadius: "8px", marginTop: "20px" }}>
            <strong>Cancelación anticipada:</strong> cargo informado de S/ 100.00 antes de completar los 3 meses.
            <br />
            <strong>Materiales:</strong> el cliente asume reparaciones comprobables por daños causados por uso indebido o negligencia.
            <br />
            <span style={{ display: "block", marginTop: 8 }}>ForwardVision · +51 955 318 590</span>
            <span style={{ display: "block", marginTop: 8, color: "#fbbf24" }}>
              Borrador: falta incorporar RUC, domicilio legal y logo antes de usar como contrato definitivo.
            </span>
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
