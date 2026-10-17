"use client";

import Link from "next/link";
import { FiFileText, FiUsers, FiDollarSign, FiMessageSquare, FiDownload, FiShield, FiArrowRight, FiCheckCircle } from "react-icons/fi";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#f8fafc", fontFamily: "Inter, sans-serif" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "60px 20px 40px", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: "rgba(6,182,212,.12)", border: "1px solid rgba(6,182,212,.3)", borderRadius: "99px", padding: "6px 16px", fontSize: ".8rem", color: "#06b6d4", marginBottom: "24px", fontWeight: 600 }}>
          <FiShield size={14} /> Sistema Empresarial ForwardVision
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.2rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: "20px" }}>
          Control total de<br />
          <span style={{ background: "linear-gradient(135deg, #06b6d4, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ventas y contratos
          </span>
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#94a3b8", lineHeight: 1.7, marginBottom: "32px" }}>
          Plataforma para gestionar clientes de internet, contratos, mensualidades, pagos y recordatorios manuales por WhatsApp.
        </p>
        <Link href="/login">
          <button style={{ background: "linear-gradient(135deg, #1e40af, #06b6d4)", border: "none", color: "#fff", padding: "16px 36px", borderRadius: "12px", fontSize: "1.05rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px", boxShadow: "0 8px 24px rgba(6,182,212,.35)" }}>
            Iniciar Sesión <FiArrowRight />
          </button>
        </Link>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,.07)", margin: "0 20px" }} />

      {/* Roles */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "50px 20px" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: 700, marginBottom: "32px", color: "#e2e8f0" }}>¿Cómo funciona?</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>

          {/* Admin */}
          <div style={{ background: "rgba(30,64,175,.12)", border: "1px solid rgba(30,64,175,.3)", borderRadius: "16px", padding: "24px" }}>
            <div style={{ width: "44px", height: "44px", background: "rgba(30,64,175,.25)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", fontSize: "1.3rem" }}>👑</div>
            <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#3b82f6", marginBottom: "8px" }}>Administrador</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "12px" }}>Control total</h3>
            {["Ver ventas de todos los asesores", "Filtrar por mes y día", "Gestión de asesores", "Estadísticas globales"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: ".85rem", color: "#94a3b8", marginBottom: "6px" }}>
                <FiCheckCircle size={14} color="#3b82f6" />{f}
              </div>
            ))}
          </div>

          {/* Asesor */}
          <div style={{ background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)", borderRadius: "16px", padding: "24px" }}>
            <div style={{ width: "44px", height: "44px", background: "rgba(16,185,129,.2)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", fontSize: "1.3rem" }}>🧑‍💼</div>
            <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#10b981", marginBottom: "8px" }}>Asesor de Ventas</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "12px" }}>Gestión de clientes</h3>
            {["Registrar y editar clientes", "Confirmar pagos", "Enviar recordatorios manuales por WhatsApp", "Importar Excel y descargar PDF", "Consultar ventas por mes"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: ".85rem", color: "#94a3b8", marginBottom: "6px" }}>
                <FiCheckCircle size={14} color="#10b981" />{f}
              </div>
            ))}
          </div>

          {/* Cliente */}
          <div style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", borderRadius: "16px", padding: "24px" }}>
            <div style={{ width: "44px", height: "44px", background: "rgba(245,158,11,.15)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", fontSize: "1.3rem" }}>👤</div>
            <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#f59e0b", marginBottom: "8px" }}>Cliente</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "12px" }}>Portal personal</h3>
            {["Ver su contrato activo", "Firmar digitalmente", "Descargar contrato en PDF", "Ver estado de pagos", "Próxima fecha de pago"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: ".85rem", color: "#94a3b8", marginBottom: "6px" }}>
                <FiCheckCircle size={14} color="#f59e0b" />{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ background: "rgba(255,255,255,.03)", padding: "50px 20px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: 700, marginBottom: "32px", color: "#e2e8f0" }}>Funcionalidades clave</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            {[
              { icon: <FiFileText />, title: "Contrato PDF", desc: "Condiciones visibles, firmas digitales y descarga para el cliente." },
              { icon: <FiMessageSquare color="#25d366" />, title: "WhatsApp", desc: "Mensaje de pago preparado para que el asesor lo revise y lo envíe manualmente." },
              { icon: <FiDownload />, title: "Excel & PDF", desc: "Importa clientes desde Excel y descarga reportes en PDF con un clic." },
              { icon: <FiDollarSign color="#10b981" />, title: "Control de Pagos", desc: "Gestiona pagos mensuales, confirma recibos y ve el historial completo." },
            ].map((f, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.05)", borderRadius: "14px", padding: "20px" }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "10px" }}>{f.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: ".95rem" }}>{f.title}</div>
                <div style={{ fontSize: ".82rem", color: "#94a3b8", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div style={{ textAlign: "center", padding: "50px 20px" }}>
        <p style={{ color: "#64748b", marginBottom: "20px", fontSize: ".9rem" }}>¿Ya tienes acceso? Inicia sesión con tus credenciales.</p>
        <Link href="/login">
          <button style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,.2)", color: "#f8fafc", padding: "12px 28px", borderRadius: "10px", fontSize: ".9rem", fontWeight: 600, cursor: "pointer" }}>
            Iniciar Sesión →
          </button>
        </Link>
        <div style={{ marginTop: "40px", color: "#334155", fontSize: ".75rem" }}>
          © {new Date().getFullYear()} ForwardVision · Sistema de Control Empresarial
        </div>
      </div>

    </div>
  );
}
