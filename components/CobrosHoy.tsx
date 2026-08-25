"use client";

import { useState, useEffect } from "react";

interface CobrosHoyData {
  efectivo_usd: number;
  efectivo_bs_usd: number;
  depositos_usd: number;
  total_usd: number;
  cantidad_cobros: number;
}

export default function CobrosHoy() {
  const [data, setData] = useState<CobrosHoyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch("/api/profit/dashboard/cobros-hoy");
        // Si el rol no tiene acceso, ocultamos la tarjeta
        if (res.status === 403) {
          setVisible(false);
          return;
        }
        const json = await res.json();
        if (json.ok) setData(json.data);
      } catch (error) {
        console.error("Error al cargar cobros de hoy:", error);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value || 0);

  // Si el rol no tiene acceso, no mostramos nada
  if (!visible) return null;

  // Skeleton mientras carga
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">💵 Cobros de Hoy</h3>
        <span className="text-xs text-gray-400">
          {data.cantidad_cobros} cobro{data.cantidad_cobros !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Total */}
      <p className="text-2xl font-bold text-green-600">
        {formatUSD(data.total_usd)}
      </p>

      {/* Desglose */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase">Efectivo USD</p>
          <p className="text-xs font-semibold text-gray-800 mt-0.5">
            {formatUSD(data.efectivo_usd)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase">Efectivo Bs</p>
          <p className="text-xs font-semibold text-gray-800 mt-0.5">
            {formatUSD(data.efectivo_bs_usd)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-400 uppercase">Depósitos</p>
          <p className="text-xs font-semibold text-gray-800 mt-0.5">
            {formatUSD(data.depositos_usd)}
          </p>
        </div>
      </div>
    </div>
  );
}