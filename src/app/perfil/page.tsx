"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiLock } from "react-icons/fi";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (data.newPassword !== data.confirmPassword) {
      alert("Las nuevas contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      });
      if (res.ok) {
        alert("Contraseña actualizada exitosamente.");
        setData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        router.back();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch {
      alert("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-layout" style={{ justifyContent: 'center', background: 'var(--bg-light)', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-light)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "0 0 20px 0", fontSize: "0.9rem", fontWeight: 600 }}>
          <FiArrowLeft /> Volver
        </button>

        <h2 style={{ marginBottom: '20px', color: 'var(--fv-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiLock /> Cambiar Contraseña
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Contraseña Actual</label>
            <input type="password" name="currentPassword" required value={data.currentPassword} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Nueva Contraseña (mínimo 8 caracteres)</label>
            <input type="password" name="newPassword" required minLength={8} value={data.newPassword} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Confirmar Nueva Contraseña</label>
            <input type="password" name="confirmPassword" required value={data.confirmPassword} onChange={handleChange} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
