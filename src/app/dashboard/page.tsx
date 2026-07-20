"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

type Sale = {
  id: number;
  correlativeId: string;
  dni: string;
  names: string;
  address: string;
  phone: string;
  locationLink: string;
  referencePhotos: string;
  status: "PENDING" | "REALIZED";
  sellerNameOrId: string;
  createdAt: string;
};

export default function DashboardVentas() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDni, setFilterDni] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const fetchSales = async () => {
    setLoading(true);
    try {
      let url = "/api/sales?";
      if (filterDni) url += `dni=${filterDni}&`;
      if (filterDate) url += `date=${filterDate}`;
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
  }, [filterDni, filterDate]);

  const handleStatusChange = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "PENDING" ? "REALIZED" : "PENDING";
    // We would need a PUT endpoint to update status. For now we simulate or implement it.
    try {
      await fetch(`/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchSales(); // reload
    } catch (e) {
      console.error(e);
      alert("Error al actualizar estado");
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Panel de Ventas (Instalaciones)</h2>
      
      <div className="card" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
          <label>Buscar por DNI</label>
          <input type="text" value={filterDni} onChange={(e) => setFilterDni(e.target.value)} placeholder="Ej: 7234..." />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
          <label>Filtrar por Fecha</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={fetchSales} style={{ width: 'auto' }}>🔄 Actualizar</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-light)', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>ID</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Fecha</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Cliente</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Vendedor</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Ubicación</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Estado</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>Cargando...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>No hay ventas registradas</td></tr>
            ) : (
              sales.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.correlativeId}</td>
                  <td style={{ padding: '12px' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>
                    <div>{s.names}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>DNI: {s.dni} | Cel: {s.phone}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{s.address}</div>
                  </td>
                  <td style={{ padding: '12px' }}>{s.sellerNameOrId}</td>
                  <td style={{ padding: '12px' }}>
                    <a href={s.locationLink} target="_blank" rel="noreferrer" style={{ color: '#1890ff', textDecoration: 'none' }}>
                      📍 Ver Mapa
                    </a>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                      background: s.status === 'PENDING' ? '#fff1f0' : '#f6ffed',
                      color: s.status === 'PENDING' ? '#f5222d' : '#52c41a',
                      border: `1px solid ${s.status === 'PENDING' ? '#ffa39e' : '#b7eb8f'}`
                    }}>
                      {s.status === 'PENDING' ? 'Pendiente' : 'Realizado'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button 
                      onClick={() => handleStatusChange(s.id, s.status)}
                      style={{
                        background: 'transparent', border: '1px solid var(--primary-color)',
                        color: 'var(--primary-color)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                      }}
                    >
                      {s.status === 'PENDING' ? '✓ Marcar Realizado' : '↺ Revertir'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
