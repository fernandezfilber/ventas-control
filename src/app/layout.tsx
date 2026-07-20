import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ventas y Asistencia",
  description: "Sistema de Control de Ventas de Internet/Cable y Asistencia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="app-container">
          <header className="top-header">
            <div className="logo-area">
              <div style={{background: '#f1c40f', padding: '5px', borderRadius: '4px', color: '#000'}}>▶</div>
              <span>Sistema Control</span>
            </div>
            <div className="user-profile">
              <div style={{
                background: '#fff', color: '#3b4b81', 
                width: '32px', height: '32px', 
                borderRadius: '50%', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold'
              }}>A</div>
              <div>
                <div style={{fontWeight: 600}}>admin</div>
                <div style={{fontSize: '0.75rem', opacity: 0.8}}>Founder</div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
