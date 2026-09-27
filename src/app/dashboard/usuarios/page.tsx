"use client";

import { useEffect, useState } from "react";
import { FiUserPlus, FiUsers, FiX } from "react-icons/fi";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "SELLER"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    // Auto-fill password with username if not provided
    const payload = {
      ...newUser,
      password: newUser.password || newUser.username
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Usuario creado exitosamente.");
        setShowModal(false);
        setNewUser({ username: "", password: "", fullName: "", role: "SELLER" });
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch {
      alert("Error de red");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--fv-navy)" }}>Gestión de Usuarios</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ width: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <FiUserPlus /> Nuevo Usuario
        </button>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="fv-table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Usuario (Login)</th>
              <th>Rol</th>
              <th>Fecha Creación</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px" }}><div className="spinner" style={{ borderTopColor: "var(--fv-blue)" }}/></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>No hay usuarios</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: "var(--fv-navy)" }}>{u.fullName || "—"}</td>
                  <td>{u.username}</td>
                  <td>
                    <span className="badge" style={{ background: "rgba(30,64,175,.1)", color: "var(--fv-blue)" }}>
                      {u.role === "SELLER" ? "Asesor de Ventas" : u.role === "CLIENT" ? "Cliente" : u.role}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--fv-navy)" }}>Registrar Nuevo Usuario</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--text-light)" }}><FiX /></button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Rol</label>
                <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                  <option value="SELLER">Asesor de Ventas</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="TECHNICIAN">Técnico</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nombre Completo</label>
                <input required type="text" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} placeholder="Ej: Maria Lopez" />
              </div>

              <div className="form-group">
                <label>Usuario (DNI recomendado)</label>
                <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="Ej: 71234567" />
              </div>

              <div className="form-group">
                <label>Contraseña (Opcional)</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Si dejas vacío, será igual al usuario" />
                <div style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "4px" }}>
                  Por defecto, la contraseña será igual al usuario ingresado.
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: "16px" }}>
                {creating ? "Registrando..." : "Registrar Usuario"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
