"use client";

import { useEffect, useState } from "react";
import { FiFileText, FiCheck, FiSearch } from "react-icons/fi";

export default function AdminContracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/contracts")
      .then((res) => res.json())
      .then((data) => {
        setContracts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = contracts.filter((c) =>
    c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.sale.names.toLowerCase().includes(search.toLowerCase()) ||
    c.sale.dni.includes(search)
  );

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--fv-navy)", marginBottom: "20px" }}>Gestión de Contratos</h2>

      <div className="card">
        <div style={{ position: "relative", marginBottom: "16px", maxWidth: "400px" }}>
          <FiSearch style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-light)" }} />
          <input 
            type="text" 
            placeholder="Buscar por DNI, Nombre o N° Contrato..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "11px 11px 11px 40px", border: "1px solid var(--border-color)", borderRadius: "10px", outline: "none" }}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="fv-table">
            <thead>
              <tr>
                <th>N° Contrato</th>
                <th>Cliente</th>
                <th>Asesor</th>
                <th>Inicio</th>
                <th>Estado</th>
                <th>Recibos Pagados</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "20px" }}><div className="spinner" style={{ borderTopColor: "var(--fv-blue)" }}/></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--text-light)" }}>No se encontraron contratos</td></tr>
              ) : (
                filtered.map((c) => {
                  const paid = c.receipts.filter((r: any) => r.status === "PAID").length;
                  const total = c.receipts.length;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.contractNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--fv-navy)" }}>{c.sale.names}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>DNI: {c.sale.dni}</div>
                      </td>
                      <td>{c.sellerUser?.fullName || c.sellerUser?.username || "—"}</td>
                      <td>{new Date(c.startDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${c.status === "ACTIVE" ? "badge-active" : "badge-pending"}`}>
                          {c.status === "ACTIVE" ? "Activo" : "Pendiente"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 600, color: paid === total ? "var(--fv-green)" : "inherit" }}>
                            {paid}/{total}
                          </span>
                          {paid === total && <FiCheck color="var(--fv-green)" />}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
