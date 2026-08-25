"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface VentaMes {
  mes: number;
  total_facturas: number;
  total_ventas_usd: number;
}

interface MonthlySalesChartProps {
  data: VentaMes[];
}

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

export default function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  // Crear array completo de 12 meses (con ceros para meses sin datos)
  const ventasPorMes = Array(12).fill(0);
  const facturasPorMes = Array(12).fill(0);

  data.forEach((item) => {
    const mesIndex = item.mes - 1; // Restar 1 porque los meses van de 1-12
    ventasPorMes[mesIndex] = Number(item.total_ventas_usd.toFixed(2));
    facturasPorMes[mesIndex] = item.total_facturas;
  });

  const chartData = {
    labels: MESES,
    datasets: [
      {
        label: "Ventas (USD)",
        data: ventasPorMes,
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4, // Suaviza la línea
        pointRadius: 4,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
      {
        label: "Facturas",
        data: facturasPorMes,
        borderColor: "rgba(16, 185, 129, 1)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "rgba(16, 185, 129, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        yAxisID: "y1", // Eje Y secundario
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            if (context.dataset.label === "Ventas (USD)") {
              return `Ventas: $${context.parsed.y.toLocaleString()}`;
            }
            return `Facturas: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "$" + Number(value).toLocaleString();
          },
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="h-80">
      <Line data={chartData} options={options} />
    </div>
  );
}