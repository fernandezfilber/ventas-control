"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: "/dashboard",
  SELLER: "/seller",
  CLIENT: "/client",
  TECHNICIAN: "/",
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const requestedRoute = new URLSearchParams(window.location.search).get("next");
        const route = requestedRoute?.startsWith("/") && !requestedRoute.startsWith("//")
          ? requestedRoute
          : ROLE_ROUTES[data.user?.role] || "/dashboard";
        router.push(route);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || "Error al iniciar sesión");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0f1e 0%, #0f1b3d 50%, #071428 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "var(--font-family)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255,255,255,.07)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: "24px",
          padding: "40px 32px",
          boxShadow: "0 24px 80px rgba(0,0,0,.5)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "linear-gradient(135deg, #06b6d4, #10b981)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "#fff",
              boxShadow: "0 8px 24px rgba(6,182,212,.4)",
            }}
          >
            FV
          </div>
          <h1 style={{ color: "#f8fafc", fontSize: "1.5rem", fontWeight: 800, marginBottom: "6px" }}>
            ForwardVision
          </h1>
          <p style={{ color: "#94a3b8", fontSize: ".875rem" }}>Ingresa tus credenciales para continuar</p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,.15)",
              border: "1px solid rgba(239,68,68,.3)",
              color: "#fca5a5",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: ".875rem",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#cbd5e1", fontWeight: 600, fontSize: ".85rem" }}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario"
              required
              autoFocus
              style={{
                width: "100%",
                padding: "13px 16px",
                background: "rgba(255,255,255,.08)",
                border: "1.5px solid rgba(255,255,255,.12)",
                borderRadius: "12px",
                color: "#f8fafc",
                fontSize: ".9rem",
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color .2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(6,182,212,.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.12)")}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#cbd5e1", fontWeight: 600, fontSize: ".85rem" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "13px 16px",
                background: "rgba(255,255,255,.08)",
                border: "1.5px solid rgba(255,255,255,.12)",
                borderRadius: "12px",
                color: "#f8fafc",
                fontSize: ".9rem",
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color .2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(6,182,212,.6)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.12)")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#374151" : "linear-gradient(135deg, #1e40af, #06b6d4)",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "1rem",
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity .2s, transform .1s",
              boxShadow: "0 4px 16px rgba(30,64,175,.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Ingresando...
              </>
            ) : (
              "Iniciar Sesión →"
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link href="/" style={{ color: "#64748b", fontSize: ".8rem", textDecoration: "none" }}>
            ← Volver al Portal de Trabajadores
          </Link>
        </div>
      </div>
    </div>
  );
}
