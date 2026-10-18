"use client";

import { useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiAlertTriangle } from "react-icons/fi";
import { readJsonResponse } from "@/lib/http";

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
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState("");

  useEffect(() => {
    fetch("/api/receipts")
      .then(async (res) => {
        const data = await readJsonResponse<Receipt[]>(res);
        if (!res.ok) throw new Error("No se pudieron cargar los recibos.");
        setReceipts(data ?? []);
      })
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false));

    fetch("/api/users/me")
      .then(async (res) => {
        const data = await readJsonResponse<{ whatsappRemindersEnabled: boolean; message?: string }>(res);
        if (!res.ok || !data) throw new Error(data?.message || "No se pudo cargar tu consentimiento.");
        setRemindersEnabled(data.whatsappRemindersEnabled);
      })
      .catch((error: unknown) => {
        setConsentError(error instanceof Error ? error.message : "No se pudo cargar tu consentimiento.");
      })
      .finally(() => setConsentLoading(false));
  }, []);

  const updateReminderConsent = async (enabled: boolean) => {
    const previousValue = remindersEnabled;
    setRemindersEnabled(enabled);
    setConsentSaving(true);
    setConsentError("");
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappRemindersEnabled: enabled }),
      });
      const result = await readJsonResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(result?.message || "No se pudo guardar tu preferencia.");
    } catch (error) {
      setRemindersEnabled(previousValue);
      setConsentError(error instanceof Error ? error.message : "No se pudo guardar tu preferencia.");
    } finally {
      setConsentSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" /></div>;

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px" }}>Tus Pagos</h2>

      <section className="client-card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>Recordatorios por WhatsApp</h3>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: 12 }}>
          Si aceptas, recibirás un aviso cinco días antes del vencimiento y otro el día de pago. Puedes retirar tu consentimiento cuando quieras.
        </p>
        {consentError && <p role="alert" style={{ color: "#fca5a5", fontSize: "0.85rem", marginBottom: 10 }}>{consentError}</p>}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.9rem" }}>
          <input
            type="checkbox"
            checked={remindersEnabled}
            disabled={consentLoading || consentSaving}
            onChange={(event) => void updateReminderConsent(event.target.checked)}
          />
          <span>{consentSaving ? "Guardando..." : "Acepto recibir recordatorios automáticos de pago por WhatsApp."}</span>
        </label>
      </section>
      
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
