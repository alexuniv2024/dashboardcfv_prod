"use client";

import { useState, useEffect, useCallback } from "react";
import ConfigFilters from "@/components/inventario/ConfigFilters";
import ProductConfigTable from "@/components/inventario/ProductConfigTable";
import Pagination from "@/components/inventario/Pagination";

interface Producto {
  producto_id: string;
  nombre: string;
  stock_actual: string;
  stock_min_profit: string;
  nombre_linea: string;
  nombre_sub_linea: string;
  nombre_marca: string;
  nombre_proveedor: string;
  config_id: number | null;
  umbral_minimo: number | null;
  monitoreado: boolean | null;
}

interface Filtros {
  lineas: { co_lin: string; lin_des: string }[];
  sub_lineas: { co_subl: string; subl_des: string; co_lin: string }[];
  marcas: { co_color: string; marca_des: string }[];
  proveedores: { co_prov: string; prov_des: string }[];
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function ConfiguracionInventarioPage() {
  // Estados de datos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    lineas: [],
    sub_lineas: [],
    marcas: [],
    proveedores: [],
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  });

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Estados de filtros
  const [selectedLin, setSelectedLin] = useState("");
  const [selectedSubl, setSelectedSubl] = useState("");
  const [selectedMarca, setSelectedMarca] = useState("");
  const [selectedProv, setSelectedProv] = useState("");

  // Toast
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Mostrar toast
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // Cargar filtros (una sola vez)
  useEffect(() => {
    async function fetchFiltros() {
      try {
        const res = await fetch("/api/inventario/filtros");
        const data = await res.json();
        if (data.ok) setFiltros(data.data);
      } catch (error) {
        console.error("Error al cargar filtros:", error);
      }
    }
    fetchFiltros();
  }, []);

  // Cargar productos
  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedLin) params.append("co_lin", selectedLin);
      if (selectedSubl) params.append("co_subl", selectedSubl);
      if (selectedMarca) params.append("co_color", selectedMarca);
      if (selectedProv) params.append("co_prov", selectedProv);

      const res = await fetch(`/api/inventario/productos?${params}`);
      const data = await res.json();

      if (data.ok) {
        setProductos(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error al cargar productos:", error);
      showToast("Error al cargar productos", "error");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, selectedLin, selectedSubl, selectedMarca, selectedProv]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  // Toggle monitoreo
  const handleToggleMonitoreo = async (producto: Producto) => {
    try {
      setSaving(true);
      const nuevoEstado = !producto.monitoreado;

      // Si está activando y no tiene umbral, usar stock_min_profit por defecto
      const umbral = nuevoEstado
        ? producto.umbral_minimo ?? parseFloat(producto.stock_min_profit) ?? 5
        : producto.umbral_minimo ?? 0;

      const res = await fetch("/api/config-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: producto.producto_id,
          umbral_minimo: umbral,
          activo: nuevoEstado,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        // Actualizar el producto localmente
        setProductos((prev) =>
          prev.map((p) =>
            p.producto_id === producto.producto_id
              ? {
                  ...p,
                  monitoreado: nuevoEstado,
                  umbral_minimo: umbral,
                  config_id: data.data.id,
                }
              : p
          )
        );
        showToast(
          nuevoEstado ? "Monitoreo activado" : "Monitoreo desactivado",
          "success"
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Error al actualizar monitoreo:", error);
      showToast(error.message || "Error al actualizar", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actualizar umbral
  const handleUpdateUmbral = async (producto: Producto, nuevoUmbral: number) => {
    if (!producto.config_id) {
      showToast("Primero activa el monitoreo", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/config-stock/${producto.config_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ umbral_minimo: nuevoUmbral }),
      });

      const data = await res.json();

      if (data.ok) {
        setProductos((prev) =>
          prev.map((p) =>
            p.producto_id === producto.producto_id
              ? { ...p, umbral_minimo: nuevoUmbral }
              : p
          )
        );
        showToast("Umbral actualizado", "success");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Error al actualizar umbral:", error);
      showToast(error.message || "Error al actualizar", "error");
    } finally {
      setSaving(false);
    }
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setSelectedLin("");
    setSelectedSubl("");
    setSelectedMarca("");
    setSelectedProv("");
  };

  // Contadores
  const totalMonitoreados = productos.filter((p) => p.monitoreado).length;
  const totalBajoUmbral = productos.filter((p) => {
    if (!p.monitoreado || p.umbral_minimo === null) return false;
    return parseFloat(p.stock_actual) <= p.umbral_minimo;
  }).length;

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
            Configuración de Inventario
          </h1>
          <p className="text-gray-500">
            Selecciona qué productos monitorear y establece sus umbrales
            personalizados
          </p>
        </div>

        {/* Contadores */}
        <div className="flex gap-4">
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <p className="text-xs text-blue-600">Monitoreados</p>
            <p className="text-2xl font-bold text-blue-700">
              {totalMonitoreados}
            </p>
          </div>
          <div className="bg-red-50 px-4 py-2 rounded-lg">
            <p className="text-xs text-red-600">Bajo umbral</p>
            <p className="text-2xl font-bold text-red-700">{totalBajoUmbral}</p>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por código o nombre del producto..."
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

      {/* Filtros */}
      <ConfigFilters
        filtros={filtros}
        selectedLin={selectedLin}
        selectedSubl={selectedSubl}
        selectedMarca={selectedMarca}
        selectedProv={selectedProv}
        onLinChange={setSelectedLin}
        onSublChange={setSelectedSubl}
        onMarcaChange={setSelectedMarca}
        onProvChange={setSelectedProv}
        onClearAll={handleClearFilters}
      />

      {/* Tabla */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      ) : (
        <>
          <ProductConfigTable
            productos={productos}
            onToggleMonitoreo={handleToggleMonitoreo}
            onUpdateUmbral={handleUpdateUmbral}
          />

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.total_pages}
              onPageChange={(page) =>
                setPagination((prev) => ({ ...prev, page }))
              }
              total={pagination.total}
              limit={pagination.limit}
            />
          </div>
        </>
      )}
    </div>
  );
}