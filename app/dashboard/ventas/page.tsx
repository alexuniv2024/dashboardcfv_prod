"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ============================================
// INTERFACES
// ============================================
interface Periodo {
  anio: number;
  mes: number;
  total_facturas: number;
  ventas_usd: number;
}

interface VentasMes {
  periodo: { anio: number; mes: number };
  ventas_totales_usd: number;
  total_facturas: number;
  total_articulos: number;
  acumulado_anual?: {
    anio: number;
    facturas: number;
    ventas_usd: number;
    articulos: number;
  };
  mes_anterior: {
    periodo: { anio: number; mes: number };
    ventas_totales_usd: number;
    total_facturas: number;
    tiene_datos: boolean;
  };
  variacion_porcentual: number | null;
}

interface ProductoRanking {
  posicion: number;
  co_art: string;
  nombre_producto: string;
  cantidad_vendida: number;
  total_usd: number;
  ganancia_usd?: number;
}

interface TopProductos {
  porCantidad: ProductoRanking[];
  porMonto: ProductoRanking[];
  masUtiles: ProductoRanking[];
  estadisticas: {
    total_articulos_vendidos: number;
    total_productos_distintos: number;
  };
}

interface CajaCobro {
  cod_caja: string;
  descripcion_caja: string;
  moneda_original: string;
  cantidad_cobros: number;
  monto_moneda_original: number;
  monto_usd: number;
}

interface BancoCobro {
  codigo_completo: string;
  codigo_banco: string;
  numero_cuenta: string;
  nombre_banco: string;
  moneda_original: string;
  cantidad_depositos: number;
  monto_moneda_original: number;
  monto_usd: number;
}

interface DesgloseCobros {
  efectivo: {
    por_caja: CajaCobro[];
    total_efectivo_usd: number;
    total_efectivo_usd_caja: number;
    total_efectivo_bs_a_usd: number;
  };
  depositos: {
    por_banco: BancoCobro[];
    total_depositos_usd: number;
  };
  total_general_usd: number;
}

interface ResumenFinanciero {
  cuentas_por_cobrar: {
    total_documentos: number;
    total_clientes: number;
    saldo_total_usd: number;
    documentos_vencidos: number;
    saldo_vencido_usd: number;
    porcentaje_vencido: number;
  };
  cuentas_por_pagar: {
    total_cuentas: number;
    deuda_total_usd: number;
    cuentas_vencidas: number;
    cuentas_por_vencer: number;
    monto_vencido_usd: number;
    monto_por_vencer_usd: number;
  };
  stock_critico: {
    total_productos_criticos: number;
    productos_sin_stock: number;
  };
}

// ============================================
// UTILIDADES
// ============================================
const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatUSD = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

const nombreMes = (mes: number) => NOMBRES_MESES[mes - 1] || "";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function VentasPage() {
  // Estado de autenticación
  const [rolUsuario, setRolUsuario] = useState<string | null>(null);
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);

  // Estado de períodos
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<{
    anio: number;
    mes: number;
  } | null>(null);

  // Estado de datos
  const [ventasMes, setVentasMes] = useState<VentasMes | null>(null);
  const [topProductos, setTopProductos] = useState<TopProductos | null>(null);
  const [desgloseCobros, setDesgloseCobros] = useState<DesgloseCobros | null>(null);
  const [resumenFinanciero, setResumenFinanciero] = useState<ResumenFinanciero | null>(null);

  // Estado de UI
  const [loading, setLoading] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // ============================================
  // 1. VERIFICAR ROL DEL USUARIO
  // ============================================
  useEffect(() => {
    async function verificarAcceso() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          setRolUsuario(null);
          return;
        }
        const data = await res.json();
        const rol = data.user?.rol || data.rol || null;
        setRolUsuario(rol);
      } catch (error) {
        console.error("Error al verificar acceso:", error);
        setRolUsuario(null);
      } finally {
        setVerificandoAcceso(false);
      }
    }
    verificarAcceso();
  }, []);

  // ============================================
  // 2. CARGAR PERÍODOS DISPONIBLES
  // ============================================
  useEffect(() => {
    if (rolUsuario !== "ADMIN" && rolUsuario !== "GERENTE") return;

    async function cargarPeriodos() {
      try {
        const res = await fetch("/api/reportes/periodos");
        const data = await res.json();
        if (data.ok && data.data.length > 0) {
          setPeriodos(data.data);
          // Seleccionar el período más reciente por defecto
          setPeriodoSeleccionado({
            anio: data.data[0].anio,
            mes: data.data[0].mes,
          });
        }
      } catch (error) {
        console.error("Error al cargar períodos:", error);
      }
    }
    cargarPeriodos();
  }, [rolUsuario]);

  // ============================================
  // 3. CARGAR DATOS DEL MES SELECCIONADO
  // ============================================
  const cargarDatosMes = useCallback(async () => {
    if (!periodoSeleccionado) return;

    try {
      setLoading(true);
      const { anio, mes } = periodoSeleccionado;
      const query = `anio=${anio}&mes=${mes}`;

      const [resVentas, resTop, resDesglose, resFinanciero] = await Promise.all([
        fetch(`/api/reportes/ventas-mes?${query}`),
        fetch(`/api/reportes/top-productos?${query}`),
        fetch(`/api/reportes/desglose-cobros?${query}`),
        fetch(`/api/reportes/resumen-financiero`),
      ]);

      const [dataVentas, dataTop, dataDesglose, dataFinanciero] = await Promise.all([
        resVentas.json(),
        resTop.json(),
        resDesglose.json(),
        resFinanciero.json(),
      ]);

      if (dataVentas.ok) setVentasMes(dataVentas.data);
      if (dataTop.ok) setTopProductos(dataTop.data);
      if (dataDesglose.ok) setDesgloseCobros(dataDesglose.data);
      if (dataFinanciero.ok) setResumenFinanciero(dataFinanciero.data);
    } catch (error) {
      console.error("Error al cargar datos del mes:", error);
      showToast("Error al cargar los datos del reporte", "error");
    } finally {
      setLoading(false);
    }
  }, [periodoSeleccionado]);

  useEffect(() => {
    cargarDatosMes();
  }, [cargarDatosMes]);

  // ============================================
  // 4. GENERAR PDF (placeholder - Fase 3)
  // ============================================

  const handleGenerarPdf = async () => {
    if (!periodoSeleccionado || !ventasMes || !topProductos || !desgloseCobros || !resumenFinanciero) {
      showToast("Los datos aún no están cargados. Espera un momento.", "error");
      return;
    }

    try {
      setGenerandoPdf(true);
      showToast("📄 Generando reporte PDF...", "info");

      // 1. Generar el PDF (se descarga automáticamente)
      const { generarPdfMensual } = await import("@/lib/pdf/mensual");
      await generarPdfMensual(
        periodoSeleccionado,
        ventasMes,
        topProductos,
        desgloseCobros,
        resumenFinanciero,
        "admin@dashboard.com"
      );

      // 2. Guardar en el historial
      const resSave = await fetch("/api/reportes/guardar-reporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anio: periodoSeleccionado.anio,
          mes: periodoSeleccionado.mes,
          ventas_totales_usd: ventasMes.ventas_totales_usd,
          total_facturas: ventasMes.total_facturas,
          total_articulos: ventasMes.total_articulos,
          variacion_vs_mes_anterior: ventasMes.variacion_porcentual,
        }),
      });

      const dataSave = await resSave.json();

      if (dataSave.ok) {
        showToast("✅ Reporte PDF generado exitosamente", "success");
      } else {
        throw new Error(dataSave.error || "Error al guardar el reporte");
      }
    } catch (error: any) {
      console.error("Error al generar PDF:", error);
      showToast(error.message || "Error al generar el reporte", "error");
    } finally {
      setGenerandoPdf(false);
    }
  };

  // ============================================
  // RENDER: Verificando acceso
  // ============================================
  if (verificandoAcceso) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Verificando permisos...</span>
      </div>
    );
  }

  // ============================================
  // RENDER: Acceso denegado
  // ============================================
  if (rolUsuario !== "ADMIN" && rolUsuario !== "GERENTE") {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          El módulo de Ventas solo está disponible para usuarios con rol de
          Administrador o Gerente. Contacta al administrador si necesitas acceso.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // ============================================
  // RENDER: Página principal
  // ============================================
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

      {/* Header + Selector + Botón PDF */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Módulo de Ventas
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Reporte mensual de ventas, cobros y análisis de productos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Selector de período */}
          <select
            value={
              periodoSeleccionado
                ? `${periodoSeleccionado.anio}-${periodoSeleccionado.mes}`
                : ""
            }
            onChange={(e) => {
              const [anio, mes] = e.target.value.split("-").map(Number);
              setPeriodoSeleccionado({ anio, mes });
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-gray-900 bg-white"
          >
            {periodos.map((p) => (
              <option key={`${p.anio}-${p.mes}`} value={`${p.anio}-${p.mes}`}>
                {nombreMes(p.mes)} {p.anio}
              </option>
            ))}
          </select>

          {/* Botón Generar PDF */}
          <button
            onClick={handleGenerarPdf}
            disabled={generandoPdf || loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {generandoPdf ? "Generando..." : "Generar Reporte PDF"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando datos del mes...</span>
        </div>
      ) : (
        <>
          {/* ============================================ */}
          {/* SECCIÓN 1: KPIs + COMPARATIVA               */}
          {/* ============================================ */}
          {ventasMes && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ventas totales */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <p className="text-sm text-gray-500">Ventas del Mes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatUSD(ventasMes.ventas_totales_usd)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {nombreMes(ventasMes.periodo.mes)} {ventasMes.periodo.anio}
                  </p>
                </div>

                {/* Facturas */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <p className="text-sm text-gray-500">Facturas Emitidas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {ventasMes.total_facturas}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Documentos de venta</p>
                </div>

                {/* Artículos vendidos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <p className="text-sm text-gray-500">Artículos Vendidos</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Math.round(ventasMes.total_articulos).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    {ventasMes.acumulado_anual
                    ? `${Math.round(ventasMes.acumulado_anual.articulos).toLocaleString()} en ${ventasMes.acumulado_anual.anio}`
                    : "Este mes"}
                </p>
                </div>

                {/* Variación vs mes anterior */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <p className="text-sm text-gray-500">vs Mes Anterior</p>
                  {ventasMes.variacion_porcentual !== null ? (
                    <>
                      <p
                        className={`text-2xl font-bold mt-1 ${
                          ventasMes.variacion_porcentual >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {ventasMes.variacion_porcentual >= 0 ? "+" : ""}
                        {ventasMes.variacion_porcentual.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {ventasMes.mes_anterior.tiene_datos
                          ? `Anterior: ${formatUSD(ventasMes.mes_anterior.ventas_totales_usd)}`
                          : "Sin datos previos"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-gray-400 mt-1">
                        Sin datos
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        del mes anterior
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

{/* ============================================ */}
{/* SECCIÓN 2: TOP PRODUCTOS                     */}
{/* ============================================ */}
{topProductos && (
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h2 className="text-lg font-bold text-gray-900">
        📦 Top Productos del Mes
      </h2>
      <p className="text-sm text-gray-500">
        {topProductos.estadisticas.total_productos_distintos} productos distintos ·{" "}
        {Math.round(topProductos.estadisticas.total_articulos_vendidos).toLocaleString()} unidades
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Top 5 por Cantidad */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <h3 className="text-sm font-bold text-blue-700">
            🏆 Más Vendidos por Cantidad
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {topProductos.porCantidad.map((p) => (
                <tr key={p.co_art} className="hover:bg-gray-50">
                  <td className="px-3 py-2 w-8">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-blue-600 bg-blue-100 rounded-full">
                      {p.posicion}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-medium text-gray-900 text-xs truncate max-w-[140px]">
                      {p.nombre_producto}
                    </p>
                    <p className="text-xs text-gray-400">{p.co_art}</p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <p className="font-bold text-gray-900">
                      {Math.round(p.cantidad_vendida)}
                    </p>
                    <p className="text-xs text-gray-400">unidades</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 por Monto */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-green-50 border-b border-green-100">
          <h3 className="text-sm font-bold text-green-700">
            💰 Más Vendidos por Monto
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {topProductos.porMonto.map((p) => (
                <tr key={p.co_art} className="hover:bg-gray-50">
                  <td className="px-3 py-2 w-8">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-green-600 bg-green-100 rounded-full">
                      {p.posicion}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-medium text-gray-900 text-xs truncate max-w-[140px]">
                      {p.nombre_producto}
                    </p>
                    <p className="text-xs text-gray-400">{p.co_art}</p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <p className="font-bold text-gray-900">
                      {formatUSD(p.total_usd)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.round(p.cantidad_vendida)} und
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 más Útiles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
          <h3 className="text-sm font-bold text-yellow-700">
            ⭐ Más Útiles (Ganancia)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {topProductos.masUtiles.map((p) => (
                <tr key={p.co_art} className="hover:bg-gray-50">
                  <td className="px-3 py-2 w-8">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-yellow-600 bg-yellow-100 rounded-full">
                      {p.posicion}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-medium text-gray-900 text-xs truncate max-w-[140px]">
                      {p.nombre_producto}
                    </p>
                    <p className="text-xs text-gray-400">{p.co_art}</p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <p className="font-bold text-green-600">
                      {formatUSD(p.ganancia_usd || 0)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Venta: {formatUSD(p.total_usd)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
)}

{/* ============================================ */}
{/* SECCIÓN 3: DESGLOSE DE COBROS                */}
{/* ============================================ */}
        {desgloseCobros && (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">
                💵 Desglose de Cobros del Mes
            </h2>
            <p className="text-sm text-gray-500">
                Total cobrado:{" "}
                <span className="font-bold text-green-600">
                {formatUSD(desgloseCobros.total_general_usd)}
                </span>
            </p>
            </div>

            {/* Tarjetas resumen de cobros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Efectivo USD */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💵</span>
                <p className="text-sm text-gray-500">Efectivo USD</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                {formatUSD(desgloseCobros.efectivo.total_efectivo_usd_caja)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Caja USD</p>
            </div>

            {/* Efectivo Bs convertido */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💴</span>
                <p className="text-sm text-gray-500">Efectivo Bs → USD</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                {formatUSD(desgloseCobros.efectivo.total_efectivo_bs_a_usd)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Convertido a tasa del día</p>
            </div>

            {/* Depósitos bancarios */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🏦</span>
                <p className="text-sm text-gray-500">Depósitos Bancarios</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                {formatUSD(desgloseCobros.depositos.total_depositos_usd)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                {desgloseCobros.depositos.por_banco.length} banco(s)
                </p>
            </div>

            {/* Total general */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">💰</span>
                <p className="text-sm text-blue-100">Total Cobrado</p>
                </div>
                <p className="text-xl font-bold text-white">
                {formatUSD(desgloseCobros.total_general_usd)}
                </p>
                <p className="text-xs text-blue-100 mt-1">Todos los métodos</p>
            </div>
            </div>

            {/* Tablas de detalle de cobros */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Efectivo por caja */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-700">
                    💵 Efectivo por Caja
                </h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Caja</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Cobros</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Monto Original</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">USD</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {desgloseCobros.efectivo.por_caja.map((caja) => (
                        <tr key={caja.cod_caja} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                            <p className="font-medium text-gray-900 text-xs">
                            {caja.descripcion_caja}
                            </p>
                            <p className="text-xs text-gray-400">{caja.cod_caja}</p>
                        </td>
                        <td className="px-4 py-2 text-center text-gray-600">
                            {caja.cantidad_cobros}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                            {caja.moneda_original === "BS"
                            ? `${Number(caja.monto_moneda_original).toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs`
                            : formatUSD(caja.monto_moneda_original)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                            {formatUSD(caja.monto_usd)}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Depósitos por banco */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-700">
                    🏦 Depósitos por Banco
                </h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Banco</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Depósitos</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Monto Original</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">USD</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {desgloseCobros.depositos.por_banco.map((banco) => (
                        <tr key={banco.codigo_completo} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                            <p className="font-medium text-gray-900 text-xs">
                            {banco.nombre_banco}
                            </p>
                            <p className="text-xs text-gray-400">
                            Cuenta {banco.numero_cuenta} ({banco.codigo_completo})
                            </p>
                        </td>
                        <td className="px-4 py-2 text-center text-gray-600">
                            {banco.cantidad_depositos}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                            {Number(banco.monto_moneda_original).toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                            {formatUSD(banco.monto_usd)}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
            </div>
        </div>
        )}

        {/* ============================================ */}
        {/* SECCIÓN 4: RESUMEN FINANCIERO                */}
        {/* ============================================ */}
        {resumenFinanciero && (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
            📊 Resumen Financiero (Estado Actual)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cuentas por Cobrar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <h3 className="text-sm font-bold text-red-700">
                    📥 Cuentas por Cobrar
                </h3>
                </div>
                <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Saldo total</span>
                    <span className="font-bold text-gray-900">
                    {formatUSD(resumenFinanciero.cuentas_por_cobrar.saldo_total_usd)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Documentos</span>
                    <span className="font-medium text-gray-900">
                    {resumenFinanciero.cuentas_por_cobrar.total_documentos}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Vencidos</span>
                    <span className="font-bold text-red-600">
                    {resumenFinanciero.cuentas_por_cobrar.documentos_vencidos}
                    </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">% Vencido</span>
                    <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                        {resumenFinanciero.cuentas_por_cobrar.porcentaje_vencido.toFixed(1)}%
                    </span>
                    </div>
                </div>
                </div>
            </div>

            {/* Cuentas por Pagar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                <h3 className="text-sm font-bold text-orange-700">
                    📤 Cuentas por Pagar
                </h3>
                </div>
                <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Deuda total</span>
                    <span className="font-bold text-gray-900">
                    {formatUSD(resumenFinanciero.cuentas_por_pagar.deuda_total_usd)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Cuentas vencidas</span>
                    <span className="font-bold text-red-600">
                    {resumenFinanciero.cuentas_por_pagar.cuentas_vencidas}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Por vencer</span>
                    <span className="font-medium text-green-600">
                    {resumenFinanciero.cuentas_por_pagar.cuentas_por_vencer}
                    </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Monto vencido</span>
                    <span className="font-bold text-red-600">
                        {formatUSD(resumenFinanciero.cuentas_por_pagar.monto_vencido_usd)}
                    </span>
                    </div>
                </div>
                </div>
            </div>

            {/* Stock Crítico */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-100">
                <h3 className="text-sm font-bold text-yellow-700">
                    ⚠️ Stock Crítico
                </h3>
                </div>
                <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Productos críticos</span>
                    <span className="font-bold text-red-600 text-lg">
                    {resumenFinanciero.stock_critico.total_productos_criticos}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Sin stock</span>
                    <span className="font-bold text-gray-900">
                    {resumenFinanciero.stock_critico.productos_sin_stock}
                    </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                    Productos monitoreados bajo el umbral configurado
                    </p>
                </div>
                </div>
            </div>
            </div>
        </div>
        )}
        </>
      )}
    </div>
  );
}