"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface Critico {
  producto_id: string;
  nombre?: string;
  nombre_producto?: string;
  stock_actual?: number | string;
  umbral_minimo?: number | string;
  umbral?: number | string;
  punto_reorden?: number | string;
}

export default function StockCritico() {
  const [criticos, setCriticos] = useState<Critico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/inventario/criticos");
        const json = await res.json();
        if (json.ok) setCriticos(json.data || []);
      } catch (error) {
        console.error("Error al cargar stock crítico:", error);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const nombreDe = (c: Critico) =>
    c.nombre || c.nombre_producto || c.producto_id;

  const umbralDe = (c: Critico) =>
    c.umbral_minimo ?? c.umbral ?? c.punto_reorden ?? 0;

  const filtrados = useMemo(() => {
    if (!search) return criticos;
    const q = search.toLowerCase();
    return criticos.filter(
      (c) =>
        nombreDe(c).toLowerCase().includes(q) ||
        c.producto_id.toLowerCase().includes(q)
    );
  }, [criticos, search]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Header (igual que la tarjeta de al lado) */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Stock Crítico</h3>
            <p className="text-sm text-gray-500">
              {criticos.length} producto{criticos.length !== 1 ? "s" : ""} monitoreado
              {criticos.length !== 1 ? "s" : ""} bajo el umbral
            </p>
          </div>
          <Link
            href="/dashboard/inventario"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
          >
            Ver inventario →
          </Link>
        </div>

        {/* Buscador (igual que la tarjeta de al lado) */}
        <div className="relative mt-4">
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
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

      {/* Tabla (misma estética que la de al lado) */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">
                Producto
              </th>
              <th className="px-6 py-3 text-center font-medium text-gray-500">
                Stock
              </th>
              <th className="px-6 py-3 text-center font-medium text-gray-500">
                Umbral
              </th>
              <th className="px-6 py-3 text-center font-medium text-gray-500">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                  Cargando productos monitoreados...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-green-600 font-medium"
                >
                  Sin productos bajo el umbral
                </td>
              </tr>
            ) : (
              filtrados.map((c) => (
                <tr key={c.producto_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[220px]">
                      {nombreDe(c)}
                    </p>
                    <p className="text-xs text-gray-400">{c.producto_id}</p>
                  </td>
                  <td className="px-6 py-3 text-center font-bold text-red-600">
                    {Number(c.stock_actual)}
                  </td>
                  <td className="px-6 py-3 text-center text-gray-500">
                    {Number(umbralDe(c))}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {Number(c.stock_actual) === 0 ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        Sin stock
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                        Bajo umbral
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}