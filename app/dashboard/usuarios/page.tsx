"use client";

import { useEffect, useState, useMemo } from "react";
import UserFormModal from "@/components/usuarios/UserFormModal";

interface Usuario {
  id: number;
  email: string;
  rol: "ADMIN" | "GERENTE" | "CONSULTOR";
  estado: boolean;
  creado_en: string;
  actualizado_en: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Cargar usuarios
  const fetchUsuarios = async () => {
    try {
      const res = await fetch("/api/usuarios");
      const data = await res.json();
      if (data.ok) setUsuarios(data.data);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Filtrado
  const usuariosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return usuarios;
    const termino = busqueda.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.email.toLowerCase().includes(termino) ||
        u.rol.toLowerCase().includes(termino)
    );
  }, [usuarios, busqueda]);

  // Abrir modal para crear
  const handleCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  // Abrir modal para editar
  const handleEdit = (user: Usuario) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  // Toggle estado (activar/desactivar)
  const handleToggleEstado = async (user: Usuario) => {
    try {
      const res = await fetch(`/api/usuarios/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: !user.estado }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchUsuarios();
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  // Badge de rol con colores
  const getRolBadge = (rol: string) => {
    switch (rol) {
      case "ADMIN":
        return "bg-purple-100 text-purple-700";
      case "GERENTE":
        return "bg-blue-100 text-blue-700";
      case "CONSULTOR":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500">Administra los accesos al sistema</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Barra de búsqueda */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por email o rol..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 bg-white placeholder-gray-400"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabla de usuarios */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">ID</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Rol</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Creado</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuariosFiltrados.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">{user.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getRolBadge(user.rol)}`}>
                      {user.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleEstado(user)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                        user.estado
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {user.estado ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(user.creado_en).toLocaleDateString("es-VE")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {usuariosFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron usuarios
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <UserFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={fetchUsuarios}
        user={editingUser}
      />
    </div>
  );
}