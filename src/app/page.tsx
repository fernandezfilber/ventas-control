import Link from "next/link";

export default function Home() {
  return (
    <div className="main-layout" style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg-light)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '30px' }}>
        <h1 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Portal de Trabajadores</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Link href="/ventas/nueva" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '15px', fontSize: '1.1rem' }}>
              📝 Registrar Nueva Venta
            </button>
          </Link>

          <Link href="/asistencia" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ padding: '15px', fontSize: '1.1rem', backgroundColor: '#28a745' }}>
              📍 Marcar Asistencia
            </button>
          </Link>
        </div>

        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
          <Link href="/login" style={{ color: 'var(--text-light)', fontSize: '0.9rem', textDecoration: 'none' }}>
            🔐 Acceso Administrativo
          </Link>
        </div>
      </div>
    </div>
  );
}
