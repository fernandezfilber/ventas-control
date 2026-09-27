"use client";

import { useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiAlertTriangle } from "react-icons/fi";

interface Receipt {
  id: number;
  monthNumber: number;
  dueDate: string;
  paidAt: string | null;
  amount: number;
  status: string;
}

export default function ClientPayments() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/receipts")
      .then((res) => res.json())
      .then((data) => {
        setReceipts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" /></div>;

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px" }}>Tus Pagos</h2>
      
      {receipts.length === 0 ? (
        <div className="client-card" style={{ textAlign: "center", color: "#94a3b8" }}>
          No tienes recibos generados aún.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {receipts.map((r) => {
            const isPaid = r.status === "PAID";
            const isOverdue = r.status === "OVERDUE" || (!isPaid && new Date(r.dueDate) < new Date());
            
            let statusColor = "#3b82f6"; // Default blue
            let statusIcon = <FiClock size={20} color="#3b82f6" />;
            let statusText = "Pendiente";
            
            if (isPaid) {
              statusColor = "#10b981";
              statusIcon = <FiCheckCircle size={20} color="#10b981" />;
              statusText = "Pagado";
            } else if (isOverdue) {
              statusColor = "#ef4444";
              statusIcon = <FiAlertTriangle size={20} color="#ef4444" />;
              statusText = "Vencido";
            }

            return (
              <div key={r.id} className="client-card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: `rgba(${statusColor === "#10b981" ? "16,185,129" : statusColor === "#ef4444" ? "239,68,68" : "59,130,246"}, 0.15)`,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {statusIcon}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>Mes {r.monthNumber}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>S/ {r.amount.toFixed(2)}</div>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8rem", color: statusColor, fontWeight: 700, marginBottom: "4px" }}>
                    {statusText}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {isPaid && r.paidAt ? `Pagado: ${new Date(r.paidAt).toLocaleDateString()}` : `Vence: ${new Date(r.dueDate).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
