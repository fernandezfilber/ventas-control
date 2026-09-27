"use client";

import { useEffect, useState } from "react";
import "./globals.css";

interface UserInfo {
  id: number;
  username: string;
  role: string;
  fullName?: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  SELLER: "Asesor de Ventas",
  CLIENT: "Cliente",
  TECHNICIAN: "Técnico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUser(data))
      .catch(() => null);
  }, []);

  const displayName = user?.fullName || user?.username || "—";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <html lang="es">
      <head>
        <title>ForwardVision — Control de Ventas</title>
        <meta name="description" content="Sistema empresarial de control de ventas, contratos e instalaciones ForwardVision" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <div className="app-container">
          <header className="top-header">
            <div className="logo-area">
              <div className="logo-mark">FV</div>
              <div>
                <div style={{ fontWeight: 800, letterSpacing: "-.5px" }}>ForwardVision</div>
                <div style={{ fontSize: ".65rem", opacity: 0.6, fontWeight: 400, letterSpacing: ".5px", textTransform: "uppercase" }}>
                  Sistema de Ventas
                </div>
              </div>
            </div>
            {user && (
              <div className="user-profile">
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "1px" }}>
                  <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{displayName}</div>
                  <div style={{ fontSize: ".7rem", opacity: 0.65 }}>{ROLE_LABELS[user.role] || user.role}</div>
                </div>
                <div className="user-avatar">{initials || "U"}</div>
              </div>
            )}
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
