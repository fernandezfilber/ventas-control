"use client";

import { useEffect, useState } from "react";
import { FiTrendingUp, FiUsers, FiMessageCircle } from "react-icons/fi";

type ContractSummary = { status: string; receipts: { status: string }[] };

export default function SellerDashboard() {
  const [stats, setStats] = useState({ totalClients: 0, activeContracts: 0, pendingReminders: 0 });
  const [timeframe, setTimeframe] = useState("mes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd pass timeframe to API. Doing a simple fetch here.
    fetch("/api/contracts")
      .then((res) => res.json())
      .then((contracts) => {
        let pendingReminders = 0;
        let active = 0;
        
        contracts.forEach((c: ContractSummary) => {
          if (c.status === "ACTIVE") active++;
          c.receipts.forEach((r) => {
            if (r.status !== "PAID") pendingReminders++;
          });
        });

        setStats({
          totalClients: contracts.length,
          activeContracts: active,
          pendingReminders,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [timeframe]);

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "20px", color: "var(--fv-navy)" }}>Rendimiento</h2>

      <div className="tab-bar">
        {["dia", "semana", "mes"].map((t) => (
          <button
            key={t}
            onClick={() => setTimeframe(t)}
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
              <div style={{ fontSize: "0.85rem", color: "var(--text-light)", fontWeight: 600 }}>Pagos pendientes de recordatorio</div>
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--fv-navy)" }}>{stats.pendingReminders}</div>
          </div>
        </div>
      )}
    </div>
  );
}
