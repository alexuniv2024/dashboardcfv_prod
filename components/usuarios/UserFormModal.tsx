"use client";

import { useState, useEffect } from "react";

interface Usuario {
  id?: number;
  email: string;
  password?: string;
  rol: "ADMIN" | "GERENTE" | "CONSULTOR";
  estado?: boolean;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user?: Usuario | null;
}

export default function UserFormModal({ isOpen, onClose, onSave, user }: UserFormModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"ADMIN" | "GERENTE" | "CONSULTOR">("CONSULTOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!user?.id;

  // Cargar datos del usuario al editar
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setRol(user.rol);
      setPassword(""); // No cargamos la contraseña por seguridad
    } else {
      setEmail("");
      setPassword("");
      setRol("CONSULTOR");
    }
    setError("");
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: any = { email, rol };
      if (password) body.password = password;

      const url = isEditing ? `/api/usuarios/${user.id}` : "/api/usuarios";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar el usuario");
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(typeof err.message === "string" ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">
            {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
              placeholder="usuario@empresa.com"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña {!isEditing && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              required={!isEditing}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
              placeholder={isEditing ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
            />
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Deja vacío si no deseas cambiar la contraseña
              </p>
            )}
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as "ADMIN" | "GERENTE" | "CONSULTOR")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
            >
              <option value="ADMIN">Administrador</option>
              <option value="GERENTE">Gerente</option>
              <option value="CONSULTOR">Consultor</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}