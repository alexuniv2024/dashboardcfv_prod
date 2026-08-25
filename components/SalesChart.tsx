"use client";

import { useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartEvent,
  type ActiveElement,
  type Chart,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface VentaDia {
  fecha: string;
  total_facturas: number;
  total_ventas_usd: number;
}

interface SalesChartProps {
  data: VentaDia[];
  fechaInicio?: string | null;
  fechaFin?: string | null;
  esDataReciente?: boolean;
  onBarClick?: (fecha: string) => void;
}

// Función para formatear fecha a YYYY-MM-DD sin problemas de timezone
function formatFechaLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Función para generar el rango completo de días (rellenando huecos con cero)
function generarRangoCompleto(
  fechaInicio: string,
  fechaFin: string,
  data: VentaDia[]
): VentaDia[] {
  const resultado: VentaDia[] = [];
  const mapaDatos = new Map(data.map((d) => [d.fecha, d]));

  const inicio = new Date(fechaInicio + "T00:00:00");
  const fin = new Date(fechaFin + "T00:00:00");
  const actual = new Date(inicio);

  while (actual <= fin) {
    const fechaStr = formatFechaLocal(actual);
    const datoExistente = mapaDatos.get(fechaStr);

    if (datoExistente) {
      resultado.push(datoExistente);
    } else {
      // Día sin facturas: rellenar con cero
      resultado.push({
        fecha: fechaStr,
        total_facturas: 0,
        total_ventas_usd: 0,
      });
    }

    actual.setDate(actual.getDate() + 1);
  }

  return resultado;
}

export default function SalesChart({
  data,
  fechaInicio,
  fechaFin,
  esDataReciente = true,
  onBarClick,
}: SalesChartProps) {
  const chartRef = useRef<Chart<"bar"> | null>(null);

  // Rellenar los días sin datos
  const dataCompleta = useMemo(() => {
    if (!fechaInicio || !fechaFin) return data;
    return generarRangoCompleto(fechaInicio, fechaFin, data);
  }, [data, fechaInicio, fechaFin]);

  const labels = dataCompleta.map((d) => {
    const date = new Date(d.fecha + "T00:00:00");
    return date.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
    });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: "Ventas (USD)",
        data: dataCompleta.map((d) => Number(d.total_ventas_usd.toFixed(2))),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: "rgba(59, 130, 246, 0.9)",
      },
    ],
  };

  const handleClick = (event: ChartEvent, elements: ActiveElement[]) => {
    if (elements && elements.length > 0 && onBarClick) {
      const index = elements[0].index;
      const fecha = dataCompleta[index].fecha;
      onBarClick(fecha);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleClick,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `Ventas: $${context.parsed.y.toLocaleString()}`;
          },
          afterLabel: function () {
            return "🖱️ Click para ver detalle";
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

  // Etiqueta del rango de fechas
  const formatFechaCorta = (fecha: string) => {
    const date = new Date(fecha + "T00:00:00");
    return date.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="h-64 flex flex-col">
      <Bar ref={chartRef} data={chartData} options={options} />

      {/* Etiqueta del rango de fechas */}
      {fechaInicio && fechaFin && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          {esDataReciente ? (
            <span className="text-gray-400">
              💡 Últimos 7 días - Haz click en una barra para ver detalle
            </span>
          ) : (
            <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">
              ⚠️ Mostrando últimos 7 días con datos disponibles (
              {formatFechaCorta(fechaInicio)} al {formatFechaCorta(fechaFin)})
            </span>
          )}
        </div>
      )}
    </div>
  );
}