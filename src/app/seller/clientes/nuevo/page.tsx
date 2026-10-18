"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/lib/http";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState({
    names: "",
    dni: "",
    phone: "",
    installationDate: "",
    address: "",
    locationLink: "",
    internetPlan: "",
    monthlyAmount: "",
    details: "",
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      });
      const result = (await readJsonResponse<{ message?: string }>(response)) ?? {};
      if (!response.ok) {
        setError(result.message || "No se pudo registrar el cliente.");
        return;
      }
      window.alert(`Cliente registrado. Usuario y contraseña inicial: ${client.dni}. Recomienda cambiar la contraseña al ingresar.`);
      router.push("/seller/clientes");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: keyof typeof client, value: string) => {
    setClient((current) => ({ ...current, [field]: value }));
  };

  return (
    <main style={{ maxWidth: 680, width: "100%", margin: "0 auto", padding: "8px 0 24px" }}>
      <div className="card">
        <h1 style={{ color: "var(--fv-navy)", fontSize: "1.45rem", marginBottom: 6 }}>Registrar cliente</h1>
        <p style={{ color: "var(--text-light)", fontSize: ".9rem", marginBottom: 20 }}>
          Se creará su acceso, el contrato y el cronograma de tres mensualidades.
        </p>

        {error && <div role="alert" style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "#fef2f2", color: "#b91c1c" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="names">Nombre completo</label>
            <input id="names" required autoComplete="name" value={client.names} onChange={(event) => setField("names", event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="dni">DNI</label>
            <input id="dni" required inputMode="numeric" maxLength={12} value={client.dni} onChange={(event) => setField("dni", event.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Celular</label>
            <input id="phone" required type="tel" autoComplete="tel" value={client.phone} onChange={(event) => setField("phone", event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="installationDate">Fecha real de instalación</label>
            <input id="installationDate" required type="date" value={client.installationDate} onChange={(event) => setField("installationDate", event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="address">Dirección del servicio</label>
            <input id="address" required autoComplete="street-address" value={client.address} onChange={(event) => setField("address", event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="internetPlan">Plan contratado</label>
            <input id="internetPlan" required value={client.internetPlan} onChange={(event) => setField("internetPlan", event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="monthlyAmount">Mensualidad (S/)</label>
            <input id="monthlyAmount" required type="number" inputMode="decimal" min="0.01" step="0.01" value={client.monthlyAmount} onChange={(event) => setField("monthlyAmount", event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="locationLink">Ubicación en mapa (opcional)</label>
            <input id="locationLink" type="url" inputMode="url" placeholder="https://maps.google.com/..." value={client.locationLink} onChange={(event) => setField("locationLink", event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="details">Notas (opcional)</label>
            <textarea id="details" value={client.details} onChange={(event) => setField("details", event.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ width: "auto", flex: 1, minWidth: 170 }}>
              {saving ? "Guardando..." : "Registrar cliente"}
            </button>
            <button type="button" className="btn-outline" onClick={() => router.push("/seller/clientes")} style={{ flex: 1, minWidth: 120 }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
