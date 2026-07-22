"use client";

import { useEffect, useState } from "react";

type Sale = {
  id: number;
  correlativeId: string;
  clientId: string | null;
  dni: string;
  names: string;
  address: string;
  phone: string;
  locationLink: string;
  referencePhotos: string;
  installationDate: string | null;
  installationTimeRange: string | null;
  internetPlan: string | null;
  details: string | null;
  status: string;
  sellerNameOrId: string;
  installedAt: string | null;
  createdAt: string;
};

function getSaleColor(sale: Sale): { bg: string; border: string; label: string; textColor: string } {
  if (sale.status === 'INSTALLED') {
    return { bg: '#f6ffed', border: '#b7eb8f', label: '✅ Instalada', textColor: '#389e0d' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const createdDate = new Date(sale.createdAt);
  createdDate.setHours(0, 0, 0, 0);
  
  if (createdDate.getTime() < today.getTime()) {
    return { bg: '#fffbe6', border: '#ffe58f', label: '⚠️ Pendiente vencida', textColor: '#ad6800' };
  }
  return { bg: '#fff1f0', border: '#ffa39e', label: '🔴 No instalada', textColor: '#cf1322' };
}

export default function DashboardVentas() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDni, setFilterDni] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchSales = async () => {
    setLoading(true);
    try {
      let url = "/api/sales?";
      if (filterDni) url += `dni=${filterDni}&`;
      if (filterDate) url += `date=${filterDate}&`;
      if (filterStatus) url += `status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setSales(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [filterDni, filterDate, filterStatus]);

  const handleMarkInstalled = async (sale: Sale) => {
    const clientId = prompt('Ingrese el ID de Cliente (código de caja):', sale.clientId || '');
    if (clientId === null) return; // cancelled

    try {
      await fetch(`/api/sales/${sale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INSTALLED', clientId: clientId || null }),
      });
      fetchSales();
    } catch (e) {
      console.error(e);
      alert('Error al actualizar estado');
    }
  };

  const handleRevert = async (sale: Sale) => {
    if (!confirm('¿Revertir a pendiente?')) return;
    try {
      await fetch(`/api/sales/${sale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING' }),
      });
      fetchSales();
    } catch (e) {
      console.error(e);
      alert('Error al actualizar estado');
    }
  };

  // Summary counts
  const installed = sales.filter(s => s.status === 'INSTALLED').length;
  const pendingToday = sales.filter(s => {
    if (s.status !== 'PENDING') return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const created = new Date(s.createdAt); created.setHours(0,0,0,0);
    return created.getTime() >= today.getTime();
  }).length;
  const overdue = sales.filter(s => {
    if (s.status !== 'PENDING') return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const created = new Date(s.createdAt); created.setHours(0,0,0,0);
    return created.getTime() < today.getTime();
  }).length;

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Panel de Ventas (Instalaciones)</h2>
      
      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '150px', background: '#f6ffed', borderLeft: '4px solid #52c41a', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#389e0d' }}>{installed}</div>
          <div style={{ fontSize: '0.85rem', color: '#389e0d' }}>✅ Instaladas</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '150px', background: '#fff1f0', borderLeft: '4px solid #f5222d', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#cf1322' }}>{pendingToday}</div>
          <div style={{ fontSize: '0.85rem', color: '#cf1322' }}>🔴 Pendientes hoy</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '150px', background: '#fffbe6', borderLeft: '4px solid #faad14', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ad6800' }}>{overdue}</div>
          <div style={{ fontSize: '0.85rem', color: '#ad6800' }}>⚠️ Vencidas</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
          <label>Buscar por DNI</label>
          <input type="text" value={filterDni} onChange={(e) => setFilterDni(e.target.value)} placeholder="Ej: 7234..." />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
          <label>Filtrar por Fecha</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
          <label>Estado</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '5px', fontFamily: 'inherit' }}>
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="INSTALLED">Instalada</option>
          </select>
        </div>
        <button className="btn-primary" onClick={fetchSales} style={{ width: 'auto' }}>🔄 Actualizar</button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-light)', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>ID</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>ID Cliente</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Fecha Registro</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Cliente</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Instalación Sugerida</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Vendedor</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Ubicación</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Estado</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center' }}>Cargando...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center' }}>No hay ventas registradas</td></tr>
            ) : (
              sales.map(s => {
                const color = getSaleColor(s);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', background: color.bg }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.correlativeId}</td>
                    <td style={{ padding: '12px' }}>
                      {s.clientId ? (
                        <span style={{ padding: '3px 8px', background: '#e6f7ff', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, color: '#0050b3' }}>
                          📦 {s.clientId}
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{new Date(s.createdAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(s.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>{s.names}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>DNI: {s.dni} | Cel: {s.phone}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{s.address}</div>
                      {s.internetPlan && <div style={{ fontSize: '0.8rem', color: '#0050b3', marginTop: '4px', fontWeight: 500 }}>Plan: {s.internetPlan}</div>}
                      {s.details && <div style={{ fontSize: '0.8rem', color: '#d46b08', marginTop: '2px' }}>Info: {s.details}</div>}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 500, color: '#333' }}>{s.installationDate || 'No definida'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{s.installationTimeRange || '—'}</div>
                    </td>
                    <td style={{ padding: '12px' }}>{s.sellerNameOrId}</td>
                    <td style={{ padding: '12px' }}>
                      <a href={s.locationLink} target="_blank" rel="noreferrer" style={{ color: '#1890ff', textDecoration: 'none' }}>
                        📍 Ver Mapa
                      </a>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                        background: color.bg, color: color.textColor, border: `1px solid ${color.border}`
                      }}>
                        {color.label}
                      </span>
                      {s.installedAt && (
                        <div style={{ fontSize: '0.75rem', color: '#389e0d', marginTop: '4px' }}>
                          {new Date(s.installedAt).toLocaleDateString()} {new Date(s.installedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {s.status === 'PENDING' ? (
                        <button
                          onClick={() => handleMarkInstalled(s)}
                          style={{
                            background: '#52c41a', border: 'none',
                            color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 500
                          }}
                        >
                          ✓ Marcar Instalada
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRevert(s)}
                          style={{
                            background: 'transparent', border: '1px solid #999',
                            color: '#666', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          ↺ Revertir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
