"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaVenta() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locationStr, setLocationStr] = useState("");
  const [formData, setFormData] = useState({
    sellerId: "",
    clientId: "",
    dni: "",
    names: "",
    address: "",
    phone: "",
    locationLink: "",
    referencePhotos: "",
    installationDate: "",
    installationTimeRange: "",
    internetPlan: "",
    details: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const captureLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setFormData({ ...formData, locationLink: link });
          setLocationStr(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setLoading(false);
        },
        (error) => {
          alert("Error al obtener ubicación. Asegúrese de dar permisos.");
          setLoading(false);
        }
      );
    } else {
      alert("Geolocalización no soportada en este navegador.");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Por ahora convertimos a base64 para prototipo local rápido sin AWS S3
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, referencePhotos: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationLink) {
      alert("Debe capturar la ubicación actual antes de guardar.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        alert("Venta registrada exitosamente");
        router.push("/");
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      alert("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-layout" style={{ justifyContent: 'center', background: 'var(--bg-light)', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Registrar Instalación</h2>
        <p style={{ marginBottom: '20px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
          Para realizar su instalación necesitamos los siguientes datos:
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ID o Nombre del Vendedor</label>
            <input type="text" name="sellerId" required onChange={handleChange} placeholder="Ej: Juan Perez o 1234" />
          </div>

          <div className="form-group">
            <label>ID de Cliente (código de caja) - Opcional</label>
            <input type="text" name="clientId" onChange={handleChange} placeholder="Ej: 10293" />
          </div>

          <div className="form-group">
            <label>DNI</label>
            <input type="text" name="dni" required onChange={handleChange} maxLength={8} />
          </div>

          <div className="form-group">
            <label>Nombres</label>
            <input type="text" name="names" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <input type="text" name="address" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Fecha de Instalación Sugerida</label>
            <input type="date" name="installationDate" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Rango de Horario</label>
            <select name="installationTimeRange" onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
              <option value="">Seleccione un rango...</option>
              <option value="08:00 AM - 11:00 AM">08:00 AM - 11:00 AM</option>
              <option value="11:00 AM - 02:00 PM">11:00 AM - 02:00 PM</option>
              <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</option>
            </select>
          </div>

          <div className="form-group">
            <label>Plan de Internet</label>
            <input type="text" name="internetPlan" placeholder="Ej: 100 Mbps Fibra" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Detalles adicionales (Opcional)</label>
            <textarea name="details" placeholder="Ej: Cliente tiene 3 TVs, requiere cable extra..." onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', minHeight: '80px', fontFamily: 'inherit' }}></textarea>
          </div>

          <div className="form-group">
            <label>Número celular para contacto</label>
            <input type="tel" name="phone" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Ubicación (GPS Automático o Pegar Link)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" className="btn-primary" onClick={captureLocation} style={{ backgroundColor: '#17a2b8' }}>
                {loading && !locationStr ? "Obteniendo..." : "📍 Obtener Mi Ubicación Automática"}
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#666', fontWeight: 500 }}>
                O pega el link enviado por el cliente:
              </div>
              <input 
                type="url" 
                name="locationLink"
                value={formData.locationLink}
                onChange={handleChange}
                placeholder="https://maps.google.com/..." 
                style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '5px' }}
                required 
              />
            </div>
            {locationStr && <p style={{ marginTop: '5px', fontSize: '0.8rem', color: 'green' }}>✓ Ubicación GPS capturada automáticamente</p>}
          </div>

          <div className="form-group">
            <label>Adicional una foto de la casa y calle para facilidades técnicas 🏠</label>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} required />
            {formData.referencePhotos && (
              <img src={formData.referencePhotos} alt="Preview" style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }} />
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? "Guardando..." : "Guardar Registro"}
          </button>
        </form>
      </div>
    </div>
  );
}
