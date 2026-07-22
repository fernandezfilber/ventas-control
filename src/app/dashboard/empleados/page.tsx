"use client";

import { useEffect, useState } from "react";

type Employee = {
  id: number;
  name: string;
  dni: string;
  status: string;
  createdAt: string;
};

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchEmployees();
    } catch (e) {
      console.error(e);
      alert('Error al actualizar estado');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    try {
      await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      fetchEmployees();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar empleado');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#f6ffed', color: '#389e0d', border: '#b7eb8f', label: '✅ Aprobado' };
      case 'BLOCKED':
        return { bg: '#fff1f0', color: '#cf1322', border: '#ffa39e', label: '🚫 Bloqueado' };
      default:
        return { bg: '#fffbe6', color: '#ad6800', border: '#ffe58f', label: '⏳ Pendiente' };
    }
  };

  const pending = employees.filter(e => e.status === 'PENDING');
  const approved = employees.filter(e => e.status === 'APPROVED');
  const blocked = employees.filter(e => e.status === 'BLOCKED');

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Gestión de Empleados</h2>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '140px', background: '#fffbe6', borderLeft: '4px solid #faad14', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ad6800' }}>{pending.length}</div>
          <div style={{ fontSize: '0.85rem', color: '#ad6800' }}>⏳ Pendientes</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '140px', background: '#f6ffed', borderLeft: '4px solid #52c41a', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#389e0d' }}>{approved.length}</div>
          <div style={{ fontSize: '0.85rem', color: '#389e0d' }}>✅ Aprobados</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '140px', background: '#fff1f0', borderLeft: '4px solid #f5222d', padding: '15px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#cf1322' }}>{blocked.length}</div>
          <div style={{ fontSize: '0.85rem', color: '#cf1322' }}>🚫 Bloqueados</div>
        </div>
      </div>

      {/* Pending employees alert */}
      {pending.length > 0 && (
        <div className="card" style={{ background: '#fffbe6', borderLeft: '4px solid #faad14', marginBottom: '15px' }}>
          <h4 style={{ color: '#ad6800', marginBottom: '10px' }}>⏳ Empleados pendientes de aprobación</h4>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>Estos empleados se registraron y están esperando ser aprobados para marcar asistencia.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pending.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '10px 15px', borderRadius: '6px', border: '1px solid #ffe58f' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{e.name}</span>
                  <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#666' }}>DNI: {e.dni}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleStatusChange(e.id, 'APPROVED')}
                    style={{ background: '#52c41a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    onClick={() => handleStatusChange(e.id, 'BLOCKED')}
                    style={{ background: '#f5222d', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
                  >
                    ✕ Bloquear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All employees table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-light)', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Nombre</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>DNI</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Estado</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Fecha Registro</th>
              <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>Cargando...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>No hay empleados registrados</td></tr>
            ) : (
              employees.map(e => {
                const badge = getStatusBadge(e.status);
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{e.name}</td>
                    <td style={{ padding: '12px' }}>{e.dni}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                        background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {e.status !== 'APPROVED' && (
                          <button onClick={() => handleStatusChange(e.id, 'APPROVED')}
                            style={{ background: '#52c41a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            ✓ Aprobar
                          </button>
                        )}
                        {e.status !== 'BLOCKED' && (
                          <button onClick={() => handleStatusChange(e.id, 'BLOCKED')}
                            style={{ background: '#faad14', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            🚫 Bloquear
                          </button>
                        )}
                        <button onClick={() => handleDelete(e.id, e.name)}
                          style={{ background: '#f5222d', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                          🗑️ Eliminar
                        </button>
                      </div>
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
