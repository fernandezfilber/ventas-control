"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheckCircle, FiClock, FiAlertTriangle, FiPhone, FiMapPin, FiLink, FiMessageCircle } from "react-icons/fi";

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
  reminderMode: string;
  monthlyAmount: number;
  sale: { id: number; names: string; dni: string; address: string; phone: string; internetPlan: string; locationLink: string; details: string | null };
  clientUser: { id: number; username: string; whatsappRemindersEnabled: boolean } | null;
  receipts: Receipt[];
}

interface ClientUserOption {
  id: number;
  username: string;
  fullName: string | null;
}

export default function SellerClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<ClientUserOption[]>([]);
  const [linking, setLinking] = useState(false);
  const [reminderMode, setReminderMode] = useState("MANUAL");
  const [savingReminderMode, setSavingReminderMode] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientData, setClientData] = useState({ names: "", dni: "", address: "", phone: "", locationLink: "", internetPlan: "", details: "" });

  useEffect(() => {
    let active = true;
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (active) setIsAdmin(user?.role === "ADMIN");
      })
      .catch(() => {});
    fetch(`/api/contracts/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setContract(data);
        if (data) {
          setReminderMode(data.reminderMode || "MANUAL");
          setClientData({
            names: data.sale.names,
            dni: data.sale.dni,
            address: data.sale.address,
            phone: data.sale.phone,
            locationLink: data.sale.locationLink,
            internetPlan: data.sale.internetPlan || "",
            details: data.sale.details || "",
          });
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    fetch("/api/users?role=CLIENT")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  const refreshContract = () => {
    fetch(`/api/contracts/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setContract(data);
        if (data) setReminderMode(data.reminderMode || "MANUAL");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleMarkPaid = async (receiptId: number) => {
    if (!confirm("¿Confirmar recepción de pago?")) return;
    
    try {
      const res = await fetch(`/api/receipts/${receiptId}/pay`, { method: "PUT" });
      if (res.ok) {
        refreshContract();
      } else {
        alert("Error al procesar el pago");
      }
    } catch {
      alert("Error de red");
    }
  };

  const handleSaveClient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contract) return;
    setSavingClient(true);
    try {
      const res = await fetch(`/api/sales/${contract.sale.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.message || "No se pudieron actualizar los datos del cliente.");
        return;
      }
      setEditingClient(false);
      refreshContract();
    } catch {
      alert("Error de conexión.");
    } finally {
      setSavingClient(false);
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
        refreshContract();
        alert("Cuenta vinculada exitosamente al contrato.");
      }
    } catch {
      alert("Error de red");
    } finally {
      setLinking(false);
    }
  };

  const handleReminderModeChange = async (mode: string) => {
    if (mode === "AUTOMATIC" && !contract?.clientUser?.whatsappRemindersEnabled) return;
    setSavingReminderMode(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderMode: mode }),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.message || "No se pudo guardar el modo de recordatorio.");
        return;
      }
      setReminderMode(mode);
    } catch {
      alert("Error de conexión.");
    } finally {
      setSavingReminderMode(false);
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

          <section style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <h3 style={{ color: "var(--fv-navy)", fontSize: "1rem" }}>Datos del cliente</h3>
              <button type="button" onClick={() => setEditingClient(!editingClient)} className="btn-primary" style={{ width: "auto", padding: "8px 12px" }}>
                {editingClient ? "Cancelar" : "Editar datos"}
              </button>
            </div>
            {editingClient ? (
              <form onSubmit={handleSaveClient}>
                <div className="form-group">
                  <label>Nombre completo</label>
                  <input required value={clientData.names} onChange={(event) => setClientData({ ...clientData, names: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>DNI</label>
                  <input required value={clientData.dni} onChange={(event) => setClientData({ ...clientData, dni: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input required type="tel" value={clientData.phone} onChange={(event) => setClientData({ ...clientData, phone: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input required value={clientData.address} onChange={(event) => setClientData({ ...clientData, address: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ubicación en mapa</label>
                  <input required type="url" value={clientData.locationLink} onChange={(event) => setClientData({ ...clientData, locationLink: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Plan de internet</label>
                  <input value={clientData.internetPlan} onChange={(event) => setClientData({ ...clientData, internetPlan: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Detalles</label>
                  <textarea value={clientData.details} onChange={(event) => setClientData({ ...clientData, details: event.target.value })} />
                </div>
                <button type="submit" className="btn-primary" disabled={savingClient}>
                  {savingClient ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            ) : (
              <div style={{ fontSize: "0.9rem", color: "var(--text-light)" }}>
                <div><strong>Nombre:</strong> {contract.sale.names}</div>
                <div><strong>DNI:</strong> {contract.sale.dni}</div>
                {contract.sale.details && <div><strong>Detalles:</strong> {contract.sale.details}</div>}
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ color: "var(--fv-navy)", marginBottom: "8px" }}>Recordatorios de pago por WhatsApp</h3>
        <select
          value={reminderMode}
          disabled={savingReminderMode || !contract.clientUser}
          onChange={(event) => handleReminderModeChange(event.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
        >
          <option value="MANUAL">Manual: el asesor envía cada aviso</option>
          <option value="AUTOMATIC" disabled={!contract.clientUser?.whatsappRemindersEnabled}>Automático: enviar cerca del vencimiento</option>
        </select>
        <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--text-light)" }}>
          {!contract.clientUser
            ? "Vincula una cuenta de cliente para configurar avisos automáticos."
            : contract.clientUser.whatsappRemindersEnabled
              ? "El cliente autorizó los avisos. El modo automático requiere configurar WhatsApp Business y el cron del servidor."
              : "El cliente aún no autorizó avisos automáticos; puede hacerlo desde su portal."}
        </p>
      </section>

      {/* Recibos */}
      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--fv-navy)", marginBottom: "16px" }}>Historial de Recibos</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {contract.receipts.map((r) => {
          const isPaid = r.status === "PAID";
          const isOverdue = r.status === "OVERDUE" || (!isPaid && new Date(r.dueDate) < new Date());
          const phoneDigits = contract.sale.phone.replace(/\D/g, "");
          const whatsappPhone = phoneDigits.length === 9 ? `51${phoneDigits}` : phoneDigits;
          const reminderMessage = `Hola ${contract.sale.names}, te recordamos el pago de S/ ${r.amount.toFixed(2)} correspondiente al mes ${r.monthNumber}, con vencimiento el ${new Date(r.dueDate).toLocaleDateString("es-PE")}.`;
          const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(reminderMessage)}`;
          
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
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={`Enviar recordatorio WhatsApp a ${contract.sale.names}`} style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#15803d", border: "1px solid #86efac", borderRadius: "6px", padding: "6px 9px", fontSize: "0.75rem", textDecoration: "none" }}>
                      <FiMessageCircle /> WhatsApp
                    </a>
                    {isAdmin && (
                      <button onClick={() => handleMarkPaid(r.id)} className="btn-success" style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: "6px" }}>
                        Marcar Pagado
                      </button>
                    )}
                  </div>
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
