"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/StatCard";
import TablaDocumentosCxC from "@/components/cuentas-cobrar/TablaDocumentosCxC";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Resumen {
  total_documentos: number;
  total_clientes: number;
  saldo_total_usd: number;
  documentos_vencidos: number;
  documentos_por_cobrar: number;
  saldo_vencido_usd: number;
  saldo_por_cobrar_usd: number;
  porcentaje_vencido: number;
  max_dias_mora: number;
}

interface AgingRango {
  rango: string;
  cantidad_documentos: number;
  cantidad_clientes: number;
  saldo_usd: number;
  orden_rango: number;
}

interface Moroso {
  co_cli: string;
  nombre_cliente: string;
  cantidad_documentos: number;
  saldo_total_usd: number;
  max_dias_mora: number;
}

export default function CuentasCobrarPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [aging, setAging] = useState<AgingRango[]>([]);
  const [morosos, setMorosos] = useState<Moroso[]>([]);
  const [loading, setLoading] = useState(true);

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [resResumen, resAging, resMorosos] = await Promise.all([
          fetch("/api/cuentas-cobrar/resumen"),
          fetch("/api/cuentas-cobrar/aging"),
          fetch("/api/cuentas-cobrar/morosos"),
        ]);

        const [dataResumen, dataAging, dataMorosos] = await Promise.all([
          resResumen.json(),
          resAging.json(),
          resMorosos.json(),
        ]);

        if (dataResumen.ok) setResumen(dataResumen.data);
        if (dataAging.ok) setAging(dataAging.data);
        if (dataMorosos.ok) setMorosos(dataMorosos.data);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Preparar datos del gráfico
  const chartData = {
    labels: aging.map((r) => r.rango),
    datasets: [
      {
        label: "Saldo (USD)",
        data: aging.map((r) => Number(r.saldo_usd.toFixed(2))),
        backgroundColor: aging.map((r) => {
          switch (r.orden_rango) {
            case 0:
              return "rgba(34, 197, 94, 0.7)"; // Verde
            case 1:
              return "rgba(234, 179, 8, 0.7)"; // Amarillo
            case 2:
              return "rgba(249, 115, 22, 0.7)"; // Naranja
            case 3:
              return "rgba(239, 68, 68, 0.7)"; // Rojo
            case 4:
              return "rgba(185, 28, 28, 0.7)"; // Rojo oscuro
            default:
              return "rgba(107, 114, 128, 0.7)"; // Gris
          }
        }),
        borderColor: aging.map((r) => {
          switch (r.orden_rango) {
            case 0:
              return "rgba(34, 197, 94, 1)";
            case 1:
              return "rgba(234, 179, 8, 1)";
            case 2:
              return "rgba(249, 115, 22, 1)";
            case 3:
              return "rgba(239, 68, 68, 1)";
            case 4:
              return "rgba(185, 28, 28, 1)";
            default:
              return "rgba(107, 114, 128, 1)";
          }
        }),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const value = context.parsed.y;
            return `Saldo: ${formatUSD(value)}`;
          },
          afterLabel: function (context: any) {
            const index = context.dataIndex;
            const rango = aging[index];
            return `${rango.cantidad_documentos} documentos de ${rango.cantidad_clientes} clientes`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "$" + Number(value).toLocaleString();
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando cuentas por cobrar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cuentas por Cobrar</h1>
        <p className="text-gray-500">
          Gestión de cobros pendientes y análisis de morosidad de clientes
        </p>
      </div>

      {/* Tarjetas KPI */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Saldo Total"
            value={formatUSD(resumen.saldo_total_usd)}
            subtitle={`${resumen.total_documentos} documentos de ${resumen.total_clientes} clientes`}
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
            title="% Vencido"
            value={`${resumen.porcentaje_vencido.toFixed(1)}%`}
            subtitle={`${resumen.documentos_vencidos} documentos vencidos`}
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
            title="Saldo Vencido"
            value={formatUSD(resumen.saldo_vencido_usd)}
            subtitle={`${formatUSD(resumen.saldo_por_cobrar_usd)} por cobrar`}
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />

          <StatCard
            title="Max Días Mora"
            value={`${resumen.max_dias_mora} días`}
            subtitle="Cliente más atrasado"
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
          />
        </div>
      )}

      {/* Gráfico de Aging */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          Antigüedad de Saldos (Aging)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Distribución de la deuda por rangos de vencimiento
        </p>
        <div className="h-80">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Tabla de Top 10 Morosos 
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Top 10 Clientes Morosos
          </h3>
          <p className="text-sm text-gray-500">
            Clientes con mayor saldo vencido ordenados por monto
          </p>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  #
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Código
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">
                  Cliente
                </th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">
                  Documentos
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  Saldo Total USD
                </th>
                <th className="px-6 py-3 text-center font-medium text-gray-500">
                  Max Días Mora
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {morosos.map((moroso, index) => (
                <tr key={moroso.co_cli} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                      {moroso.co_cli}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 truncate max-w-xs">
                      {moroso.nombre_cliente}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {moroso.cantidad_documentos}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-red-600">
                    {formatUSD(Number(moroso.saldo_total_usd))}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        moroso.max_dias_mora > 90
                          ? "bg-red-100 text-red-700"
                          : moroso.max_dias_mora > 60
                          ? "bg-orange-100 text-orange-700"
                          : moroso.max_dias_mora > 30
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {moroso.max_dias_mora} días
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {morosos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay clientes morosos
          </div>
        )}
      </div>*/}
      <TablaDocumentosCxC/>
    </div>
  );
}