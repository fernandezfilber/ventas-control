"use client";

import { useEffect, useState } from "react";

type Attendance = {
  id: number;
  userName: string;
  dni: string | null;
  photoUrl: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

type Employee = {
  id: number;
  name: string;
  dni: string;
  status: string;
};

function getAttendanceStatus(createdAt: string): { label: string; bg: string; border: string; textColor: string } {
  const date = new Date(createdAt);
  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (hours < 8 || (hours === 8 && minutes <= 5)) {
    return { label: '🟢 Puntual', bg: '#f6ffed', border: '#b7eb8f', textColor: '#389e0d' };
  }
  return { label: '🟡 Tardanza', bg: '#fffbe6', border: '#ffe58f', textColor: '#ad6800' };
}

export default function DashboardAsistencia() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState("");
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

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

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.filter((e: Employee) => e.status === 'APPROVED'));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [filterName, filterDate]);

  // Find absent employees (approved employees who didn't check in)
  const attendedDnis = new Set(attendances.map(a => a.dni).filter(Boolean));
  const absentEmployees = employees.filter(e => !attendedDnis.has(e.dni));

  // Counts
  const onTime = attendances.filter(a => {
    const d = new Date(a.createdAt);
    return d.getHours() < 8 || (d.getHours() === 8 && d.getMinutes() <= 5);
  }).length;
  const late = attendances.length - onTime;
  const absent = absentEmployees.length;

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Control de Asistencia</h2>
      
      {/* Summary */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '140px', background: '#f6ffed', borderLeft: '4px solid #52c41a', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#389e0d' }}>{onTime}</div>
          <div style={{ fontSize: '0.85rem', color: '#389e0d' }}>🟢 Puntuales</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '140px', background: '#fffbe6', borderLeft: '4px solid #faad14', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ad6800' }}>{late}</div>
          <div style={{ fontSize: '0.85rem', color: '#ad6800' }}>🟡 Tardanzas</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '140px', background: '#fff1f0', borderLeft: '4px solid #f5222d', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#cf1322' }}>{absent}</div>
          <div style={{ fontSize: '0.85rem', color: '#cf1322' }}>🔴 Faltas</div>
        </div>
      </div>

      {/* Filters */}
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

      {/* Absent employees */}
      {absentEmployees.length > 0 && (
        <div className="card" style={{ background: '#fff1f0', borderLeft: '4px solid #f5222d' }}>
          <h4 style={{ color: '#cf1322', marginBottom: '10px' }}>🔴 Empleados sin marcar asistencia</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {absentEmployees.map(e => (
              <span key={e.id} style={{
                padding: '5px 12px', background: '#fff', borderRadius: '20px',
                border: '1px solid #ffa39e', fontSize: '0.85rem', color: '#cf1322'
              }}>
                {e.name} (DNI: {e.dni})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-light)', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Estado</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Fecha y Hora</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Colaborador</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>DNI</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Ubicación GPS</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Foto</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>Cargando...</td></tr>
            ) : attendances.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>No hay registros de asistencia</td></tr>
            ) : (
              attendances.map(a => {
                const status = getAttendanceStatus(a.createdAt);
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)', background: status.bg }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                        background: status.bg, color: status.textColor, border: `1px solid ${status.border}`
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>{new Date(a.createdAt).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{new Date(a.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{a.userName}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{a.dni || '—'}</td>
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
                        <img src={a.photoUrl} alt="Asistencia" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.8rem' }}>Sin foto</span>
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
