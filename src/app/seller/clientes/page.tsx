"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiSearch, FiChevronRight, FiUserPlus, FiX } from "react-icons/fi";

interface Contract {
  id: number;
  contractNumber: string;
  status: string;
  sale: { id: number; names: string; dni: string; internetPlan: string | null };
  clientUser: { username: string } | null;
}

interface Sale {
  id: number;
  correlativeId: string;
  names: string;
  dni: string;
  internetPlan: string | null;
  status: string;
}

export default function SellerClients() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Create user modal state
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({ fullName: "", dni: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/contracts"), fetch("/api/sales")])
      .then(async ([contractsRes, salesRes]) => {
        if (!contractsRes.ok || !salesRes.ok) throw new Error("No se pudieron cargar los clientes");
        const [contractData, saleData] = await Promise.all([contractsRes.json(), salesRes.json()]);
        setContracts(contractData);
        setSales(saleData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Create user with role CLIENT, username = dni, password = dni
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newClient.dni,
          password: newClient.dni,
          role: "CLIENT",
          fullName: newClient.fullName,
        })
      });
      
      if (res.ok) {
        alert("Cliente creado exitosamente. El usuario y contraseña es su DNI.");
        setShowModal(false);
        setNewClient({ fullName: "", dni: "" });
        // Optionally link this new user to a pending contract here, 
        // or let the seller do it from the detail view.
      } else {
        const error = await res.json();
        alert(`Error: ${error.message}`);
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const filtered = contracts.filter(c => 
    c.sale.names.toLowerCase().includes(search.toLowerCase()) || 
    c.sale.dni.includes(search) ||
    c.contractNumber.toLowerCase().includes(search.toLowerCase())
  );
  const contractedSaleIds = new Set(contracts.map((contract) => contract.sale.id));
  const pendingSales = sales.filter((sale) =>
    !contractedSaleIds.has(sale.id) && (
      sale.names.toLowerCase().includes(search.toLowerCase()) ||
      sale.dni.includes(search) ||
      sale.correlativeId.toLowerCase().includes(search.toLowerCase())
    )
  );
  const visibleCount = filtered.length + pendingSales.length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--fv-navy)" }}>Mis Clientes</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/ventas/nueva" className="btn-primary" style={{ width: "auto", padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "8px", textDecoration: "none" }}>
            <FiUserPlus /> Registrar cliente
          </Link>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ width: "auto", padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px", borderRadius: "8px" }}>
            <FiUserPlus /> Nuevo acceso
          </button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: "20px" }}>
        <FiSearch style={{ position: "absolute", left: "14px", top: "14px", color: "var(--text-light)" }} />
        <input 
          type="text" 
          placeholder="Buscar por nombre, DNI o contrato..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "12px 12px 12px 40px", border: "1px solid var(--border-color)", borderRadius: "12px", outline: "none", fontSize: "0.95rem" }}
        />
      </div>

      {loading ? (
         <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" style={{ borderTopColor: "var(--fv-blue)" }} /></div>
      ) : visibleCount === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-light)" }}>No se encontraron clientes.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((c) => (
            <Link href={`/seller/clientes/${c.id}`} key={c.id} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", transition: "transform 0.1s", cursor: "pointer", margin: 0 }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--accent-cyan)", color: "var(--fv-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem" }}>
                  {c.sale.names.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--fv-navy)" }}>{c.sale.names}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>DNI: {c.sale.dni} • {c.sale.internetPlan}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className={`badge ${c.status === "ACTIVE" ? "badge-active" : "badge-pending"}`} style={{ marginBottom: "4px" }}>
                    {c.status === "ACTIVE" ? "Activo" : "Pendiente"}
                  </div>
                  {!c.clientUser && <div style={{ fontSize: "0.7rem", color: "var(--fv-orange)" }}>Sin acceso web</div>}
                </div>
                <FiChevronRight color="#cbd5e1" />
              </div>
            </Link>
          ))}
          {pendingSales.map((sale) => (
            <div key={`sale-${sale.id}`} className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#fff7ed", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem" }}>
                {sale.names.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--fv-navy)" }}>{sale.names}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>DNI: {sale.dni} · Venta {sale.correlativeId} · {sale.internetPlan || "Sin plan"}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "4px" }}>El contrato y las opciones de firma aparecerán cuando administración confirme la instalación.</div>
              </div>
              <span className="badge badge-pending">{sale.status === "INSTALLED" ? "Instalación confirmada" : "Pendiente de instalación"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Acceso Cliente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--fv-navy)" }}>Crear Acceso a Cliente</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--text-light)" }}><FiX /></button>
            </div>
            
            <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "20px" }}>
              Esto generará una cuenta web para que el cliente pueda ingresar a ver y firmar su contrato. El <strong>usuario y contraseña será su número de DNI</strong> por defecto.
            </p>

            <form onSubmit={handleCreateClient}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input required type="text" value={newClient.fullName} onChange={e => setNewClient({...newClient, fullName: e.target.value})} placeholder="Ej: Juan Perez" />
              </div>
              <div className="form-group">
                <label>Número de DNI</label>
                <input required type="text" value={newClient.dni} onChange={e => setNewClient({...newClient, dni: e.target.value})} placeholder="Ej: 71234567" maxLength={8} />
              </div>
              
              <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: "10px" }}>
                {creating ? "Creando..." : "Crear Acceso"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
