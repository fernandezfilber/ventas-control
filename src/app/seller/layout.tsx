"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiPieChart, FiUsers, FiLogOut, FiLock } from "react-icons/fi";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
    { href: "/seller", label: "Métricas", icon: <FiPieChart className="nav-icon" /> },
    { href: "/seller/clientes", label: "Mis Clientes", icon: <FiUsers className="nav-icon" /> },
    { href: "/perfil", label: "Contraseña", icon: <FiLock className="nav-icon" /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <main style={{ flex: 1, padding: "20px", paddingBottom: "90px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        {children}
      </main>

      <nav className="bottom-nav" style={{ display: "flex", background: "#fff", borderTop: "1px solid #e2e8f0" }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${pathname === item.href ? "active" : ""}`}
            style={{ color: pathname === item.href ? "var(--fv-blue)" : "#64748b" }}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
        <button onClick={handleLogout} className="bottom-nav-item" style={{ color: "#ef4444" }}>
          <FiLogOut className="nav-icon" />
          <span>Salir</span>
        </button>
      </nav>
    </div>
  );
}
