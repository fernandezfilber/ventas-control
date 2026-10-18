"use client";

import { useEffect, useState } from "react";
import { FiTrendingUp, FiUsers, FiMessageCircle } from "react-icons/fi";
import { readJsonResponse } from "@/lib/http";

type ContractSummary = {
  status: string;
  createdAt: string;
  receipts: { status: string; dueDate: string }[];
};

export default function SellerDashboard() {
  const [stats, setStats] = useState({ totalClients: 0, activeContracts: 0, pendingReminders: 0 });
  const [timeframe, setTimeframe] = useState("mes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/contracts")
      .then(async (res) => {
        const data = await readJsonResponse<ContractSummary[]>(res);
        if (!res.ok) {
          const message = data && typeof data === "object" && "message" in data && typeof (data as { message?: string }).message === "string"
            ? (data as { message?: string }).message
            : "No se pudieron cargar las ventas.";
          throw new Error(message);
        }
        return data ?? [];
      })
      .then((contracts) => {
        const now = new Date();
        const start = new Date(now);
        if (timeframe === "dia") {
          start.setHours(0, 0, 0, 0);
        } else if (timeframe === "semana") {
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0);
        } else {
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
        }
        const periodContracts = contracts.filter((contract) => new Date(contract.createdAt) >= start);
        const pendingReminders = periodContracts.reduce((count, contract) => {
          const reminderLimit = new Date();
          reminderLimit.setDate(reminderLimit.getDate() + 5);
          return count + contract.receipts.filter((receipt) =>
            receipt.status !== "PAID" && new Date(receipt.dueDate) <= reminderLimit
          ).length;
        }, 0);
        const activeContracts = periodContracts.filter((contract) => contract.status === "ACTIVE").length;

        if (!active) return;
        setStats({
          totalClients: periodContracts.length,
          activeContracts,
          pendingReminders,
        });
        setError("");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las ventas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [timeframe]);

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px", color: "var(--fv-navy)" }}>Rendimiento</h2>

      <div className="tab-bar">
        {["dia", "semana", "mes"].map((t) => (
          <button
            key={t}
            onClick={() => { setLoading(true); setTimeframe(t); }}
            className={`tab-btn ${timeframe === t ? "active" : ""}`}
            style={{ textTransform: "capitalize" }}
          >
            {t === "dia" ? "Hoy" : t === "semana" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" style={{ borderTopColor: "var(--fv-blue)" }} /></div>
      ) : (
        <>
        {error && <div role="alert" className="card" style={{ color: "var(--fv-red)" }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="stat-card blue">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ background: "rgba(30,64,175,.1)", padding: "8px", borderRadius: "10px", color: "var(--fv-blue)" }}>
                <FiUsers size={20} />
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-light)", fontWeight: 600 }}>Total Clientes</div>
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--fv-navy)" }}>{stats.totalClients}</div>
          </div>
          
          <div className="stat-card green">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ background: "rgba(16,185,129,.1)", padding: "8px", borderRadius: "10px", color: "var(--fv-green)" }}>
                <FiTrendingUp size={20} />
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-light)", fontWeight: 600 }}>Contratos Activos</div>
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--fv-navy)" }}>{stats.activeContracts}</div>
          </div>
          
          <div className="stat-card gold" style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ background: "rgba(245,158,11,.1)", padding: "8px", borderRadius: "10px", color: "var(--fv-gold)" }}>
                <FiMessageCircle size={20} />
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-light)", fontWeight: 600 }}>Pagos vencidos o por vencer en 5 días</div>
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--fv-navy)" }}>{stats.pendingReminders}</div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
