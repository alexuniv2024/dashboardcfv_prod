"use client";

import { useState } from "react";

interface Producto {
  producto_id: string;
  nombre: string;
  stock_actual: string;
  stock_min_profit: string;
  nombre_linea: string;
  nombre_sub_linea: string;
  nombre_marca: string;
  nombre_proveedor: string;
  config_id: number | null;
  umbral_minimo: number | null;
  monitoreado: boolean | null;
}

interface ProductConfigTableProps {
  productos: Producto[];
  onToggleMonitoreo: (producto: Producto) => void;
  onUpdateUmbral: (producto: Producto, nuevoUmbral: number) => void;
}

export default function ProductConfigTable({
  productos,
  onToggleMonitoreo,
  onUpdateUmbral,
}: ProductConfigTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempUmbral, setTempUmbral] = useState<string>("");

  const handleEditClick = (producto: Producto) => {
    setEditingId(producto.producto_id);
    setTempUmbral(producto.umbral_minimo?.toString() || "");
  };

  const handleSaveUmbral = (producto: Producto) => {
    const valor = parseFloat(tempUmbral);
    if (!isNaN(valor) && valor >= 0) {
      onUpdateUmbral(producto, valor);
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTempUmbral("");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Código
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Producto
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Línea / Sub-línea
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Marca
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">
                Stock Actual
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">
                Min Profit
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">
                Umbral Personalizado
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">
                Monitorear
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {productos.map((producto) => {
              const isEditing = editingId === producto.producto_id;
              const stockActual = parseFloat(producto.stock_actual);
              const stockMinProfit = parseFloat(producto.stock_min_profit);
              const umbralActivo = producto.monitoreado;
              const umbralValor = producto.umbral_minimo;

              // Determinar si está por debajo del umbral
              const estaBajoUmbral =
                umbralActivo &&
                umbralValor !== null &&
                stockActual <= umbralValor;

              return (
                <tr
                  key={producto.producto_id}
                  className={`hover:bg-gray-50 transition ${
                    estaBajoUmbral ? "bg-red-50" : ""
                  }`}
                >
                  {/* Código */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                      {producto.producto_id}
                    </span>
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-xs">
                      {producto.nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {producto.nombre_proveedor}
                    </p>
                  </td>

                  {/* Línea / Sub-línea */}
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{producto.nombre_linea}</p>
                    <p className="text-xs text-gray-500">
                      {producto.nombre_sub_linea}
                    </p>
                  </td>

                  {/* Marca */}
                  <td className="px-4 py-3">
                    <span className="text-gray-700">{producto.nombre_marca}</span>
                  </td>

                  {/* Stock Actual */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full ${
                        stockActual === 0
                          ? "bg-red-100 text-red-700"
                          : stockActual <= stockMinProfit
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {stockActual}
                    </span>
                  </td>

                  {/* Min Profit */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-600">{stockMinProfit}</span>
                  </td>

                  {/* Umbral Personalizado */}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          value={tempUmbral}
                          onChange={(e) => setTempUmbral(e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-20 px-2 py-1 border border-blue-500 rounded text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveUmbral(producto);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={() => handleSaveUmbral(producto)}
                          className="text-green-600 hover:text-green-700"
                          title="Guardar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-700"
                          title="Cancelar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        {umbralActivo ? (
                          <>
                            <span className="font-semibold text-blue-600">
                              {umbralValor}
                            </span>
                            <button
                              onClick={() => handleEditClick(producto)}
                              className="text-gray-400 hover:text-blue-600"
                              title="Editar umbral"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs italic">
                            Sin configurar
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Switch Monitorear */}
                  <td className="px-4 py-3 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={umbralActivo || false}
                        onChange={() => onToggleMonitoreo(producto)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {productos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron productos con los filtros aplicados
        </div>
      )}
    </div>
  );
}