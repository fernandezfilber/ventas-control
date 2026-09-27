"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheckCircle, FiClock, FiAlertTriangle, FiPhone, FiMapPin, FiLink } from "react-icons/fi";

interface Receipt {
  id: number;
  monthNumber: number;
  dueDate: string;
  paidAt: string | null;
  amount: number;
  status: string;
}

interface Contract {
  id: number;
  contractNumber: string;
  status: string;
  monthlyAmount: number;
  sale: { names: string; dni: string; address: string; phone: string; internetPlan: string; locationLink: string };
  clientUser: { id: number; username: string } | null;
  receipts: Receipt[];
}

export default function SellerClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetchContract();
    fetchUsers();
  }, [id]);

  const fetchContract = () => {
    fetch(`/api/contracts/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setContract(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchUsers = () => {
    fetch("/api/users?role=CLIENT")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(() => {});
  };

  const handleMarkPaid = async (receiptId: number) => {
    if (!confirm("¿Confirmar recepción de pago?")) return;
    
    try {
      const res = await fetch(`/api/receipts/${receiptId}/pay`, { method: "PUT" });
      if (res.ok) {
        fetchContract(); // Reload data
      } else {
        alert("Error al procesar el pago");
      }
    } catch {
      alert("Error de red");
    }
  };

  const handleLinkUser = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    if (!userId) return;
    
    setLinking(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUserId: parseInt(userId, 10) })
      });
      if (res.ok) {
        fetchContract();
        alert("Cuenta vinculada exitosamente al contrato.");
      }
    } catch {
      alert("Error de red");
    } finally {
      setLinking(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" style={{ borderTopColor: "var(--fv-blue)" }} /></div>;
  if (!contract) return <div className="card" style={{ textAlign: "center" }}>Contrato no encontrado.</div>;

  return (
    <div>
      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-light)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "0 0 20px 0", fontSize: "0.9rem", fontWeight: 600 }}>
        <FiArrowLeft /> Volver a lista
      </button>

      {/* Perfil del Cliente */}
      <div className="card" style={{ padding: "0", overflow: "hidden", marginBottom: "20px" }}>
        <div style={{ background: "linear-gradient(135deg, var(--fv-navy), var(--fv-blue))", padding: "24px", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "4px" }}>{contract.sale.names}</h2>
              <div style={{ opacity: 0.8, fontSize: "0.9rem" }}>DNI: {contract.sale.dni} • {contract.sale.internetPlan}</div>
            </div>
            <div className={`badge ${contract.status === "ACTIVE" ? "badge-active" : "badge-pending"}`}>
              {contract.status === "ACTIVE" ? "Activo" : "Pend. Firma"}
            </div>
          </div>
        </div>
        
        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <FiPhone color="var(--fv-blue-light)" size={18} style={{ marginTop: "2px" }} />
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-light)", fontWeight: 600 }}>CELULAR</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{contract.sale.phone}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <FiMapPin color="var(--fv-blue-light)" size={18} style={{ marginTop: "2px" }} />
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-light)", fontWeight: 600 }}>DIRECCIÓN</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>{contract.sale.address}</div>
                <a href={contract.sale.locationLink} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "var(--fv-blue)", textDecoration: "none" }}>Ver Mapa</a>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-light)", borderRadius: "12px", border: "1px dashed var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "var(--fv-navy)", fontWeight: 600 }}>
              <FiLink /> Acceso Web del Cliente
            </div>
            
            {contract.clientUser ? (
              <div style={{ fontSize: "0.85rem", color: "var(--fv-green-dark)", fontWeight: 500 }}>
                ✅ Vinculado a la cuenta: <strong>{contract.clientUser.username}</strong>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-light)", marginBottom: "8px" }}>Este contrato no tiene un usuario asignado para que el cliente ingrese.</div>
                <select 
                  onChange={handleLinkUser} 
                  disabled={linking}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                >
                  <option value="">Selecciona un usuario creado...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName || u.username} (DNI: {u.username})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recibos */}
      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--fv-navy)", marginBottom: "16px" }}>Historial de Recibos</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {contract.receipts.map((r) => {
          const isPaid = r.status === "PAID";
          const isOverdue = r.status === "OVERDUE" || (!isPaid && new Date(r.dueDate) < new Date());
          
          let statusColor = "var(--fv-blue)";
          let statusIcon = <FiClock size={20} color={statusColor} />;
          let statusText = "Pendiente";
          
          if (isPaid) {
            statusColor = "var(--fv-green)";
            statusIcon = <FiCheckCircle size={20} color={statusColor} />;
            statusText = "Pagado";
          } else if (isOverdue) {
            statusColor = "var(--fv-red)";
            statusIcon = <FiAlertTriangle size={20} color={statusColor} />;
            statusText = "Vencido";
          }

          return (
            <div key={r.id} className="card" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "16px", margin: 0 }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: `rgba(${isPaid ? "16,185,129" : isOverdue ? "239,68,68" : "59,130,246"}, 0.1)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {statusIcon}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-light)", fontWeight: 600 }}>Mes {r.monthNumber}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--fv-navy)" }}>S/ {r.amount.toFixed(2)}</div>
              </div>
              
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.8rem", color: statusColor, fontWeight: 700, marginBottom: "4px" }}>
                  {statusText}
                </div>
                {!isPaid ? (
                  <button onClick={() => handleMarkPaid(r.id)} className="btn-success" style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: "6px" }}>
                    Marcar Pagado
                  </button>
                ) : (
                  <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>
                    {new Date(r.paidAt!).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
