/**
 * Turn a live <svg> (the master plan, the lot section) into a PNG, exactly as it looks on screen.
 *
 * A serialized SVG loses the page's stylesheet (the plan's text and line styles come from CSS classes and variables), so every
 * element's computed style is copied onto a clone first. Drag handles (data-pdf-skip) are dropped, and the draw-in animations
 * are pinned to their finished state so a click mid-animation cannot print a half-drawn plan.
 */

const STYLE_PROPS = [
  "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset",
  "stroke-linecap", "stroke-linejoin", "opacity", "font-family", "font-size", "font-weight", "font-style", "letter-spacing",
  "text-anchor", "dominant-baseline", "paint-order", "font-variant-numeric", "visibility", "display", "color", "stop-color", "stop-opacity",
] as const;

function inlineStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  const el = dst as SVGElement;
  const finishedAnim = src.classList.contains("plat-fill") || src.classList.contains("plat-draw");
  for (const p of STYLE_PROPS) {
    if (finishedAnim && (p === "opacity" || p === "stroke-dasharray" || p === "stroke-dashoffset")) continue;
    // Computed paint servers come back as absolute page URLs; inside a standalone image only the local #id resolves.
    const v = cs.getPropertyValue(p).replace(/url\(["']?[^"')#]*#([^"')]+)["']?\)/g, "url(#$1)");
    if (v) el.style.setProperty(p, v);
  }
  if (finishedAnim) el.style.setProperty("opacity", "1");
  el.style.setProperty("animation", "none");
  el.style.removeProperty("cursor");
  const sk = Array.from(src.children);
  const dk = Array.from(dst.children);
  for (let i = 0; i < sk.length; i++) if (dk[i]) inlineStyles(sk[i], dk[i]);
}

export interface Raster {
  dataUrl: string;
  width: number;
  height: number;
}

export async function svgToPng(svg: SVGSVGElement, widthPx = 2400, background = "#ffffff"): Promise<Raster> {
  const vb = svg.viewBox.baseVal;
  const aspect = vb && vb.width ? vb.height / vb.width : svg.getBoundingClientRect().height / (svg.getBoundingClientRect().width || 1);
  const width = widthPx;
  const height = Math.round(widthPx * aspect);

  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.querySelectorAll("[data-pdf-skip]").forEach((n) => n.remove());
  clone.querySelectorAll("[tabindex]").forEach((n) => n.removeAttribute("tabindex"));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.style.setProperty("max-height", "none");
  clone.style.setProperty("box-shadow", "none");

  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not draw the plan for the PDF."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/png"), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
