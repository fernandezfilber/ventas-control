"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiFileText, FiClock, FiAlertCircle } from "react-icons/fi";

interface Contract {
  id: number;
  contractNumber: string;
  status: string;
  paymentDay: number;
  monthlyAmount: number;
  sale: { internetPlan: string; address: string };
  receipts: any[];
}

export default function ClientDashboard() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contracts")
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) setContract(data[0]); // Client usually has 1 active contract
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" /></div>;
  }

  if (!contract) {
    return (
      <div className="client-card" style={{ textAlign: "center" }}>
        <FiAlertCircle size={40} color="var(--fv-orange)" style={{ marginBottom: "16px" }} />
        <h3>No tienes contratos activos</h3>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "8px" }}>
          Comunícate con tu asesor de ventas para más información.
        </p>
      </div>
    );
  }

  const nextReceipt = contract.receipts.find((r) => r.status === "PENDING");
  const dueDate = nextReceipt ? new Date(nextReceipt.dueDate) : null;
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;

  return (
    <div>
      <h2 style={{ marginBottom: "20px", fontSize: "1.5rem", fontWeight: 700 }}>Resumen de tu Servicio</h2>

      <div className="client-card premium">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              Plan Actual
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{contract.sale?.internetPlan || "Servicio ForwardVision"}</div>
          </div>
          <div style={{
            background: contract.status === "ACTIVE" ? "rgba(16,185,129,.2)" : "rgba(245,158,11,.2)",
            color: contract.status === "ACTIVE" ? "#10b981" : "#f59e0b",
            padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700
          }}>
            {contract.status === "ACTIVE" ? "ACTIVO" : "PENDIENTE DE FIRMA"}
          </div>
        </div>
        
        <div style={{ fontSize: "0.9rem", color: "#cbd5e1", marginBottom: "20px" }}>
          📍 {contract.sale?.address}
        </div>

        {contract.status === "PENDING_SIGNATURE" && (
          <Link href="/client/contrato" style={{ textDecoration: "none" }}>
            <button className="btn-primary" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
              ✍️ Firmar Contrato Digital
            </button>
          </Link>
        )}
      </div>

      <h3 style={{ margin: "24px 0 16px", fontSize: "1.2rem", fontWeight: 600 }}>Próximo Pago</h3>
      
      {nextReceipt ? (
        <div className="client-card">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              background: "rgba(255,255,255,.1)", width: "50px", height: "50px", borderRadius: "12px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Mes</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>{nextReceipt.monthNumber}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>S/ {nextReceipt.amount.toFixed(2)}</div>
              <div style={{ fontSize: "0.85rem", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                <FiClock /> Vence el {dueDate?.toLocaleDateString()}
              </div>
            </div>
          </div>
          
          {daysUntilDue !== null && (
            <div style={{ 
              marginTop: "16px", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, textAlign: "center",
              background: daysUntilDue <= 3 ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.05)",
              color: daysUntilDue <= 3 ? "#fca5a5" : "#cbd5e1"
            }}>
              {daysUntilDue < 0 ? `Vencido hace ${Math.abs(daysUntilDue)} días` :
               daysUntilDue === 0 ? "Vence HOY" :
               `Faltan ${daysUntilDue} días para el pago`}
            </div>
          )}
        </div>
      ) : (
        <div className="client-card" style={{ textAlign: "center" }}>
          <p style={{ color: "#10b981", fontWeight: 600 }}>✅ ¡Estás al día con todos tus pagos!</p>
        </div>
      )}
    </div>
  );
}
