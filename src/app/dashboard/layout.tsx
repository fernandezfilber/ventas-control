"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiBarChart2, FiUsers, FiFileText, FiUserCheck, FiLogOut, FiArrowLeft, FiLock } from "react-icons/fi";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      alert("Error al cerrar sesión");
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Panel Principal", icon: <FiBarChart2 className="nav-icon" /> },
    { href: "/dashboard/contratos", label: "Contratos", icon: <FiFileText className="nav-icon" /> },
    { href: "/dashboard/usuarios", label: "Usuarios / Asesores", icon: <FiUsers className="nav-icon" /> },
    { href: "/dashboard/asistencia", label: "Control Asistencia", icon: <FiUserCheck className="nav-icon" /> },
    { href: "/dashboard/empleados", label: "Gestión Empleados", icon: <FiUsers className="nav-icon" /> },
  ];

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <div className="sidebar-section-label">Administración FV</div>
        
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${pathname === item.href ? "active" : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        <div className="sidebar-divider" style={{ marginTop: "auto" }}></div>
        
        <Link href="/" className="sidebar-item">
          <FiArrowLeft className="icon" /> Volver al Portal
        </Link>

        <Link href="/perfil" className="sidebar-item">
          <FiLock className="icon" /> Cambiar Contraseña
        </Link>
        
        <button onClick={handleLogout} className="sidebar-item" style={{ color: "var(--fv-red)" }}>
          <FiLogOut className="icon" /> Cerrar Sesión
        </button>
      </aside>
      
      <main className="content-area">
        {children}
      </main>

      {/* Mobile Nav for Admin */}
      <nav className="bottom-nav mobile-only">
        {navItems.slice(0,4).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${pathname === item.href ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
