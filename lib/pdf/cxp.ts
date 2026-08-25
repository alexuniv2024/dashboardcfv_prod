// ============================================
// GENERADOR DE PDF - CUENTAS POR PAGAR
// ============================================
// Usa dynamic import para cargar jsPDF solo cuando
// se necesita (evita problemas en el build de Next.js)

interface CuentaPDF {
  tipo_doc: string;
  nro_doc: number;
  co_prov: string;
  nombre_proveedor: string;
  fec_emis: string;
  fec_venc: string;
  monto_net_usd: number;
  saldo_usd: number;
  dias_restantes: number;
  estado: string;
}

interface StatsPDF {
  total_cuentas: number;
  deuda_total_usd: number;
  cuentas_vencidas: number;
  cuentas_por_vencer: number;
  monto_vencido_usd: number;
  monto_por_vencer_usd: number;
}

// Formatear monto a USD
const formatUSD = (value: number) => {
  return "$" + Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Formatear fecha a DD/MM/YYYY
const formatFecha = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Texto de días según estado
const getDiasText = (cuenta: CuentaPDF) => {
  if (cuenta.estado === "vencida") {
    return `${Math.abs(cuenta.dias_restantes)} días mora`;
  }
  if (cuenta.estado === "hoy") return "Vence hoy";
  return `${cuenta.dias_restantes} días`;
};

// Texto del estado
const getEstadoText = (estado: string) => {
  switch (estado) {
    case "vencida":
      return "VENCIDA";
    case "hoy":
      return "HOY";
    case "proxima":
      return "PRÓXIMA";
    default:
      return "NORMAL";
  }
};

export async function generarPdfCxP(
  cuentas: CuentaPDF[],
  stats: StatsPDF,
  usuarioEmail: string
): Promise<void> {
  // Dynamic import para cargar jsPDF solo en el cliente
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colores
  const AZUL = [37, 99, 235] as [number, number, number];
  const ROJO = [220, 38, 38] as [number, number, number];
  const GRIS = [107, 114, 128] as [number, number, number];
  const GRIS_OSCURO = [55, 65, 81] as [number, number, number];

  // ============================================
  // 1. ENCABEZADO (banda azul)
  // ============================================
  doc.setFillColor(AZUL[0], AZUL[1], AZUL[2]);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CENTRO FERRETERO VERA C.A.", 14, 14);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Reporte de Cuentas por Pagar", 14, 23);

  // ============================================
  // 2. METADATOS
  // ============================================
  const fechaGeneracion = new Date().toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setTextColor(GRIS_OSCURO[0], GRIS_OSCURO[1], GRIS_OSCURO[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha de generación: ${fechaGeneracion}`, 14, 42);
  doc.text(`Generado por: ${usuarioEmail}`, 14, 47);
  doc.text(`Total de cuentas: ${stats.total_cuentas}`, 14, 52);

  // ============================================
  // 3. RESUMEN EJECUTIVO (tabla de KPIs)
  // ============================================
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRIS_OSCURO[0], GRIS_OSCURO[1], GRIS_OSCURO[2]);
  doc.text("RESUMEN EJECUTIVO", 14, 64);

  autoTable(doc, {
    startY: 68,
    head: [["Deuda Total", "Cuentas Vencidas", "Cuentas por Vencer"]],
    body: [
      [
        formatUSD(Number(stats.deuda_total_usd)),
        formatUSD(Number(stats.monto_vencido_usd)),
        formatUSD(Number(stats.monto_por_vencer_usd)),
      ],
      [
        `${stats.total_cuentas} cuentas`,
        `${stats.cuentas_vencidas} cuentas`,
        `${stats.cuentas_por_vencer} cuentas`,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      halign: "center",
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      halign: "center",
      fontSize: 10,
    },
    styles: {
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: "bold" },
    },
  });

  // ============================================
  // 4. DETALLE DE CUENTAS (tabla principal)
  // ============================================
  const lastY = (doc as any).lastAutoTable.finalY;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GRIS_OSCURO[0], GRIS_OSCURO[1], GRIS_OSCURO[2]);
  doc.text("DETALLE DE CUENTAS POR PAGAR", 14, lastY + 12);

  autoTable(doc, {
    startY: lastY + 16,
    head: [
      [
        "Documento",
        "Proveedor",
        "Emisión",
        "Vencimiento",
        "Días",
        "Monto USD",
        "Saldo USD",
        "Estado",
      ],
    ],
    body: cuentas.map((c) => [
      `${c.tipo_doc} #${c.nro_doc}`,
      c.nombre_proveedor,
      formatFecha(c.fec_emis),
      formatFecha(c.fec_venc),
      getDiasText(c),
      formatUSD(Number(c.monto_net_usd)),
      formatUSD(Number(c.saldo_usd)),
      getEstadoText(c.estado),
    ]),
    theme: "striped",
    headStyles: {
      fillColor: AZUL,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 22, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 18, halign: "center" },
    },
    styles: {
      cellPadding: 2,
      overflow: "linebreak",
    },
    // Colorear filas vencidas en rojo
    didParseCell: (data: any) => {
      if (data.section === "body") {
        const cuenta = cuentas[data.row.index];
        if (cuenta && cuenta.estado === "vencida") {
          data.cell.styles.textColor = ROJO;
          if (data.column.index === 7) {
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    },
    // Footer en cada página
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
      doc.text(
        "Sistema de Gestión y Dashboard CFV - Reporte generado automáticamente",
        14,
        pageHeight - 8
      );
    },
  });

  // ============================================
  // 5. NÚMEROS DE PÁGINA (al final)
  // ============================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(GRIS[0], GRIS[1], GRIS[2]);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: "right" }
    );
  }

  // ============================================
  // 6. DESCARGAR EL PDF
  // ============================================
  const fechaArchivo = new Date().toISOString().split("T")[0];
  doc.save(`Reporte_CxP_${fechaArchivo}.pdf`);
}