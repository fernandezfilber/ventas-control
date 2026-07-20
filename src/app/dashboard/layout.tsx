import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="main-layout" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <aside className="sidebar">
        <div className="card" style={{ background: '#e6f7ff', borderLeft: '4px solid #1890ff' }}>
          <h4 style={{ marginBottom: '10px', color: '#0050b3' }}>Menú Principal</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li>
              <Link href="/dashboard" style={{ textDecoration: 'none', color: '#333', fontWeight: 500, display: 'block', padding: '8px', background: '#fff', borderRadius: '4px' }}>
                📊 Resumen Ventas
              </Link>
            </li>
            <li>
              <Link href="/dashboard/asistencia" style={{ textDecoration: 'none', color: '#333', fontWeight: 500, display: 'block', padding: '8px', background: '#fff', borderRadius: '4px' }}>
                👥 Control Asistencia
              </Link>
            </li>
          </ul>
        </div>

        <div className="card" style={{ background: '#fff7e6', borderLeft: '4px solid #faad14' }}>
          <h4 style={{ marginBottom: '5px', color: '#ad6800', fontSize: '0.9rem' }}>Estado Actual</h4>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>Mostrando datos en tiempo real.</p>
        </div>
        
        <div style={{ marginTop: 'auto' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ backgroundColor: '#6c757d' }}>← Volver al Portal</button>
          </Link>
        </div>
      </aside>
      
      <main className="content-area" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
