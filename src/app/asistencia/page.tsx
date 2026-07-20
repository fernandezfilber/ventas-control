"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Asistencia() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locationStr, setLocationStr] = useState("");
  const [userName, setUserName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("No se pudo acceder a la cámara.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const capturePhotoAndLocation = () => {
    if (!userName) {
      alert("Por favor ingrese su nombre primero.");
      return;
    }

    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context?.drawImage(videoRef.current, 0, 0, 300, 225);
      const dataUrl = canvasRef.current.toDataURL("image/jpeg");
      setPhotoUrl(dataUrl);
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
                userName,
                photoUrl, // It might be empty if canvas failed, but we'll try
                latitude,
                longitude,
              }),
            });
            if (res.ok) {
              alert("Asistencia guardada exitosamente!");
              router.push("/");
            } else {
              alert("Error al guardar asistencia.");
            }
          } catch (e) {
            alert("Error de red");
          } finally {
            setLoading(false);
          }
        },
        (error) => {
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
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Control de Asistencia</h2>
        
        <div className="form-group" style={{ textAlign: 'left' }}>
          <label>Nombre del Colaborador</label>
          <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Ej: Carlos Técnico" />
        </div>

        <div style={{ margin: '20px 0', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: photoUrl ? 'none' : 'block' }}></video>
          <canvas ref={canvasRef} width="300" height="225" style={{ display: 'none' }}></canvas>
          {photoUrl && <img src={photoUrl} alt="Asistencia" style={{ width: '100%' }} />}
        </div>

        <button 
          className="btn-primary" 
          onClick={capturePhotoAndLocation} 
          disabled={loading || !!photoUrl}
          style={{ padding: '15px', fontSize: '1.1rem', backgroundColor: '#28a745' }}
        >
          {loading ? "Guardando..." : "📸 Guardar Asistencia"}
        </button>
        
        {locationStr && <p style={{ marginTop: '15px', color: 'green', fontSize: '0.9rem' }}>Ubicación guardada: {locationStr}</p>}
      </div>
    </div>
  );
}
