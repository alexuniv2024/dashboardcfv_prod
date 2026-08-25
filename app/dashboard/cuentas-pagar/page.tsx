"use client";

import { useState, useEffect, useMemo } from "react";
import StatCard from "@/components/StatCard";

interface Cuenta {
  tipo_doc: string;
  nro_doc: number;
  co_prov: string;
  nombre_proveedor: string;
  fec_emis: string;
  fec_venc: string;
  tasa: number;
  moneda: string;
  monto_net_usd: number;
  saldo_usd: number;
  dias_restantes: number;
  estado: "vencida" | "hoy" | "urgente" | "proxima" | "normal";
}

interface Stats {
  total_cuentas: number;
  deuda_total_usd: number;
  cuentas_vencidas: number;
  cuentas_por_vencer: number;
  monto_vencido_usd: number;
  monto_por_vencer_usd: number;
}

export default function CuentasPagarPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [generatingReport, setGeneratingReport] = useState(false);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3500
    );
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Cargar datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cuentas-pagar/resumen");
      const data = await res.json();
      if (data.ok) {
        setCuentas(data.data);
        setStats(data.stats);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error("Error al cargar CxP:", error);
      showToast("Error al cargar las cuentas por pagar", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado
  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((c) => {
      const matchSearch =
        !search ||
        c.nombre_proveedor.toLowerCase().includes(search.toLowerCase()) ||
        c.co_prov.toLowerCase().includes(search.toLowerCase()) ||
        c.nro_doc.toString().includes(search);

      const matchEstado = !filtroEstado || c.estado === filtroEstado;

      return matchSearch && matchEstado;
    });
  }, [cuentas, search, filtroEstado]);

  // Generar reporte PDF completo
  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      showToast("📄 Generando reporte PDF...", "info");

      // 1. Obtener datos completos para el PDF
      const resData = await fetch("/api/cuentas-pagar/reporte-data");
      const dataRes = await resData.json();

      if (!dataRes.ok) {
        throw new Error(dataRes.error || "Error al obtener datos del reporte");
      }

      const cuentasPDF = dataRes.data;
      const statsPDF = dataRes.stats;

      // 2. Generar el PDF (se descarga automáticamente)
      const { generarPdfCxP } = await import("@/lib/pdf/cxp");
      await generarPdfCxP(cuentasPDF, statsPDF, "admin@dashboard.com");

      // 3. Guardar el reporte en el historial (log de auditoría)
      const resSave = await fetch("/api/cuentas-pagar/generar-reporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_cuentas: Number(statsPDF.total_cuentas),
          monto_total_usd: Number(statsPDF.deuda_total_usd),
          cuentas_vencidas: Number(statsPDF.cuentas_vencidas),
          monto_vencido_usd: Number(statsPDF.monto_vencido_usd),
          cuentas_por_vencer: Number(statsPDF.cuentas_por_vencer),
          monto_por_vencer_usd: Number(statsPDF.monto_por_vencer_usd),
        }),
      });

      const dataSave = await resSave.json();

      if (dataSave.ok) {
        showToast("✅ Reporte PDF generado exitosamente", "success");
      } else {
        throw new Error(dataSave.error || "Error al guardar el reporte");
      }
    } catch (error: any) {
      console.error("Error al generar reporte:", error);
      showToast(error.message || "Error al generar el reporte", "error");
    } finally {
      setGeneratingReport(false);
    }
  };

  // Estilos según estado
  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case "vencida":
        return {
          badge: "bg-red-100 text-red-700 border-red-300",
          text: "text-red-600",
          label: "Vencida",
          rowClass: "bg-red-50/50",
        };
      case "hoy":
        return {
          badge: "bg-orange-100 text-orange-700 border-orange-300",
          text: "text-orange-600",
          label: "Vence hoy",
          rowClass: "bg-orange-50/50",
        };
      case "urgente":
        return {
          badge: "bg-yellow-100 text-yellow-700 border-yellow-300",
          text: "text-yellow-700",
          label: "Urgente",
          rowClass: "bg-yellow-50/30",
        };
      case "proxima":
        return {
          badge: "bg-green-100 text-green-700 border-green-300",
          text: "text-green-700",
          label: "Próxima",
          rowClass: "",
        };
      default:
        return {
          badge: "bg-blue-100 text-blue-700 border-blue-300",
          text: "text-blue-700",
          label: "Normal",
          rowClass: "",
        };
    }
  };

  // Texto de días
  const getDiasText = (cuenta: Cuenta) => {
    if (cuenta.estado === "vencida") {
      const diasMora = Math.abs(cuenta.dias_restantes);
      return `${diasMora} día${diasMora !== 1 ? "s" : ""} de mora`;
    }
    if (cuenta.estado === "hoy") return "Vence hoy";
    return `${cuenta.dias_restantes} día${cuenta.dias_restantes !== 1 ? "s" : ""} restantes`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando cuentas por pagar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : toast.type === "error"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas por Pagar</h1>
          <p className="text-gray-500">
            Gestión de obligaciones con proveedores y vencimientos próximos
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={generatingReport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {generatingReport ? "Generando..." : "Generar Reporte PDF"}
        </button>
      </div>

      {/* Tarjetas KPI */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Deuda Total"
            value={formatUSD(stats.deuda_total_usd)}
            subtitle={`${stats.total_cuentas} cuentas pendientes`}
            color="blue"
            icon={
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />

          <StatCard
            title="Cuentas Vencidas"
            value={formatUSD(stats.monto_vencido_usd)}
            subtitle={`${stats.cuentas_vencidas} cuentas en mora`}
            color="red"
            icon={
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          />

          <StatCard
            title="Por Vencer"
            value={formatUSD(stats.monto_por_vencer_usd)}
            subtitle={`${stats.cuentas_por_vencer} cuentas próximas`}
            color="yellow"
            icon={
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por proveedor, código o N° documento..."
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

          {/* Filtro por estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="vencida">Vencidas</option>
            <option value="hoy">Vence hoy</option>
            <option value="urgente">Urgentes (1-3 días)</option>
            <option value="proxima">Próximas (4-7 días)</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Documento
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Proveedor
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Emisión
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Vencimiento
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Días
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Monto USD
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Saldo USD
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cuentasFiltradas.map((cuenta, idx) => {
                const style = getEstadoStyle(cuenta.estado);
                return (
                  <tr
                    key={`${cuenta.tipo_doc}-${cuenta.nro_doc}-${idx}`}
                    className={`hover:bg-gray-50 transition ${style.rowClass}`}
                  >
                    {/* Documento */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded inline-block">
                          {cuenta.tipo_doc} #{cuenta.nro_doc}
                        </p>
                      </div>
                    </td>

                    {/* Proveedor */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {cuenta.nombre_proveedor}
                      </p>
                      <p className="text-xs text-gray-500">{cuenta.co_prov}</p>
                    </td>

                    {/* Emisión */}
                    <td className="px-4 py-3 text-center text-gray-600">
                      {formatDate(cuenta.fec_emis)}
                    </td>

                    {/* Vencimiento */}
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${style.text}`}>
                        {formatDate(cuenta.fec_venc)}
                      </span>
                    </td>

                    {/* Días */}
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-medium ${style.text}`}>
                        {getDiasText(cuenta)}
                      </span>
                    </td>

                    {/* Monto */}
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatUSD(Number(cuenta.monto_net_usd))}
                    </td>

                    {/* Saldo */}
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatUSD(Number(cuenta.saldo_usd))}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer con contadores */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando{" "}
            <span className="font-semibold">{cuentasFiltradas.length}</span> de{" "}
            <span className="font-semibold">{cuentas.length}</span> cuentas
          </p>
          {search || filtroEstado ? (
            <button
              onClick={() => {
                setSearch("");
                setFiltroEstado("");
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        {cuentasFiltradas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron cuentas con los filtros aplicados
          </div>
        )}
      </div>
    </div>
  );
}