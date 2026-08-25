"use client";

import { useEffect, useState } from "react";

interface FacturaDetalle {
  fact_num: number;
  num_control: number;
  nombre_cliente: string;
  rif: string;
  co_cli: string;
  fec_emis: string;
  tot_bruto: number;
  tot_neto: number;
  iva: number;
  tasa: number;
  moneda: string;
  total_usd: number;
  cantidad_articulos: number;
}

interface SalesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fecha: string;
}

export default function SalesDetailModal({
  isOpen,
  onClose,
  fecha,
}: SalesDetailModalProps) {
  const [facturas, setFacturas] = useState<FacturaDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !fecha) return;

    async function fetchDetalle() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          `/api/profit/dashboard/ventas-detalle?fecha=${fecha}`
        );
        const data = await res.json();
        if (data.ok) {
          setFacturas(data.data);
        } else {
          setError(data.error || "Error al cargar los datos");
        }
      } catch (err) {
        setError("Error de conexión con el servidor");
      } finally {
        setLoading(false);
      }
    }

    fetchDetalle();
  }, [isOpen, fecha]);

  if (!isOpen) return null;

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatFecha = (fechaStr: string) => {
    const date = new Date(fechaStr + "T00:00:00");
    return date.toLocaleDateString("es-VE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatHora = (fechaStr: string) => {
    const date = new Date(fechaStr);
    return date.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalUSD = facturas.reduce((sum, f) => sum + Number(f.total_usd), 0);
  const totalArticulos = facturas.reduce(
    (sum, f) => sum + Number(f.cantidad_articulos),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Detalle de Ventas
            </h3>
            <p className="text-sm text-gray-500 capitalize">
              {formatFecha(fecha)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando facturas...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay facturas registradas para esta fecha
            </div>
          ) : (
            <>
              {/* Resumen del día */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Total Facturas</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {facturas.length}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Total USD</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatUSD(totalUSD)}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-600">Artículos Vendidos</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {totalArticulos}
                  </p>
                </div>
              </div>

              {/* Tabla de facturas */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        Factura
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        Hora
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">
                        Tasa
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">
                        Neto (Bs)
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">
                        Total USD
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">
                        Artículos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {facturas.map((factura) => (
                      <tr key={factura.fact_num} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              #{factura.fact_num}
                            </p>
                            <p className="text-xs text-gray-500">
                              Ctrl: {factura.num_control}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-900 truncate max-w-xs">
                            {factura.nombre_cliente}
                          </p>
                          <p className="text-xs text-gray-500">
                            {factura.co_cli}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatHora(factura.fec_emis)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {Number(factura.tasa).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {Number(factura.tot_neto).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          {formatUSD(Number(factura.total_usd))}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {factura.cantidad_articulos}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer del modal */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}