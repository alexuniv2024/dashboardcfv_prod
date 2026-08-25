"use client";

import { useState, useEffect, useMemo } from "react";

interface DocumentoCxC {
  tipo_doc: string;
  nro_doc: number;
  co_cli: string;
  cliente: string;
  fec_emis: string;
  fec_venc: string;
  saldo: number;
  saldo_usd: number;
  dias_vencido: number;
}

export default function TablaDocumentosCxC() {
  const [docs, setDocs] = useState<DocumentoCxC[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/cuentas-cobrar/documentos");
        const json = await res.json();
        if (json.ok) setDocs(json.data || []);
      } catch (error) {
        console.error("Error al cargar documentos CxC:", error);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  // Filtro por cliente, código o número de documento
  const filtrados = useMemo(() => {
    if (!search.trim()) return docs;
    const q = search.toLowerCase();
    return docs.filter(
      (d) =>
        d.cliente.toLowerCase().includes(q) ||
        d.co_cli.toLowerCase().includes(q) ||
        String(d.nro_doc).includes(q) ||
        d.tipo_doc.toLowerCase().includes(q)
    );
  }, [docs, search]);

  const totalUsd = useMemo(
    () => filtrados.reduce((sum, d) => sum + Number(d.saldo_usd), 0),
    [filtrados]
  );

  const vencidos = useMemo(
    () => filtrados.filter((d) => Number(d.dias_vencido) > 0).length,
    [filtrados]
  );

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value || 0);

  const formatDate = (value: string) =>
    value ? new Date(value).toLocaleDateString("es-VE") : "—";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header con buscador */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Todos los Documentos por Cobrar
            </h3>
            <p className="text-sm text-gray-500">
              {filtrados.length} documento{filtrados.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-red-600">
                {vencidos} vencido{vencidos !== 1 ? "s" : ""}
              </span>{" "}
              · Total:{" "}
              <span className="font-semibold text-gray-900">
                {formatUSD(totalUsd)}
              </span>
            </p>
          </div>
        </div>

        {/* Buscador (mismo estilo del dashboard) */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por cliente, código, tipo o N° de documento..."
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

      {/* Tabla completa */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Documento</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Emisión</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Vencimiento</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Saldo USD</th>
              <th className="px-6 py-3 text-center font-medium text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  Cargando documentos por cobrar...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  {search
                    ? "Sin resultados para tu búsqueda"
                    : "No hay documentos con saldo pendiente"}
                </td>
              </tr>
            ) : (
              filtrados.map((d) => (
                <tr key={`${d.tipo_doc}-${d.nro_doc}`} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[220px]">
                      {d.cliente}
                    </p>
                    <p className="text-xs text-gray-400">{d.co_cli}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.tipo_doc}-{d.nro_doc}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {formatDate(d.fec_emis)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {formatDate(d.fec_venc)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatUSD(d.saldo_usd)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {Number(d.dias_vencido) > 0 ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        Vencido {d.dias_vencido} días
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        Por vencer
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