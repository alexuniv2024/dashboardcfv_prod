// ============================================
// GENERADOR DE PDF - REPORTE MENSUAL DE VENTAS
// ============================================

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface VentasMesPDF {
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
    ventas_totales_usd: number;
    total_facturas: number;
    tiene_datos: boolean;
  };
  variacion_porcentual: number | null;
}

interface ProductoPDF {
  posicion: number;
  co_art: string;
  nombre_producto: string;
  cantidad_vendida: number;
  total_usd: number;
  ganancia_usd?: number;
}

interface TopProductosPDF {
  porCantidad: ProductoPDF[];
  porMonto: ProductoPDF[];
  masUtiles: ProductoPDF[];
}

interface DesgloseCobrosPDF {
  efectivo: {
    por_caja: {
      cod_caja: string;
      descripcion_caja: string;
      moneda_original: string;
      cantidad_cobros: number;
      monto_moneda_original: number;
      monto_usd: number;
    }[];
    total_efectivo_usd: number;
    total_efectivo_usd_caja: number;
    total_efectivo_bs_a_usd: number;
  };
  depositos: {
    por_banco: {
      codigo_completo: string;
      nombre_banco: string;
      numero_cuenta: string;
      cantidad_depositos: number;
      monto_usd: number;
    }[];
    total_depositos_usd: number;
  };
  total_general_usd: number;
}

interface ResumenFinancieroPDF {
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

const formatUSD = (value: number) => {
  return "$" + Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ============================================
// ✨ NUEVO: Helper para evitar que los títulos
// se junten con el pie de página.
// Si no hay espacio suficiente, salta a página nueva.
// ============================================
function ensureSpace(doc: any, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 15) {
    doc.addPage();
    return 20;
  }
  return y;
}

export async function generarPdfMensual(
  periodo: { anio: number; mes: number },
  ventasMes: VentasMesPDF,
  topProductos: TopProductosPDF,
  desgloseCobros: DesgloseCobrosPDF,
  resumenFinanciero: ResumenFinancieroPDF,
  usuarioEmail: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const AZUL = [37, 99, 235] as [number, number, number];
  const VERDE = [22, 163, 74] as [number, number, number];
  const AMARILLO = [234, 179, 8] as [number, number, number];
  const GRIS = [107, 114, 128] as [number, number, number];
  const GRIS_OSCURO = [55, 65, 81] as [number, number, number];

  const nombreMes = NOMBRES_MESES[periodo.mes - 1] || "";

  // ============================================
  // 1. ENCABEZADO
  // ============================================
  doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CENTRO FERRETERO VERA C.A.", 14, 14);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Reporte Mensual de Ventas - ${nombreMes} ${periodo.anio}`, 14, 23);

  // ============================================
  // 2. METADATOS
  // ============================================
  const fechaGeneracion = new Date().toLocaleString("es-VE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  doc.setTextColor(GRIS_OSCURO[0], GRIS_OSCURO[1], GRIS_OSCURO[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha de generación: ${fechaGeneracion}`, 14, 42);
  doc.text(`Generado por: ${usuarioEmail}`, 14, 47);
  doc.text(`Período: ${nombreMes} ${periodo.anio}`, 14, 52);

  // ============================================
  // 3. SECCIÓN VENTAS DEL MES
  // ============================================
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. VENTAS DEL MES", 14, 64);

  const variacionTexto =
    ventasMes.variacion_porcentual !== null
      ? `${ventasMes.variacion_porcentual >= 0 ? "+" : ""}${ventasMes.variacion_porcentual.toFixed(1)}% vs mes anterior`
      : "Sin datos del mes anterior";

  autoTable(doc, {
    startY: 68,
    head: [["Ventas Totales", "Facturas", "Artículos Vendidos", "Variación"]],
    body: [[
      formatUSD(ventasMes.ventas_totales_usd),
      String(ventasMes.total_facturas),
      String(Math.round(ventasMes.total_articulos)),
      variacionTexto,
    ]],
    theme: "grid",
    headStyles: { fillColor: AZUL, textColor: [255,255,255], halign: "center", fontStyle: "bold", fontSize: 9 },
    bodyStyles: { halign: "center", fontSize: 10 },
    styles: { cellPadding: 4 },
  });

  let cursorY = (doc as any).lastAutoTable.finalY;
  if (ventasMes.acumulado_anual) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.text(
      `Acumulado ${ventasMes.acumulado_anual.anio}: ${formatUSD(ventasMes.acumulado_anual.ventas_usd)} en ventas · ${ventasMes.acumulado_anual.facturas} facturas · ${Math.round(ventasMes.acumulado_anual.articulos).toLocaleString()} artículos`,
      14, cursorY + 6
    );
    cursorY += 6;
  }

  // ============================================
  // 4. SECCIÓN DESGLOSE DE COBROS
  // ============================================
  cursorY = ensureSpace(doc, cursorY, 55); // ✨ evita juntarse con el pie
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRIS_OSCURO[0], GRIS_OSCURO[1], GRIS_OSCURO[2]);
  doc.text("2. DESGLOSE DE COBROS", 14, cursorY + 16);

  autoTable(doc, {
    startY: cursorY + 20,
    // ✨ Cambié "→" por "a USD" (la fuente no soporta la flecha)
    head: [["Efectivo USD", "Efectivo Bs a USD", "Depósitos Bancarios", "TOTAL COBRADO"]],
    body: [[
      formatUSD(desgloseCobros.efectivo.total_efectivo_usd_caja),
      formatUSD(desgloseCobros.efectivo.total_efectivo_bs_a_usd),
      formatUSD(desgloseCobros.depositos.total_depositos_usd),
      formatUSD(desgloseCobros.total_general_usd),
    ]],
    theme: "grid",
    headStyles: { fillColor: VERDE, textColor: [255,255,255], halign: "center", fontStyle: "bold", fontSize: 9 },
    bodyStyles: { halign: "center", fontSize: 10 },
    styles: { cellPadding: 4 },
    columnStyles: { 3: { fontStyle: "bold" } },
  });

  cursorY = (doc as any).lastAutoTable.finalY;

  // --- Efectivo por caja ---
  cursorY = ensureSpace(doc, cursorY, 50); // ✨
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Efectivo por Caja", 14, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 11,
    head: [["Caja", "Cobros", "Monto Original", "USD"]],
    body: desgloseCobros.efectivo.por_caja.map((caja) => [
      caja.descripcion_caja,
      String(caja.cantidad_cobros),
      caja.moneda_original === "BS"
        ? `${Number(caja.monto_moneda_original).toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs`
        : formatUSD(caja.monto_moneda_original),
      formatUSD(caja.monto_usd),
    ]),
    theme: "striped",
    headStyles: { fillColor: AZUL, textColor: [255,255,255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    styles: { cellPadding: 2 },
  });

  cursorY = (doc as any).lastAutoTable.finalY;

  // --- Depósitos por banco ---
  cursorY = ensureSpace(doc, cursorY, 50); // ✨
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Depósitos por Banco", 14, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 11,
    head: [["Banco", "Cuenta", "Depósitos", "USD"]],
    body: desgloseCobros.depositos.por_banco.map((banco) => [
      banco.nombre_banco,
      banco.numero_cuenta,
      String(banco.cantidad_depositos),
      formatUSD(banco.monto_usd),
    ]),
    theme: "striped",
    headStyles: { fillColor: AZUL, textColor: [255,255,255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 2: { halign: "center" }, 3: { halign: "right", fontStyle: "bold" } },
    styles: { cellPadding: 2 },
  });

  cursorY = (doc as any).lastAutoTable.finalY;

  // ============================================
  // 5. SECCIÓN TOP PRODUCTOS
  // ============================================
  cursorY = ensureSpace(doc, cursorY, 55); // ✨
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRIS_OSCURO[0], GRIS_OSCURO[1], GRIS_OSCURO[2]);
  doc.text("3. TOP PRODUCTOS DEL MES", 14, cursorY + 14);

  // --- Más vendidos por cantidad ---
  doc.setFontSize(10);
  doc.text("Más Vendidos por Cantidad", 14, cursorY + 22);

  autoTable(doc, {
    startY: cursorY + 25,
    head: [["#", "Código", "Producto", "Cantidad", "Monto USD"]],
    body: topProductos.porCantidad.map((p) => [
      String(p.posicion), p.co_art, p.nombre_producto,
      String(Math.round(p.cantidad_vendida)), formatUSD(p.total_usd),
    ]),
    theme: "striped",
    headStyles: { fillColor: AZUL, textColor: [255,255,255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { halign: "center", cellWidth: 10 }, 3: { halign: "center" }, 4: { halign: "right" } },
    styles: { cellPadding: 2 },
  });

  cursorY = (doc as any).lastAutoTable.finalY;

  // --- Más útiles ---
  cursorY = ensureSpace(doc, cursorY, 55); // ✨ clave: evita el choque con el pie
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Más Útiles (Mayor Ganancia)", 14, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 11,
    head: [["#", "Código", "Producto", "Ganancia USD", "Venta USD"]],
    body: topProductos.masUtiles.map((p) => [
      String(p.posicion), p.co_art, p.nombre_producto,
      formatUSD(p.ganancia_usd || 0), formatUSD(p.total_usd),
    ]),
    theme: "striped",
    headStyles: { fillColor: AMARILLO, textColor: [255,255,255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { halign: "center", cellWidth: 10 }, 3: { halign: "right", fontStyle: "bold", textColor: VERDE }, 4: { halign: "right" } },
    styles: { cellPadding: 2 },
  });

  cursorY = (doc as any).lastAutoTable.finalY;

  // ============================================
  // 6. SECCIÓN RESUMEN FINANCIERO
  // ============================================
  cursorY = ensureSpace(doc, cursorY, 60); // ✨
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRIS_OSCURO[0], GRIS_OSCURO[1], GRIS_OSCURO[2]);
  doc.text("4. RESUMEN FINANCIERO (Estado Actual)", 14, cursorY + 14);

  const cxc = resumenFinanciero.cuentas_por_cobrar;
  const cxp = resumenFinanciero.cuentas_por_pagar;
  const stock = resumenFinanciero.stock_critico;

  autoTable(doc, {
    startY: cursorY + 18,
    head: [["Cuentas por Cobrar", "Cuentas por Pagar", "Stock Crítico"]],
    body: [
      [
        `Saldo: ${formatUSD(cxc.saldo_total_usd)}`,
        `Deuda: ${formatUSD(cxp.deuda_total_usd)}`,
        `Productos críticos: ${stock.total_productos_criticos}`,
      ],
      [
        `Vencidos: ${cxc.documentos_vencidos} (${cxc.porcentaje_vencido.toFixed(1)}%)`,
        `Vencidas: ${cxp.cuentas_vencidas}`,
        `Sin stock: ${stock.productos_sin_stock}`,
      ],
      [
        `Clientes: ${cxc.total_clientes}`,
        `Por vencer: ${cxp.cuentas_por_vencer} (${formatUSD(cxp.monto_por_vencer_usd)})`,
        `Monitoreados bajo umbral`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: GRIS_OSCURO, textColor: [255,255,255], halign: "center", fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8, valign: "top" },
    styles: { cellPadding: 3 },
  });

  // ============================================
  // 7. NÚMEROS DE PÁGINA
  // ============================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.text("Sistema de Gestión y Dashboard CFV - Reporte generado automáticamente", 14, pageHeight - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }

  // ============================================
  // 8. DESCARGAR
  // ============================================
  doc.save(`Reporte_Mensual_${nombreMes}_${periodo.anio}.pdf`);
}