"use client";

import { useState, useEffect } from "react";

interface Filtros {
  lineas: { co_lin: string; lin_des: string }[];
  sub_lineas: { co_subl: string; subl_des: string; co_lin: string }[];
  marcas: { co_color: string; marca_des: string }[];
  proveedores: { co_prov: string; prov_des: string }[];
}

interface ConfigFiltersProps {
  filtros: Filtros;
  selectedLin: string;
  selectedSubl: string;
  selectedMarca: string;
  selectedProv: string;
  onLinChange: (value: string) => void;
  onSublChange: (value: string) => void;
  onMarcaChange: (value: string) => void;
  onProvChange: (value: string) => void;
  onClearAll: () => void;
}

export default function ConfigFilters({
  filtros,
  selectedLin,
  selectedSubl,
  selectedMarca,
  selectedProv,
  onLinChange,
  onSublChange,
  onMarcaChange,
  onProvChange,
  onClearAll,
}: ConfigFiltersProps) {
  // Filtrar sub-líneas según la línea seleccionada
  const subLineasFiltradas = selectedLin
    ? filtros.sub_lineas.filter((sl) => sl.co_lin === selectedLin)
    : filtros.sub_lineas;

  const hasAnyFilter = selectedLin || selectedSubl || selectedMarca || selectedProv;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro Línea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Línea
          </label>
          <select
            value={selectedLin}
            onChange={(e) => {
              onLinChange(e.target.value);
              onSublChange(""); // Reset sub-línea cuando cambia línea
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 bg-white"
          >
            <option value="">Todas las líneas</option>
            {filtros.lineas.map((lin) => (
              <option key={lin.co_lin} value={lin.co_lin}>
                {lin.lin_des}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Sub-línea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sub-línea
          </label>
          <select
            value={selectedSubl}
            onChange={(e) => onSublChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 bg-white"
          >
            <option value="">Todas las sub-líneas</option>
            {subLineasFiltradas.map((subl) => (
              <option key={subl.co_subl} value={subl.co_subl}>
                {subl.subl_des}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Marca */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marca
          </label>
          <select
            value={selectedMarca}
            onChange={(e) => onMarcaChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 bg-white"
          >
            <option value="">Todas las marcas</option>
            {filtros.marcas.map((marca) => (
              <option key={marca.co_color} value={marca.co_color}>
                {marca.marca_des}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Proveedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor
          </label>
          <select
            value={selectedProv}
            onChange={(e) => onProvChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 bg-white"
          >
            <option value="">Todos los proveedores</option>
            {filtros.proveedores.map((prov) => (
              <option key={prov.co_prov} value={prov.co_prov}>
                {prov.prov_des}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botón de limpiar filtros */}
      {hasAnyFilter && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClearAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}