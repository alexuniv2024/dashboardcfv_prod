"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProductoCritico {
  producto_id: string;
  nombre: string;
  stock_actual: number;
  stock_min_profit: number;
  umbral_minimo: number;
  ultima_alerta: string | null;
  nombre_linea: string;
  nombre_sub_linea: string;
  nombre_marca: string;
  nombre_proveedor: string;
  estado: "sin_stock" | "critico" | "advertencia" | "normal";
}

interface Stats {
  total_criticos: number;
  sin_stock: number;
  criticos: number;
}

export default function InventarioPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoCritico[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_criticos: 0,
    sin_stock: 0,
    criticos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000
    );
  };

  // Cargar productos críticos
  const fetchCriticos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventario/criticos");
      const data = await res.json();
      if (data.ok) {
        setProductos(data.data);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error al cargar productos críticos:", error);
      showToast("Error al cargar productos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriticos();
  }, []);

  // Sincronizar stock
  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/inventario/sync", { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        showToast(
          `Sincronización completada: ${data.data.productos_sincronizados} productos`,
          "success"
        );
        // Recargar productos críticos
        await fetchCriticos();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Error al sincronizar:", error);
      showToast(error.message || "Error al sincronizar", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Filtrar productos
  const productosFiltrados = search
    ? productos.filter(
        (p) =>
          p.producto_id.toLowerCase().includes(search.toLowerCase()) ||
          p.nombre.toLowerCase().includes(search.toLowerCase()) ||
          p.nombre_marca.toLowerCase().includes(search.toLowerCase())
      )
    : productos;

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "sin_stock":
        return {
          text: "Sin Stock",
          classes: "bg-red-100 text-red-700 border-red-300",
        };
      case "critico":
        return {
          text: "Crítico",
          classes: "bg-orange-100 text-orange-700 border-orange-300",
        };
      case "advertencia":
        return {
          text: "Advertencia",
          classes: "bg-yellow-100 text-yellow-700 border-yellow-300",
        };
      default:
        return {
          text: "Normal",
          classes: "bg-green-100 text-green-700 border-green-300",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventario Crítico
          </h1>
          <p className="text-gray-500">
            Productos monitoreados con stock por debajo del umbral configurado
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-5 h-5 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {syncing ? "Sincronizando..." : "Sincronizar Stock"}
          </button>

          <Link
            href="/dashboard/inventario/configuracion"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Configurar Umbrales
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Críticos</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total_criticos}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sin Stock</p>
              <p className="text-3xl font-bold text-red-600">
                {stats.sin_stock}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className="text-3xl font-bold text-orange-600">
                {stats.criticos}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por código, nombre o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 bg-white placeholder-gray-400"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Tabla de productos críticos */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando productos críticos...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Línea / Sub-línea
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Marca
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Stock Actual
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Umbral
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productosFiltrados.map((producto) => {
                  const badge = getEstadoBadge(producto.estado);
                  const stockActual = Number(producto.stock_actual);
                  const umbral = Number(producto.umbral_minimo);
                  const porcentaje =
                    umbral > 0 ? (stockActual / umbral) * 100 : 0;

                  return (
                    <tr key={producto.producto_id} className="hover:bg-gray-50">
                      {/* Código */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                          {producto.producto_id}
                        </span>
                      </td>

                      {/* Nombre */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">
                          {producto.nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {producto.nombre_proveedor}
                        </p>
                      </td>

                      {/* Línea / Sub-línea */}
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{producto.nombre_linea}</p>
                        <p className="text-xs text-gray-500">
                          {producto.nombre_sub_linea}
                        </p>
                      </td>

                      {/* Marca */}
                      <td className="px-4 py-3">
                        <span className="text-gray-700">
                          {producto.nombre_marca}
                        </span>
                      </td>

                      {/* Stock Actual */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-lg font-bold ${
                              stockActual === 0
                                ? "text-red-600"
                                : stockActual <= umbral
                                ? "text-orange-600"
                                : "text-gray-900"
                            }`}
                          >
                            {stockActual}
                          </span>
                          {umbral > 0 && (
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  porcentaje <= 25
                                    ? "bg-red-500"
                                    : porcentaje <= 50
                                    ? "bg-orange-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(porcentaje, 100)}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Umbral */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600 font-semibold">
                          {umbral}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${badge.classes}`}
                        >
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {productosFiltrados.length === 0 && (
            <div className="text-center py-12">
              {productos.length === 0 ? (
                <div>
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
                  <p className="text-gray-500 mb-4">
                    No hay productos críticos monitoreados
                  </p>
                  <Link
                    href="/dashboard/inventario/configuracion"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Configurar Productos a Monitorear
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500">
                  No se encontraron productos con los filtros aplicados
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}