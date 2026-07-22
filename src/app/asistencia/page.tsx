"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type EmployeeCheckResult = {
  status: string;
  employee?: { id: number; name: string; dni: string; status: string };
  message?: string;
};

export default function Asistencia() {
  const router = useRouter();
  const [step, setStep] = useState<'dni' | 'register' | 'pending' | 'blocked' | 'capture' | 'done'>('dni');
  const [dniInput, setDniInput] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef) {
      streamRef.getTracks().forEach(track => track.stop());
      setStreamRef(null);
    }
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, [streamRef]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamRef(stream);
    } catch {
      alert("No se pudo acceder a la cámara.");
    }
  };

  const handleCheckDni = async () => {
    if (!dniInput.trim()) {
      alert("Ingrese su DNI");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/employees/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: dniInput.trim() }),
      });
      const data: EmployeeCheckResult = await res.json();

      if (data.status === 'NOT_FOUND') {
        setStep('register');
      } else if (data.status === 'PENDING') {
        setStep('pending');
      } else if (data.status === 'BLOCKED') {
        setStep('blocked');
      } else if (data.status === 'APPROVED') {
        setEmployeeName(data.employee?.name || '');
        setStep('capture');
        setTimeout(() => startCamera(), 100);
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName.trim()) {
      alert("Ingrese su nombre");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: registerName.trim(), dni: dniInput.trim() }),
      });
      if (res.ok || res.status === 409) {
        setStep('pending');
      } else {
        const data = await res.json();
        alert(data.message || "Error al registrar");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const capturePhotoAndSave = () => {
    // Capture photo
    let capturedPhoto = '';
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = 300;
      canvasRef.current.height = 225;
      context?.drawImage(videoRef.current, 0, 0, 300, 225);
      capturedPhoto = canvasRef.current.toDataURL("image/jpeg", 0.7);
      setPhotoUrl(capturedPhoto);
    }

    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocationStr(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);

          try {
            const res = await fetch("/api/attendance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userName: employeeName,
                dni: dniInput.trim(),
                photoUrl: capturedPhoto,
                latitude,
                longitude,
              }),
            });
            if (res.ok) {
              stopCamera();
              setStep('done');
            } else {
              const data = await res.json();
              alert(data.message || "Error al guardar asistencia.");
            }
          } catch {
            alert("Error de red");
          } finally {
            setLoading(false);
          }
        },
        () => {
          alert("Error al obtener ubicación. Asegúrese de dar permisos.");
          setLoading(false);
        }
      );
    } else {
      alert("Geolocalización no soportada.");
    }
  };

  return (
    <div className="main-layout" style={{ justifyContent: 'center', background: 'var(--bg-light)', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', margin: '0 auto', padding: '30px' }}>
        
        {/* Step 1: Enter DNI */}
        {step === 'dni' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📋</div>
            <h2 style={{ marginBottom: '5px', color: 'var(--primary-color)' }}>Control de Asistencia</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '25px' }}>Ingrese su DNI para continuar</p>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>DNI</label>
              <input
                type="text"
                value={dniInput}
                onChange={(e) => setDniInput(e.target.value)}
                placeholder="Ej: 72345678"
                maxLength={8}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCheckDni()}
              />
            </div>
            <button className="btn-primary" onClick={handleCheckDni} disabled={loading} style={{ padding: '12px', fontSize: '1rem' }}>
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </div>
        )}

        {/* Step: Register */}
        {step === 'register' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📝</div>
            <h2 style={{ marginBottom: '5px', color: 'var(--primary-color)' }}>Registro de Empleado</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '25px' }}>No estás registrado. Completa tus datos para solicitar acceso.</p>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>DNI</label>
              <input type="text" value={dniInput} disabled style={{ background: '#f5f5f5' }} />
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Nombre Completo</label>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Ej: Doris María"
                autoFocus
              />
            </div>
            <button className="btn-primary" onClick={handleRegister} disabled={loading} style={{ padding: '12px', fontSize: '1rem' }}>
              {loading ? 'Registrando...' : 'Solicitar Acceso'}
            </button>
            <div style={{ marginTop: '15px' }}>
              <button onClick={() => setStep('dni')} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: '0.85rem' }}>
                ← Volver
              </button>
            </div>
          </div>
        )}

        {/* Step: Pending Approval */}
        {step === 'pending' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
            <h2 style={{ marginBottom: '10px', color: '#ad6800' }}>Esperando Aprobación</h2>
            <div style={{ background: '#fffbe6', padding: '20px', borderRadius: '8px', border: '1px solid #ffe58f' }}>
              <p style={{ color: '#ad6800', fontSize: '0.95rem' }}>Tu solicitud de registro ha sido enviada.</p>
              <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '10px' }}>El administrador debe aprobar tu cuenta antes de que puedas marcar asistencia.</p>
            </div>
            <div style={{ marginTop: '20px' }}>
              <a href="/" style={{ color: 'var(--text-light)', fontSize: '0.85rem', textDecoration: 'none' }}>← Volver al Portal</a>
            </div>
          </div>
        )}

        {/* Step: Blocked */}
        {step === 'blocked' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🚫</div>
            <h2 style={{ marginBottom: '10px', color: '#cf1322' }}>Usuario Bloqueado</h2>
            <div style={{ background: '#fff1f0', padding: '20px', borderRadius: '8px', border: '1px solid #ffa39e' }}>
              <p style={{ color: '#cf1322', fontSize: '0.95rem' }}>Tu cuenta ha sido bloqueada por el administrador.</p>
              <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '10px' }}>Contacta con tu supervisor para más información.</p>
            </div>
            <div style={{ marginTop: '20px' }}>
              <a href="/" style={{ color: 'var(--text-light)', fontSize: '0.85rem', textDecoration: 'none' }}>← Volver al Portal</a>
            </div>
          </div>
        )}

        {/* Step: Capture */}
        {step === 'capture' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: '5px', color: 'var(--primary-color)' }}>Marcar Asistencia</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '15px' }}>Bienvenido/a, <strong>{employeeName}</strong></p>

            <div style={{ margin: '15px 0', border: '2px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: photoUrl ? 'none' : 'block' }}></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              {photoUrl && <img src={photoUrl} alt="Foto" style={{ width: '100%' }} />}
            </div>

            <button
              className="btn-primary"
              onClick={capturePhotoAndSave}
              disabled={loading || !!photoUrl}
              style={{ padding: '15px', fontSize: '1.1rem', backgroundColor: '#28a745' }}
            >
              {loading ? 'Guardando...' : '📸 Capturar y Guardar Asistencia'}
            </button>

            {locationStr && <p style={{ marginTop: '10px', color: 'green', fontSize: '0.85rem' }}>✓ Ubicación: {locationStr}</p>}
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✅</div>
            <h2 style={{ marginBottom: '10px', color: '#389e0d' }}>¡Asistencia Registrada!</h2>
            <div style={{ background: '#f6ffed', padding: '20px', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
              <p style={{ color: '#389e0d', fontSize: '0.95rem' }}>Tu asistencia ha sido guardada exitosamente.</p>
              {locationStr && <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px' }}>📍 Ubicación: {locationStr}</p>}
            </div>
            <div style={{ marginTop: '20px' }}>
              <a href="/" style={{ color: 'var(--primary-color)', fontWeight: 500, textDecoration: 'none' }}>← Volver al Portal</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
