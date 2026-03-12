"use client";

import { useCallback } from "react";

/**
 * Export report content to PDF using html2canvas + jsPDF.
 * Dynamically imported to avoid SSR issues.
 */
export function useExportReportPdf() {
  const exportToPdf = useCallback(async (element: HTMLElement | null, filename: string) => {
    if (!element) return;

    const [html2canvas, jspdfMod] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JsPDF = (jspdfMod as any).default;

    const canvas = await html2canvas.default(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#f4f2ec",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgW = 210; // A4 width mm
    const imgH = (canvas.height * imgW) / canvas.width;
    const pageH = 297; // A4 height mm

    const pdf = new JsPDF({ format: "a4", unit: "mm" });
    let heightLeft = imgH;
    let position = 0;
    let page = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      page += 1;
    }

    pdf.save(filename);
  }, []);

  return exportToPdf;
}
