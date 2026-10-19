"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { FiDownload, FiSearch, FiTrash2, FiUpload, FiUserPlus } from "react-icons/fi";
import { readJsonResponse } from "@/lib/http";

interface ClientRecord {
  id: number;
  correlativeId: string;
  names: string;
  dni: string;
  phone: string;
  address: string;
  internetPlan: string | null;
  createdAt: string;
  contract: {
    id: number;
    contractNumber: string;
    monthlyAmount: number;
    status: string;
    receipts: { id: number; monthNumber: number; status: string; dueDate: string }[];
  } | null;
}

type PaymentStatus = {
  key: "overdue" | "due-soon" | "current";
  label: string;
  dueDate?: string;
  dueMonth?: number;
  firstPaidDate?: string;
};

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const dateKey = (value: string) => {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

const todayKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const formatDueDate = (value: string) => {
  const [year, month, day] = dateKey(value).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-PE");
};

const getPaymentStatus = (client: ClientRecord): PaymentStatus => {
  const receipts = client.contract?.receipts ?? [];
  const unpaid = receipts.filter((receipt) => receipt.status !== "PAID");
  const firstPaidReceipt = receipts.find((receipt) => receipt.monthNumber === 1 && receipt.status === "PAID");
  const today = todayKey();
  const overdue = unpaid
    .filter((receipt) => receipt.status === "OVERDUE" || dateKey(receipt.dueDate) < today)
    .sort((left, right) => dateKey(left.dueDate).localeCompare(dateKey(right.dueDate)))[0];

  if (overdue) {
    return {
      key: "overdue",
      label: "Vencido",
      dueDate: overdue.dueDate,
      dueMonth: overdue.monthNumber,
      firstPaidDate: firstPaidReceipt?.dueDate,
    };
  }

  const nextDue = unpaid
    .filter((receipt) => dateKey(receipt.dueDate) >= today)
    .sort((left, right) => dateKey(left.dueDate).localeCompare(dateKey(right.dueDate)))[0];
  if (nextDue) {
    const todayTimestamp = new Date(`${today}T00:00:00Z`).getTime();
    const daysUntilDue = (new Date(`${dateKey(nextDue.dueDate)}T00:00:00Z`).getTime() - todayTimestamp) / 86_400_000;
    const details = {
      dueDate: nextDue.dueDate,
      dueMonth: nextDue.monthNumber,
      firstPaidDate: firstPaidReceipt?.dueDate,
    };
    if (daysUntilDue <= 5) return { key: "due-soon", label: "Por vencer", ...details };
    return { key: "current", label: "Al día", ...details };
  }

  return {
    key: "current",
    label: receipts.length > 0 ? "Al día" : "Sin pagos",
    dueDate: undefined,
    firstPaidDate: firstPaidReceipt?.dueDate,
  };
};

const getPaymentDateSummary = (paymentStatus: PaymentStatus) => {
  const firstPaid = paymentStatus.firstPaidDate
    ? `Mes 1 pagado ${formatDueDate(paymentStatus.firstPaidDate)} · `
    : "";
  if (!paymentStatus.dueDate) return `${firstPaid}Sin vencimiento próximo`;
  const due = paymentStatus.key === "overdue" ? "Vencido desde" : "Vence";
  const month = paymentStatus.dueMonth ? `Mes ${paymentStatus.dueMonth} · ` : "";
  return `${firstPaid}${month}${due} ${formatDueDate(paymentStatus.dueDate)}`;
};

const valueFor = (row: Record<string, unknown>, aliases: string[]) => {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, ""), value])
  );
  const key = aliases.find((alias) => normalized[alias] !== undefined);
  return key ? String(normalized[key] ?? "").trim() : "";
};

const dateFor = (row: Record<string, unknown>, aliases: string[]) => {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, ""), value])
  );
  const key = aliases.find((alias) => normalized[alias] !== undefined);
  if (!key) return "";

  const value = normalized[key];
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const text = String(value ?? "").trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoDate) return text;
  const localDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (localDate) {
    return `${localDate[3]}-${localDate[2].padStart(2, "0")}-${localDate[1].padStart(2, "0")}`;
  }
  return text;
};

export default function SellerClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dniInput, setDniInput] = useState("");
  const [dniSearch, setDniSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const loadClients = async () => {
    try {
      const params = new URLSearchParams();
      if (month !== "all") params.set("month", month);
      if (dniSearch) params.set("dni", dniSearch);
      const query = params.size ? `?${params.toString()}` : "";
      const response = await fetch(`/api/clients${query}`);
      const data = await readJsonResponse<ClientRecord[]>(response);
      if (!response.ok) {
        const message = data && typeof data === "object" && "message" in data && typeof (data as { message?: string }).message === "string"
          ? (data as { message?: string }).message
          : "No se pudieron cargar los clientes.";
        throw new Error(message);
      }
      setClients(data ?? []);
    } catch (error) {
      setImportResult(error instanceof Error ? error.message : "Error al cargar clientes.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (month !== "all") params.set("month", month);
    if (dniSearch) params.set("dni", dniSearch);
    const query = params.size ? `?${params.toString()}` : "";
    fetch(`/api/clients${query}`)
      .then(async (response) => {
        const data = await readJsonResponse<ClientRecord[]>(response);
        if (!response.ok) {
          const message = data && typeof data === "object" && "message" in data && typeof (data as { message?: string }).message === "string"
            ? (data as { message?: string }).message
            : "No se pudieron cargar los clientes.";
          throw new Error(message);
        }
        return data ?? [] as ClientRecord[];
      })
      .then((data) => {
        if (!active) return;
        setClients(data);
        setImportResult("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setImportResult(error instanceof Error ? error.message : "Error al cargar clientes.");
        setClients([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, dniSearch]);

  const applyDniSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dni = dniInput.replace(/\D/g, "");
    if (dni && !/^\d{7,12}$/.test(dni)) {
      setImportResult("Ingresa un DNI válido de 7 a 12 dígitos.");
      return;
    }
    setImportResult("");
    setLoading(true);
    setDniSearch(dni);
  };

  const filtered = clients.filter((client) =>
    client.names.toLowerCase().includes(search.toLowerCase()) ||
    client.dni.includes(search) ||
    client.contract?.contractNumber.toLowerCase().includes(search.toLowerCase())
  );

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text("ForwardVision", 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`Lista de clientes${month === "all" ? "" : ` - ${month}`}`, 14, 28);
    doc.setFontSize(9);

    let y = 40;
    filtered.forEach((client, index) => {
      const lines = doc.splitTextToSize(
        `${index + 1}. ${client.names} | DNI ${client.dni} | ${client.phone}\n` +
        `Contrato ${client.contract?.contractNumber ?? "—"} | S/ ${client.contract?.monthlyAmount.toFixed(2) ?? "0.00"} / mes | ${client.address}`,
        180
      );
      if (y + lines.length * 5 > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(lines, 14, y);
      y += lines.length * 5 + 4;
    });

    doc.save(`Clientes_${month === "all" ? "todos" : month}.pdf`);
  };

  const importExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult("");

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("El archivo no contiene una hoja de cálculo.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      if (rows.length === 0) throw new Error("La hoja no contiene filas de clientes.");

      let created = 0;
      const errors: string[] = [];
      for (const [index, row] of rows.entries()) {
        const payload = {
          names: valueFor(row, ["nombres", "nombre", "names", "fullname"]),
          dni: valueFor(row, ["dni", "documento", "numerodocumento"]),
          phone: valueFor(row, ["telefono", "celular", "phone"]),
          address: valueFor(row, ["direccion", "address"]),
          internetPlan: valueFor(row, ["plan", "internetplan"]) || "Plan básico 250 Mbps",
          monthlyAmount: valueFor(row, ["mensualidad", "montomensual", "monthlyamount", "monto"]) || "50",
          installationDate: dateFor(row, ["fechainstalacion", "fechadeinstalacion", "installationdate"]),
          installationTimeRange: valueFor(row, ["horainstalacion", "horario", "installationtimerange"]),
          details: valueFor(row, ["detalles", "referencia", "observaciones", "details"]),
          additionalService: valueFor(row, ["servicioadicional", "additionalservice"]).toLowerCase() === "si",
        };
        const response = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          created += 1;
        } else {
          const result = (await readJsonResponse<{ message?: string }>(response)) ?? {};
          errors.push(`Fila ${index + 2}: ${result.message || "datos inválidos"}`);
        }
      }

      await loadClients();
      setImportResult(
        `${created} de ${rows.length} clientes registrados.` +
        (errors.length ? ` Errores: ${errors.slice(0, 5).join(" ")}` : "")
      );
    } catch (error) {
      setImportResult(error instanceof Error ? error.message : "No se pudo leer el archivo Excel.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const deleteClient = async (client: ClientRecord) => {
    if (!window.confirm(`¿Eliminar a ${client.names} y su contrato? Esta acción no se puede deshacer.`)) return;
    const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    const result = (await readJsonResponse<{ message?: string }>(response)) ?? {};
    if (!response.ok) {
      setImportResult(result.message || "No se pudo eliminar el cliente.");
      return;
    }
    setClients((current) => current.filter((item) => item.id !== client.id));
  };

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: "1.45rem", color: "var(--fv-navy)" }}>Mis clientes</h1>
          <p style={{ color: "var(--text-light)", fontSize: ".85rem", marginTop: 4 }}>Clientes, contratos y ventas de tu cartera.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/seller/clientes/nuevo" className="btn-primary" style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
            <FiUserPlus /> Registrar cliente
          </Link>
          <button className="btn-outline" onClick={downloadPdf} disabled={!filtered.length} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <FiDownload /> PDF
          </button>
          <button className="btn-outline" onClick={() => fileInput.current?.click()} disabled={importing} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <FiUpload /> {importing ? "Importando..." : "Importar Excel"}
          </button>
          <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} hidden />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) minmax(150px, 220px) minmax(180px, 240px)", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <FiSearch style={{ position: "absolute", left: 13, top: 14, color: "var(--text-light)" }} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o contrato" aria-label="Buscar por nombre o contrato" style={{ width: "100%", padding: "12px 12px 12px 38px", border: "1px solid var(--border-color)", borderRadius: 10 }} />
        </div>
        <form onSubmit={applyDniSearch} style={{ display: "flex", gap: 6 }}>
          <input
            inputMode="numeric"
            value={dniInput}
            onChange={(event) => setDniInput(event.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="Buscar por DNI"
            aria-label="Buscar cliente por DNI exacto"
            style={{ minWidth: 0, flex: 1, padding: 11, border: "1px solid var(--border-color)", borderRadius: 10 }}
          />
          <button type="submit" className="btn-outline" disabled={!/^\d{7,12}$/.test(dniInput)} style={{ whiteSpace: "nowrap", padding: "8px 10px" }}>
            Buscar DNI
          </button>
          {dniSearch && (
            <button type="button" className="btn-outline" onClick={() => { setDniInput(""); setDniSearch(""); setLoading(true); }} aria-label="Limpiar búsqueda por DNI">
              ×
            </button>
          )}
        </form>
        <div style={{ display: "flex", gap: 8 }}>
          <input aria-label="Filtrar ventas por mes" type="month" value={month === "all" ? "" : month} onChange={(event) => { setLoading(true); setMonth(event.target.value || currentMonth()); }} style={{ minWidth: 0, flex: 1, padding: 11, border: "1px solid var(--border-color)", borderRadius: 10, background: "#fff" }} />
          <button type="button" className="btn-outline" onClick={() => setMonth("all")} style={{ whiteSpace: "nowrap", padding: "8px 10px" }}>Todos</button>
        </div>
      </div>

      {importResult && <p role="status" style={{ marginBottom: 14, color: "var(--fv-navy)", fontSize: ".85rem" }}>{importResult}</p>}
      <p style={{ margin: "-4px 0 14px", color: "var(--text-light)", fontSize: ".78rem" }}>
        Excel: columnas nombres, dni, telefono, direccion, plan, mensualidad y fecha_instalacion (opcional; formato AAAA-MM-DD). Para otra instalación del mismo DNI, marca servicio_adicional como SI. Acceso inicial: usuario y contraseña iguales al DNI.
      </p>
      <div className="client-status-legend" aria-label="Estados de pago">
        <span className="client-status-badge client-status-badge--overdue">Rojo: vencido</span>
        <span className="client-status-badge client-status-badge--due-soon">Amarillo: vence en 5 días</span>
        <span className="client-status-badge client-status-badge--current">Verde: al día</span>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 36 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-light)" }}>No se encontraron clientes.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((client) => {
            const paymentStatus = getPaymentStatus(client);
            return (
              <article key={client.id} className={`card client-status-card client-status-card--${paymentStatus.key}`}>
                <div className="client-list-main">
                  <div className="client-list-identity">
                    <div style={{ fontWeight: 700, color: "var(--fv-navy)" }}>{client.names}</div>
                    <div style={{ fontSize: ".8rem", color: "var(--text-light)", marginTop: 4 }}>
                      {client.contract?.contractNumber ?? "Sin contrato"} · S/ {client.contract?.monthlyAmount.toFixed(2) ?? "0.00"} / mes
                    </div>
                  </div>
                  <span className={`client-status-badge client-status-badge--${paymentStatus.key}`}>{paymentStatus.label}</span>
                  <div className="clients-full-details">
                    <span>DNI {client.dni}</span>
                    <span>{client.phone}</span>
                    <span>{client.internetPlan || "Sin plan"}</span>
                    <span>{client.address}</span>
                    <span>{getPaymentDateSummary(paymentStatus)}</span>
                  </div>
                  <div className="clients-mobile-summary">
                    {getPaymentDateSummary(paymentStatus)}
                  </div>
                  <div className="client-list-actions">
                    {client.contract && (
                      <Link href={`/seller/clientes/${client.contract.id}`} className="btn-outline" style={{ whiteSpace: "nowrap", textDecoration: "none", padding: "8px 10px" }}>
                        Ver ficha
                      </Link>
                    )}
                    <button type="button" className="btn-danger" onClick={() => void deleteClient(client)} aria-label={`Eliminar a ${client.names}`} style={{ padding: 9 }}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
