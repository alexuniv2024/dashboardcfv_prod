"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import SalesChart from "@/components/SalesChart";
import DebtChart from "@/components/DebtChart";
import MonthlySalesChart from "@/components/MonthlySalesChart";
import RefreshStatusBar from "@/components/RefreshStatusBar";
import SalesDetailModal from "@/components/SalesDetailModal";
import CobrosHoy from "@/components/CobrosHoy";
import StockCritico from "@/components/StockCritico";

interface VentasHoy {
  total_facturas: number;
  total_ventas_usd: number;
  total_iva: number;
}

interface VentaDia {
  fecha: string;
  total_facturas: number;
  total_ventas_usd: number;
}

interface CxcResumen {
  codigo_cliente: string;
  nombre_cliente: string;
  cantidad_facturas: number;
  saldo_total_usd: number;
  max_dias_mora: number;
}

interface StockCritico {
  codigo: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
}

interface VentaMes {
  mes: number;
  total_facturas: number;
  total_ventas_usd: number;
}


export default function DashboardPage() {
  const [ventas, setVentas] = useState<VentasHoy | null>(null);
  const [ventas7dias, setVentas7dias] = useState<VentaDia[]>([]);
  const [cxcResumen, setCxcResumen] = useState<CxcResumen[]>([]);
  const [stockCritico, setStockCritico] = useState<StockCritico[]>([]);
  const [ventasMensual, setVentasMensual] = useState<VentaMes[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFecha, setSelectedFecha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechaInicio7dias, setFechaInicio7dias] = useState<string | null>(null);
  const [fechaFin7dias, setFechaFin7dias] = useState<string | null>(null);
  const [esDataReciente, setEsDataReciente] = useState(true);

  // Estados para búsqueda
  const [busquedaCxc, setBusquedaCxc] = useState("");
  const [busquedaStock, setBusquedaStock] = useState("");

  // Función que carga todos los datos
const fetchData = async () => {
  try {
    setIsRefreshing(true);

    const resVentas = await fetch("/api/profit/dashboard/ventas-hoy");
    const dataVentas = await resVentas.json();
    if (dataVentas.ok) setVentas(dataVentas.data);

    const resVentas7 = await fetch("/api/profit/dashboard/ventas-7dias");
    const dataVentas7 = await resVentas7.json();
      if (dataVentas7.ok) {
      setVentas7dias(dataVentas7.data);
      setFechaInicio7dias(dataVentas7.fecha_inicio);
      setFechaFin7dias(dataVentas7.fecha_fin);
      setEsDataReciente(dataVentas7.es_data_reciente);
    }

    const resMensual = await fetch("/api/profit/dashboard/ventas-mensual");
    const dataMensual = await resMensual.json();
    if (dataMensual.ok) setVentasMensual(dataMensual.data);

    const resCxc = await fetch("/api/profit/dashboard/cxc-resumen");
    const dataCxc = await resCxc.json();
    if (dataCxc.ok) setCxcResumen(dataCxc.data);

    const resStock = await fetch("/api/profit/dashboard/stock-critico");
    const dataStock = await resStock.json();
    if (dataStock.ok) setStockCritico(dataStock.data);

    setLastUpdate(new Date());
  } catch (err) {
    console.error("Error al cargar datos:", err);
  } finally {
    setIsRefreshing(false);
    setLoading(false);
  }
};

// Cargar datos al montar el componente
useEffect(() => {
  fetchData();
}, []);

  // Filtrado de CxC
  const cxcFiltrado = busquedaCxc.trim()
    ? cxcResumen.filter(
        (c) =>
          c.nombre_cliente.toLowerCase().includes(busquedaCxc.toLowerCase()) ||
          c.codigo_cliente.toLowerCase().includes(busquedaCxc.toLowerCase())
      )
    : cxcResumen;

  // Filtrado de Stock
  const stockFiltrado = busquedaStock.trim()
    ? stockCritico.filter(
        (item) =>
          item.nombre.toLowerCase().includes(busquedaStock.toLowerCase()) ||
          item.codigo.toLowerCase().includes(busquedaStock.toLowerCase())
      )
    : stockCritico;

  const totalCxcVencido = cxcResumen.reduce((sum, c) => sum + c.saldo_total_usd, 0);
  const totalStockCritico = stockCritico.length;

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Barra de estado de actualización */}
      <RefreshStatusBar
        lastUpdate={lastUpdate}
        isRefreshing={isRefreshing}
        onRefresh={fetchData} secondsUntilNext={0}      />

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ventas de Hoy"
          value={formatUSD(ventas?.total_ventas_usd || 0)}
          subtitle={`${ventas?.total_facturas || 0} facturas`}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="CxC Vencida"
          value={formatUSD(totalCxcVencido)}
          subtitle={`${cxcResumen.length} clientes`}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />

        <StatCard
          title="Stock Crítico"
          value={totalStockCritico.toString()}
          subtitle="Productos sin stock"
          color="yellow"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />

        <StatCard
          title="Facturas Emitidas"
          value={(ventas?.total_facturas || 0).toString()}
          subtitle="Hoy"
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>
      <CobrosHoy />

      {/* Gráficos - Fila 1: Ventas 7 días y Mensual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ventas 7 días */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Ventas Últimos 7 Días
          </h3>
          <p className="text-sm text-gray-500 mb-4">Tendencia de facturación en USD</p>
          <SalesChart
            data={ventas7dias}
            fechaInicio={fechaInicio7dias}
            fechaFin={fechaFin7dias}
            esDataReciente={esDataReciente}
            onBarClick={(fecha) => setSelectedFecha(fecha)}
          />
        </div>

        {/* Gráfico Lineal Mensual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Evolución Mensual
              </h3>
              <p className="text-sm text-gray-500">
                Año {new Date().getFullYear()}
              </p>
            </div>
          </div>
          <MonthlySalesChart data={ventasMensual} />
        </div>
      </div>

      {/* Gráfico de Deuda - Ancho completo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Deuda Vencida por Cliente
            </h3>
            <p className="text-sm text-gray-500">
              Distribución del saldo pendiente - Haz clic en el gráfico o usa los
              checkboxes
            </p>
          </div>
        </div>
        <DebtChart data={cxcResumen} />
      </div>


      {/* Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla CxC Vencido */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Clientes con Deuda Vencida
            </h3>
            <p className="text-sm text-gray-500 mb-3">Top 10 por monto adeudado</p>

            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={busquedaCxc}
                onChange={(e) => setBusquedaCxc(e.target.value)}
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

          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Cliente</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Facturas</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Saldo USD</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cxcFiltrado.map((cliente) => (
                  <tr key={cliente.codigo_cliente} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {cliente.nombre_cliente.trim()}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {cliente.cantidad_facturas}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-red-600">
                      {formatUSD(cliente.saldo_total_usd)}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {cliente.max_dias_mora}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {cxcFiltrado.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No se encontraron clientes
              </div>
            )}
          </div>
        </div>

        {/* Tabla Stock Crítico */}


          <StockCritico />
          
        
      </div>
      {/* Modal de detalle de ventas */}
    {selectedFecha && (
      <SalesDetailModal
        isOpen={!!selectedFecha}
        onClose={() => setSelectedFecha(null)}
        fecha={selectedFecha}
      />
    )}
    </div>
  );
}