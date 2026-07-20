"use client";

import { useEffect, useState } from "react";

type Attendance = {
  id: number;
  userName: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

export default function DashboardAsistencia() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      let url = "/api/attendance?";
      if (filterName) url += `name=${filterName}&`;
      if (filterDate) url += `date=${filterDate}`;
      const res = await fetch(url);
      const data = await res.json();
      setAttendances(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, [filterName, filterDate]);

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Control de Asistencia</h2>
      
      <div className="card" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
          <label>Buscar por Nombre</label>
          <input type="text" value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="Ej: Carlos" />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
          <label>Filtrar por Fecha</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={fetchAttendances} style={{ width: 'auto' }}>🔄 Actualizar</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-light)', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Fecha y Hora</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Colaborador</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Ubicación GPS</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Foto Capturada</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Cargando...</td></tr>
            ) : attendances.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>No hay registros de asistencia</td></tr>
            ) : (
              attendances.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>{new Date(a.createdAt).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(a.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{a.userName}</td>
                  <td style={{ padding: '12px' }}>
                    <a 
                      href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ color: '#1890ff', textDecoration: 'none' }}
                    >
                      📍 {a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}
                    </a>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {a.photoUrl ? (
                      <img src={a.photoUrl} alt="Asistencia" style={{ width: '100px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    ) : (
                      <span style={{ color: '#999', fontSize: '0.8rem' }}>Sin foto</span>
                    )}
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
