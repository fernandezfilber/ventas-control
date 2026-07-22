"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        router.push("/dashboard");
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
    <div className="main-layout" style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg-light)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔐</div>
          <h1 style={{ color: 'var(--primary-color)', fontSize: '1.5rem', marginBottom: '5px' }}>Acceso Administrativo</h1>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Ingrese sus credenciales</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--accent-red)',
            color: '#c00',
            padding: '10px 15px',
            borderRadius: '5px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            border: '1px solid #ffa39e'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ padding: '12px', fontSize: '1rem', marginTop: '10px' }}
          >
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/" style={{ color: 'var(--text-light)', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Volver al Portal
          </a>
        </div>
      </div>
    </div>
  );
}
