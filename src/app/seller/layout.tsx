"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiHome, FiUsers, FiUserPlus, FiSettings, FiLogOut } from "react-icons/fi";

const NAV = [
  { href: "/seller", label: "Inicio", icon: <FiHome size={22} /> },
  { href: "/seller/clientes", label: "Clientes", icon: <FiUsers size={22} /> },
  { href: "/seller/clientes/nuevo", label: "Agregar", icon: <FiUserPlus size={22} /> },
  { href: "/perfil", label: "Perfil", icon: <FiSettings size={22} /> },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", paddingBottom: "80px" }}>
      {/* Top bar */}
      <div style={{
        background: "linear-gradient(135deg, #0f1b3d, #1e40af)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: "52px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 2px 8px rgba(0,0,0,.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800, fontSize: ".95rem" }}>
          <div style={{ background: "linear-gradient(135deg,#06b6d4,#10b981)", width: "30px", height: "30px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: ".8rem" }}>FV</div>
          ForwardVision
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", fontSize: ".8rem", display: "flex", alignItems: "center", gap: "4px" }}>
          <FiLogOut size={16} /> Salir
        </button>
      </div>

      {/* Content */}
      <main style={{ maxWidth: "700px", margin: "0 auto", padding: "16px" }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#fff",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-around",
        padding: "6px 0 calc(6px + env(safe-area-inset-bottom))",
        zIndex: 100,
        boxShadow: "0 -2px 12px rgba(0,0,0,.06)",
      }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/seller" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", color: active ? "#1e40af" : "#94a3b8", fontSize: ".65rem", fontWeight: active ? 700 : 500, minWidth: "56px", padding: "4px 0" }}>
                <div style={{ color: active ? "#1e40af" : "#94a3b8" }}>{item.icon}</div>
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
