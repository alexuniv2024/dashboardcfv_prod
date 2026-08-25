"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
      {/* Lado izquierdo: botón hamburguesa + título */}
      <div className="flex items-center gap-3">
        {/* Botón hamburguesa (solo móvil) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          title="Abrir menú"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-800">
            Panel de Control
          </h2>
          <p className="text-xs md:text-sm text-gray-500 hidden sm:block">
            Resumen general de la empresa
          </p>
        </div>
      </div>

      {/* Lado derecho: notificaciones + usuario + logout */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Campana de notificaciones */}
        <NotificationBell />

        {/* Info del usuario (oculta en móvil) */}
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-gray-700">Administrador</p>
          <p className="text-xs text-gray-500">admin@dashboard.com</p>
        </div>

        {/* Botón Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
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
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden sm:inline">
            {loggingOut ? "Saliendo..." : "Cerrar Sesión"}
          </span>
        </button>
      </div>
    </header>
  );
}