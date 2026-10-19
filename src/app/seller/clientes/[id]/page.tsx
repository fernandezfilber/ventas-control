"use client";

import { useEffect, useState, use, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheckCircle, FiClock, FiAlertTriangle, FiPhone, FiMapPin, FiLink, FiMessageCircle, FiDownload, FiCheck, FiX } from "react-icons/fi";
import { downloadServiceContractPdf } from "@/lib/contract-pdf";
import { readJsonResponse } from "@/lib/http";

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
  startDate: string;
  endDate: string;
  paymentDay: number;
  status: string;
  clientSignedAt: string | null;
  sellerSignedAt: string | null;
  monthlyAmount: number;
  sellerSignature: string | null;
  clientSignature: string | null;
  sale: {
    id: number;
    names: string;
    dni: string;
    address: string;
    phone: string;
    internetPlan: string | null;
    locationLink: string;
    details: string | null;
    installationDate: string | null;
    installationTimeRange: string | null;
    installedAt: string | null;
  };
  clientUser: { id: number; username: string } | null;
  receipts: Receipt[];
}

interface ClientUserOption {
  id: number;
  username: string;
  fullName: string | null;
}

interface PaymentProof {
  id: number;
  candidateReceiptId: number | null;
  mimeType: string;
  caption: string | null;
  status: string;
  receivedAt: string;
  reviewedAt: string | null;
}

interface PendingReceiptOption {
  id: number;
  monthNumber: number;
  dueDate: string;
  amount: number;
  contract: { contractNumber: string };
}

function getInstallationDate(sale: Contract["sale"], contractStartDate: string) {
  if (sale.installationDate) return sale.installationDate;
  if (!sale.installedAt) return contractStartDate.slice(0, 10);

  const installedAt = new Date(sale.installedAt);
  if (Number.isNaN(installedAt.getTime())) return contractStartDate.slice(0, 10);
  if (
    installedAt.getUTCHours() === 0 &&
    installedAt.getUTCMinutes() === 0 &&
    installedAt.getUTCSeconds() === 0 &&
    installedAt.getUTCMilliseconds() === 0
  ) {
    return installedAt.toISOString().slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(installedAt);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function SellerClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [canConfirmPayments, setCanConfirmPayments] = useState(false);
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceiptOption[]>([]);
  const [proofReceiptSelections, setProofReceiptSelections] = useState<Record<number, string>>({});
  const [proofReviewError, setProofReviewError] = useState("");
  const [reviewingProofId, setReviewingProofId] = useState<number | null>(null);
  const [users, setUsers] = useState<ClientUserOption[]>([]);
  const [linking, setLinking] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [clientSaveMessage, setClientSaveMessage] = useState("");
  const [clientData, setClientData] = useState({ names: "", dni: "", address: "", phone: "", locationLink: "", internetPlan: "", monthlyAmount: "", details: "", installationDate: "", installationTimeRange: "" });
  const [signing, setSigning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refreshPaymentProofs = async (clientUserId: number) => {
    try {
      const response = await fetch(`/api/payment-proofs?clientUserId=${clientUserId}`);
      const data = await readJsonResponse<{
        proofs: PaymentProof[];
        pendingReceipts: PendingReceiptOption[];
        message?: string;
      }>(response);
      if (!response.ok || !data) {
        throw new Error(data?.message || "No se pudieron cargar las capturas de pago.");
      }
      setPaymentProofs(data.proofs);
      setPendingReceipts(data.pendingReceipts);
      setProofReceiptSelections((current) => {
        const next = { ...current };
        for (const proof of data.proofs) {
          if (proof.candidateReceiptId &&
            data.pendingReceipts.some((receipt) => receipt.id === proof.candidateReceiptId) &&
            !next[proof.id]) {
            next[proof.id] = String(proof.candidateReceiptId);
          }
        }
        return next;
      });
      setProofReviewError("");
    } catch (error) {
      setProofReviewError(error instanceof Error ? error.message : "No se pudieron cargar las capturas de pago.");
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/users/me")
      .then(async (res) => {
        const data = await readJsonResponse<{ role?: string }>(res);
        return res.ok ? data : null;
      })
      .then((user) => {
        if (active) setCanConfirmPayments(user?.role === "ADMIN" || user?.role === "SELLER");
      })
      .catch(() => {});
    fetch(`/api/contracts/${id}`)
      .then(async (res) => {
        const data = await readJsonResponse<Contract>(res);
        return res.ok ? data : null;
      })
      .then((data) => {
        if (!active) return;
        setContract(data);
        if (data) {
          setClientData({
            names: data.sale.names,
            dni: data.sale.dni,
            address: data.sale.address,
            phone: data.sale.phone,
            locationLink: data.sale.locationLink,
            internetPlan: data.sale.internetPlan || "",
            monthlyAmount: String(data.monthlyAmount),
            details: data.sale.details || "",
            installationDate: getInstallationDate(data.sale, data.startDate),
            installationTimeRange: data.sale.installationTimeRange || "",
          });
          if (data.clientUser) void refreshPaymentProofs(data.clientUser.id);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    fetch("/api/users?role=CLIENT")
      .then(async (res) => {
        const data = await readJsonResponse<ClientUserOption[]>(res);
        return res.ok ? data ?? [] : [];
      })
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
      .then(async (res) => {
        const data = await readJsonResponse<Contract>(res);
        return res.ok ? data : null;
      })
      .then((data) => {
        setContract(data);
        if (data) {
          setClientData({
            names: data.sale.names,
            dni: data.sale.dni,
            address: data.sale.address,
            phone: data.sale.phone,
            locationLink: data.sale.locationLink,
            internetPlan: data.sale.internetPlan || "",
            monthlyAmount: String(data.monthlyAmount),
            details: data.sale.details || "",
            installationDate: getInstallationDate(data.sale, data.startDate),
            installationTimeRange: data.sale.installationTimeRange || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleMarkPaid = async (receiptId: number) => {
    if (!confirm("¿Confirmar recepción de pago?")) return;
    
    try {
      const res = await fetch(`/api/receipts/${receiptId}/pay`, { method: "PUT" });
      if (res.ok) {
        if (contract?.clientUser) await refreshPaymentProofs(contract.clientUser.id);
        refreshContract();
      } else {
        alert("Error al procesar el pago");
      }
    } catch {
      alert("Error de red");
    }
  };

  const handleUnmarkPaid = async (receiptId: number) => {
    if (!confirm("¿Deshacer el pago marcado? El recibo quedará pendiente o vencido y podrá recibir recordatorios si corresponde.")) return;

    try {
      const res = await fetch(`/api/receipts/${receiptId}/pay`, { method: "PATCH" });
      if (res.ok) {
        if (contract?.clientUser) await refreshPaymentProofs(contract.clientUser.id);
        refreshContract();
      } else {
        alert("No se pudo deshacer el pago.");
      }
    } catch {
      alert("Error de red");
    }
  };

  const handleReviewPaymentProof = async (proof: PaymentProof, action: "approve" | "reject") => {
    const receiptId = Number(proofReceiptSelections[proof.id]);
    if (action === "approve" && (!Number.isInteger(receiptId) || receiptId <= 0)) {
      setProofReviewError("Selecciona el recibo al que corresponde esta captura.");
      return;
    }
    const selectedReceipt = pendingReceipts.find((receipt) => receipt.id === receiptId);
    const confirmation = action === "approve"
      ? `¿Confirmaste en Yape o en tu cuenta que se recibió S/ ${selectedReceipt?.amount.toFixed(2)}? Al confirmar, este recibo se marcará pagado y dejará de recibir recordatorios.`
      : "¿Rechazar esta captura? El recibo seguirá pendiente y continuarán los recordatorios.";
    if (!window.confirm(confirmation)) return;

    setReviewingProofId(proof.id);
    setProofReviewError("");
    try {
      const response = await fetch(`/api/payment-proofs/${proof.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "approve" ? { receiptId } : {}) }),
      });
      const result = await readJsonResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(result?.message || "No se pudo revisar la captura.");
      setProofReviewError("");
      if (contract?.clientUser) await refreshPaymentProofs(contract.clientUser.id);
      refreshContract();
    } catch (error) {
      setProofReviewError(error instanceof Error ? error.message : "No se pudo revisar la captura.");
    } finally {
      setReviewingProofId(null);
    }
  };

  const handleSaveClient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contract) return;
    setSavingClient(true);
    setClientSaveMessage("");
    try {
      const res = await fetch(`/api/clients/${contract.sale.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData),
      });
      if (!res.ok) {
        const error = (await readJsonResponse<{ message?: string }>(res)) ?? {};
        setClientSaveMessage(error.message || "No se pudieron actualizar los datos del cliente.");
        return;
      }
      setEditingClient(false);
      setClientSaveMessage("Cambios guardados correctamente.");
      refreshContract();
    } catch (error) {
      setClientSaveMessage(error instanceof Error ? error.message : "Error de conexión al guardar los cambios.");
    } finally {
      setSavingClient(false);
    }
  };

  const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const point = "touches" in event ? event.touches[0] : event;
    return {
      x: (point.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (point.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    const context = canvasRef.current?.getContext("2d");
    if (!point || !context) return;
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const drawSignature = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(event);
    const context = canvasRef.current?.getContext("2d");
    if (!point || !context) return;
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasSignature(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSellerSign = async () => {
    if (!contract || !canvasRef.current) return;
    const signature = canvasRef.current.toDataURL("image/png");
    if (!hasSignature) {
      alert("Dibuja tu firma antes de guardarla.");
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`/api/contracts/${contract.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, signerRole: "SELLER" }),
      });
      if (!res.ok) {
        const error = (await readJsonResponse<{ message?: string }>(res)) ?? {};
        alert(error.message || "No se pudo guardar la firma.");
        return;
      }
      setContract((await readJsonResponse<Contract>(res)) ?? null);
    } catch {
      alert("Error de conexión.");
    } finally {
      setSigning(false);
      setIsDrawing(false);
    }
  };

  const downloadContractPdf = () => {
    if (!contract) return;
    downloadServiceContractPdf(contract);
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

  if (loading) return <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" style={{ borderTopColor: "var(--fv-blue)" }} /></div>;
  if (!contract) return <div className="card" style={{ textAlign: "center" }}>Contrato no encontrado.</div>;

  return (
    <div>
      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-light)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "0 0 20px 0", fontSize: "0.9rem", fontWeight: 600 }}>
        <FiArrowLeft /> Volver a lista
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <h2 style={{ color: "var(--fv-navy)", fontSize: "1.2rem" }}>Contrato {contract.contractNumber}</h2>
        <button onClick={downloadContractPdf} className="btn-primary" style={{ width: "auto", padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <FiDownload /> Descargar PDF
        </button>
      </div>

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
                {clientSaveMessage && (
                  <p role={clientSaveMessage.startsWith("Cambios guardados") ? "status" : "alert"} style={{ marginBottom: 12, color: clientSaveMessage.startsWith("Cambios guardados") ? "var(--fv-green)" : "var(--fv-red)" }}>
                    {clientSaveMessage}
                  </p>
                )}
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
                  <input type="tel" value={clientData.phone} onChange={(event) => setClientData({ ...clientData, phone: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input required value={clientData.address} onChange={(event) => setClientData({ ...clientData, address: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ubicación en mapa</label>
                  <input type="url" value={clientData.locationLink} onChange={(event) => setClientData({ ...clientData, locationLink: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Fecha de instalación</label>
                  <input required type="date" value={clientData.installationDate} onChange={(event) => setClientData({ ...clientData, installationDate: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Horario de instalación</label>
                  <input value={clientData.installationTimeRange} onChange={(event) => setClientData({ ...clientData, installationTimeRange: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Plan de internet</label>
                  <input value={clientData.internetPlan} onChange={(event) => setClientData({ ...clientData, internetPlan: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mensualidad (S/)</label>
                  <input required type="number" min="0.01" step="0.01" value={clientData.monthlyAmount} onChange={(event) => setClientData({ ...clientData, monthlyAmount: event.target.value })} />
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
                {clientSaveMessage && <p role="status" style={{ marginBottom: 8, color: "var(--fv-green)" }}>{clientSaveMessage}</p>}
                <div><strong>Nombre:</strong> {contract.sale.names}</div>
                <div><strong>DNI:</strong> {contract.sale.dni}</div>
                {contract.sale.details && <div><strong>Detalles:</strong> {contract.sale.details}</div>}
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ color: "var(--fv-navy)", marginBottom: "12px" }}>Firmas del contrato</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px", fontSize: "0.9rem" }}>
          <span>{contract.sellerSignature ? "✓ Asesor firmó" : "Asesor pendiente de firma"}</span>
          <span>{contract.clientSignature ? "✓ Cliente firmó" : "Cliente pendiente de firma"}</span>
        </div>
        {!contract.sellerSignature && (
          <>
            <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "10px" }}>Firma en el recuadro. El cliente deberá firmar desde su propio acceso.</p>
            <canvas
              ref={canvasRef}
              width={600}
              height={220}
              aria-label="Recuadro para la firma del asesor"
              style={{ display: "block", width: "100%", height: "140px", background: "#fff", border: "1px solid var(--border-color)", borderRadius: "8px", touchAction: "none" }}
              onMouseDown={startDrawing}
              onMouseMove={drawSignature}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              onTouchStart={startDrawing}
              onTouchMove={drawSignature}
              onTouchEnd={() => setIsDrawing(false)}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button onClick={clearSignature} className="btn-outline" style={{ width: "auto", padding: "8px 12px" }}><FiX /> Borrar</button>
              <button onClick={handleSellerSign} className="btn-primary" disabled={signing} style={{ width: "auto", padding: "8px 12px" }}>
                <FiCheck /> {signing ? "Guardando..." : "Firmar como asesor"}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ color: "var(--fv-navy)", marginBottom: "8px" }}>Recordatorios de pago por WhatsApp</h3>
        <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--text-light)" }}>
          Los avisos automáticos se envían cinco días antes y el día del vencimiento, solo si el cliente aceptó recibirlos. El cliente puede desactivarlos desde su cuenta, en Pagos. Confirma aquí cuando recibas el pago.
        </p>
      </section>

      {canConfirmPayments && contract.clientUser && (
        <section className="card" style={{ marginBottom: "20px" }}>
          <h3 style={{ color: "var(--fv-navy)", marginBottom: 8 }}>Capturas de Yape recibidas</h3>
          <p style={{ color: "var(--text-light)", fontSize: ".82rem", marginBottom: 12 }}>
            La imagen es solo una evidencia pendiente: no verifica que el dinero haya ingresado. Confirma el abono antes de aprobarla. Si hay varios recibos, selecciona el correcto; hasta entonces seguirán los recordatorios.
          </p>
          {proofReviewError && <p role="alert" style={{ color: "var(--fv-red)", marginBottom: 12 }}>{proofReviewError}</p>}
          {paymentProofs.length === 0 ? (
            <p style={{ color: "var(--text-light)", fontSize: ".85rem" }}>Todavía no hay capturas recibidas de este cliente.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {paymentProofs.map((proof) => (
                <article key={proof.id} style={{ border: "1px solid var(--border-color)", borderRadius: 10, padding: 12 }}>
                  <Image
                    src={`/api/payment-proofs/${proof.id}/image`}
                    alt={`Captura de pago recibida el ${new Date(proof.receivedAt).toLocaleString("es-PE")}`}
                    width={420}
                    height={420}
                    unoptimized
                    style={{ display: "block", width: "100%", maxWidth: 420, maxHeight: 420, objectFit: "contain", margin: "0 auto 10px", borderRadius: 8 }}
                  />
                  <div style={{ fontSize: ".82rem", color: "var(--text-light)", marginBottom: 8 }}>
                    Recibida: {new Date(proof.receivedAt).toLocaleString("es-PE")}
                    {proof.caption ? ` · ${proof.caption}` : ""}
                  </div>
                  <strong style={{ fontSize: ".85rem" }}>
                    {proof.status === "PENDING_REVIEW" ? "Pendiente de verificación" : proof.status === "ACCEPTED" ? "Pago confirmado" : "Captura rechazada"}
                  </strong>
                  {proof.status === "PENDING_REVIEW" && (
                    <>
                      <label htmlFor={`proof-receipt-${proof.id}`} className="form-group" style={{ display: "block", marginTop: 10, marginBottom: 10 }}>
                        <span style={{ display: "block", fontSize: ".8rem", fontWeight: 600, marginBottom: 5 }}>Recibo relacionado</span>
                        <select
                          id={`proof-receipt-${proof.id}`}
                          value={proofReceiptSelections[proof.id] ?? ""}
                          onChange={(event) => setProofReceiptSelections((current) => ({ ...current, [proof.id]: event.target.value }))}
                          style={{ width: "100%", padding: 9, border: "1px solid var(--border-color)", borderRadius: 8 }}
                        >
                          <option value="">Selecciona un pago pendiente...</option>
                          {pendingReceipts.map((receipt) => (
                            <option key={receipt.id} value={receipt.id}>
                              {receipt.contract.contractNumber} · Mes {receipt.monthNumber} · S/ {receipt.amount.toFixed(2)} · vence {new Date(receipt.dueDate).toLocaleDateString("es-PE")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn-success"
                          disabled={reviewingProofId === proof.id || pendingReceipts.length === 0}
                          onClick={() => void handleReviewPaymentProof(proof, "approve")}
                          style={{ padding: "8px 12px" }}
                        >
                          {reviewingProofId === proof.id ? "Guardando..." : "Confirmar abono y detener avisos"}
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          disabled={reviewingProofId === proof.id}
                          onClick={() => void handleReviewPaymentProof(proof, "reject")}
                          style={{ padding: "8px 12px", color: "var(--fv-red)", borderColor: "var(--fv-red)" }}
                        >
                          Rechazar captura
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recibos */}
      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--fv-navy)", marginBottom: "16px" }}>Historial de Recibos</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {contract.receipts.map((r) => {
          const isPaid = r.status === "PAID";
          const isOverdue = r.status === "OVERDUE" || (!isPaid && new Date(r.dueDate) < new Date());
          const phoneDigits = contract.sale.phone.replace(/\D/g, "");
          const whatsappPhone = phoneDigits.length === 9 ? `51${phoneDigits}` : phoneDigits;
          const reminderMessage = `Hola ${contract.sale.names}, te recordamos el pago de S/ ${r.amount.toFixed(2)} correspondiente al mes ${r.monthNumber}, con vencimiento el ${new Date(r.dueDate).toLocaleDateString("es-PE")}. Si ya pagaste, ignora este mensaje. Para dejar de recibir recordatorios, responde SALIR o desactívalos en tu cuenta de cliente, en Pagos. ForwardVision: +51 955 318 590.`;
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
                    {canConfirmPayments && (
                      <button onClick={() => handleMarkPaid(r.id)} className="btn-success" style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: "6px" }}>
                        Marcar Pagado
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>
                      {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : "Pagado"}
                    </div>
                    {canConfirmPayments && (
                      <button onClick={() => handleUnmarkPaid(r.id)} className="btn-outline" style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: "6px" }}>
                        Desmarcar como pagado
                      </button>
                    )}
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
