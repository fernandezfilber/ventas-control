"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { FiDownload, FiSearch, FiTrash2, FiUpload, FiUserPlus } from "react-icons/fi";

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
    receipts: { id: number; status: string }[];
  } | null;
}

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const valueFor = (row: Record<string, unknown>, aliases: string[]) => {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, ""), value])
  );
  const key = aliases.find((alias) => normalized[alias] !== undefined);
  return key ? String(normalized[key] ?? "").trim() : "";
};

export default function SellerClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const loadClients = async () => {
    try {
      const query = month === "all" ? "" : `?month=${encodeURIComponent(month)}`;
      const response = await fetch(`/api/clients${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No se pudieron cargar los clientes.");
      setClients(data);
    } catch (error) {
      setImportResult(error instanceof Error ? error.message : "Error al cargar clientes.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const query = month === "all" ? "" : `?month=${encodeURIComponent(month)}`;
    fetch(`/api/clients${query}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudieron cargar los clientes.");
        return data as ClientRecord[];
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
  }, [month]);

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
          internetPlan: valueFor(row, ["plan", "internetplan"]),
          monthlyAmount: valueFor(row, ["mensualidad", "montomensual", "monthlyamount", "monto"]),
        };
        const response = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          created += 1;
        } else {
          const result = await response.json();
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
    const result = await response.json();
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) minmax(180px, 240px)", gap: 10, marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <FiSearch style={{ position: "absolute", left: 13, top: 14, color: "var(--text-light)" }} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, DNI o contrato" aria-label="Buscar clientes" style={{ width: "100%", padding: "12px 12px 12px 38px", border: "1px solid var(--border-color)", borderRadius: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input aria-label="Filtrar ventas por mes" type="month" value={month === "all" ? "" : month} onChange={(event) => { setLoading(true); setMonth(event.target.value || currentMonth()); }} style={{ minWidth: 0, flex: 1, padding: 11, border: "1px solid var(--border-color)", borderRadius: 10, background: "#fff" }} />
          <button type="button" className="btn-outline" onClick={() => setMonth("all")} style={{ whiteSpace: "nowrap", padding: "8px 10px" }}>Todos</button>
        </div>
      </div>

      {importResult && <p role="status" style={{ marginBottom: 14, color: "var(--fv-navy)", fontSize: ".85rem" }}>{importResult}</p>}
      <p style={{ margin: "-4px 0 14px", color: "var(--text-light)", fontSize: ".78rem" }}>
        Excel: columnas nombres, dni, telefono, direccion, plan y mensualidad. Acceso inicial del cliente: usuario y contraseña iguales al DNI.
      </p>
      {loading ? (
        <div style={{ textAlign: "center", padding: 36 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-light)" }}>No se encontraron clientes.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((client) => (
            <article key={client.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, margin: 0, padding: 15 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--fv-navy)" }}>{client.names}</div>
                <div style={{ fontSize: ".8rem", color: "var(--text-light)", marginTop: 4 }}>DNI {client.dni} · {client.phone} · {client.internetPlan || "Sin plan"}</div>
                <div style={{ fontSize: ".8rem", color: "var(--text-light)", marginTop: 3 }}>
                  {client.contract?.contractNumber ?? "Sin contrato"} · S/ {client.contract?.monthlyAmount.toFixed(2) ?? "0.00"} / mes
                </div>
              </div>
              {client.contract && (
                <Link href={`/seller/clientes/${client.contract.id}`} className="btn-outline" style={{ whiteSpace: "nowrap", textDecoration: "none", padding: "8px 10px" }}>
                  Ver ficha
                </Link>
              )}
              <button type="button" className="btn-danger" onClick={() => void deleteClient(client)} aria-label={`Eliminar a ${client.names}`} style={{ padding: 9 }}>
                <FiTrash2 />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
