"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartEvent,
  type ActiveElement,
  type Chart,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ClienteDeuda {
  codigo_cliente: string;
  nombre_cliente: string;
  saldo_total_usd: number;
}

interface DebtChartProps {
  data: ClienteDeuda[];
}

const COLORS = [
  "rgba(239, 68, 68, 0.8)",
  "rgba(249, 115, 22, 0.8)",
  "rgba(245, 158, 11, 0.8)",
  "rgba(234, 179, 8, 0.8)",
  "rgba(132, 204, 22, 0.8)",
  "rgba(34, 197, 94, 0.8)",
  "rgba(20, 184, 166, 0.8)",
  "rgba(6, 182, 212, 0.8)",
  "rgba(59, 130, 246, 0.8)",
  "rgba(99, 102, 241, 0.8)",
];

export default function DebtChart({ data }: DebtChartProps) {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const chartRef = useRef<Chart<"doughnut"> | null>(null);

  // Inicializar selección cuando los datos se cargan por primera vez
  useEffect(() => {
    if (!initialized && data.length > 0) {
      setSelectedClients(data.map((c) => c.codigo_cliente));
      setInitialized(true);
    }
  }, [data, initialized]);

  // Filtrar datos según la selección
  const filteredData = useMemo(() => {
    return data.filter((c) => selectedClients.includes(c.codigo_cliente));
  }, [data, selectedClients]);

  // Obtener color de un cliente por su código
  const getColor = (codigo: string) => {
    const index = data.findIndex((d) => d.codigo_cliente === codigo);
    return COLORS[index % COLORS.length];
  };

  // Toggle de un cliente
  const toggleClient = (codigo: string) => {
    setSelectedClients((prev) =>
      prev.includes(codigo)
        ? prev.filter((c) => c !== codigo)
        : [...prev, codigo]
    );
  };

  const selectAll = () => setSelectedClients(data.map((c) => c.codigo_cliente));
  const clearAll = () => setSelectedClients([]);

  // Total de deuda seleccionada
  const totalSelected = filteredData.reduce(
    (sum, c) => sum + c.saldo_total_usd,
    0
  );

  // ✅ AHORA EL ONCLICK ESTÁ DENTRO DE OPTIONS (firma correcta de Chart.js)
  const handleChartClick = (event: ChartEvent, elements: ActiveElement[]) => {
    if (elements && elements.length > 0) {
      const index = elements[0].index;
      const codigo = filteredData[index].codigo_cliente;
      toggleClient(codigo);
    }
  };

  const chartData = {
    labels: filteredData.map((c) => c.nombre_cliente.trim()),
    datasets: [
      {
        data: filteredData.map((c) => Number(c.saldo_total_usd.toFixed(2))),
        backgroundColor: filteredData.map((c) => getColor(c.codigo_cliente)),
        borderColor: filteredData.map((c) =>
          getColor(c.codigo_cliente).replace("0.8", "1")
        ),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // 👇 EL onClick VA AQUÍ, dentro de options
    onClick: handleChartClick,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const value = context.parsed;
            return `$${value.toLocaleString()}`;
          },
        },
      },
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Total de deuda seleccionada */}
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Total Deuda Seleccionada</p>
        <p className="text-2xl font-bold text-red-600">
          $
          {totalSelected.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-gray-400">
          {filteredData.length} de {data.length} clientes
        </p>
      </div>

      {/* Grid: Gráfico + Checkboxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico */}
        <div className="h-64">
          {filteredData.length > 0 ? (
            <Doughnut
              ref={chartRef}
              data={chartData}
              options={options}
              // ❌ YA NO VA AQUÍ: onClick={handleChartClick}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No hay clientes seleccionados
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col">
          {/* Botones de control */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={selectAll}
              className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              Todos
            </button>
            <button
              onClick={clearAll}
              className="text-xs px-3 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition"
            >
              Ninguno
            </button>
          </div>

          {/* Lista de checkboxes con scroll */}
          <div className="flex-1 overflow-y-auto max-h-48 space-y-1 pr-2">
            {data.map((cliente) => {
              const isChecked = selectedClients.includes(
                cliente.codigo_cliente
              );
              const color = getColor(cliente.codigo_cliente);
              return (
                <label
                  key={cliente.codigo_cliente}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleClient(cliente.codigo_cliente)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  ></span>
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {cliente.nombre_cliente.trim()}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    $
                    {cliente.saldo_total_usd.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}