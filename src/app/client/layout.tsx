"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiHome, FiFileText, FiCreditCard, FiLogOut, FiLock } from "react-icons/fi";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
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
    { href: "/client", label: "Inicio", icon: <FiHome className="nav-icon" /> },
    { href: "/client/contrato", label: "Contrato", icon: <FiFileText className="nav-icon" /> },
    { href: "/client/pagos", label: "Pagos", icon: <FiCreditCard className="nav-icon" /> },
    { href: "/perfil", label: "Contraseña", icon: <FiLock className="nav-icon" /> },
  ];

  return (
    <div className="client-bg" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <main style={{ flex: 1, padding: "16px", paddingBottom: "80px", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
        {children}
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${pathname === item.href ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
        <button onClick={handleLogout} className="bottom-nav-item">
          <FiLogOut className="nav-icon" />
          <span>Salir</span>
        </button>
      </nav>
    </div>
  );
}
