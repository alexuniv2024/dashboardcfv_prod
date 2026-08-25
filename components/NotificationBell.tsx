"use client";

import { useState, useEffect, useRef } from "react";

interface Notificacion {
  id: number;
  producto_id: string;
  tipo: string;
  mensaje: string;
  estado: string;
  creado_en: string;
  visto_en: string | null;
  nombre_producto: string;
  stock_actual: string;
  nombre_marca: string;
  nombre_linea: string;
}

export default function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [totalNoVistas, setTotalNoVistas] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones
  const fetchNotificaciones = async () => {
    try {
      const res = await fetch("/api/notificaciones");
      const data = await res.json();
      if (data.ok) {
        setNotificaciones(data.data);
        setTotalNoVistas(data.total_no_vistas);
      }
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Marcar como vista
  const handleMarkAsSeen = async (id: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notificaciones/${id}/marcar-vista`, {
        method: "PUT",
      });
      const data = await res.json();
      if (data.ok) {
        setNotificaciones((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, estado: "VISTA", visto_en: new Date().toISOString() } : n
          )
        );
        setTotalNoVistas((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error al marcar como vista:", error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar todas como vistas
  const handleMarkAllAsSeen = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notificaciones/marcar-todas-vistas", {
        method: "PUT",
      });
      const data = await res.json();
      if (data.ok) {
        setNotificaciones((prev) =>
          prev.map((n) => ({ ...n, estado: "VISTA", visto_en: new Date().toISOString() }))
        );
        setTotalNoVistas(0);
      }
    } catch (error) {
      console.error("Error al marcar todas como vistas:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Hace un momento";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hr${diffHours > 1 ? "s" : ""}`;
    if (diffDays === 1) return "Ayer";
    return `Hace ${diffDays} días`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        title="Notificaciones de stock"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge con contador */}
        {totalNoVistas > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {totalNoVistas > 9 ? "9+" : totalNoVistas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header del dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800">
              Notificaciones de Stock
            </h3>
            {totalNoVistas > 0 && (
              <button
                onClick={handleMarkAllAsSeen}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                Marcar todas como vistas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>No hay notificaciones pendientes</p>
              </div>
            ) : (
              notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                    notif.estado === "PENDIENTE"
                      ? "bg-blue-50/50"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Producto */}
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notif.nombre_producto || notif.producto_id}
                      </p>

                      {/* Detalles */}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {notif.nombre_linea} • {notif.nombre_marca}
                      </p>

                      {/* Stock info */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                          Stock: {Number(notif.stock_actual).toFixed(0)}
                        </span>
                      </div>

                      {/* Tiempo */}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatFecha(notif.creado_en)}
                      </p>
                    </div>

                    {/* Botón de marcar vista */}
                    {notif.estado === "PENDIENTE" && (
                      <button
                        onClick={() => handleMarkAsSeen(notif.id)}
                        disabled={loading}
                        className="flex-shrink-0 p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                        title="Marcar como vista"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                {totalNoVistas > 0
                  ? `${totalNoVistas} notificaciones sin ver`
                  : "Todas las notificaciones fueron vistas"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}