// Build-time Code128 barcode → inline SVG string (no client JS).
// Colors come from CSS (.bc-bg / .bc-bar) so barcodes follow the active theme.
// Bars are dark on a light plate: scanners need that contrast.
import bwipjs from "bwip-js";

const cache = new Map();

export function code128Svg(text) {
  if (cache.has(text)) return cache.get(text);
  const raw = bwipjs.toSVG({
    bcid: "code128",
    text,
    height: 10,
    includetext: false,
    paddingwidth: 10, // quiet zone: 10 modules each side
    paddingheight: 3,
    barcolor: "000000",
    backgroundcolor: "ffffff",
  });
  // bwip-js draws 2 viewBox units per module (bars + quiet zone). CSS uses the
  // module count to snap the rendered width to whole pixels per module.
  const modules = Number(raw.match(/viewBox="0 0 (\d+)/)[1]) / 2;
  const svg = raw
    .replace(
      "<svg ",
      `<svg class="bc" style="--bc-modules:${modules}" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-hidden="true" `,
    )
    .replace('fill="#ffffff"', 'class="bc-bg"')
    .replaceAll('stroke="#000000"', 'class="bc-bar"');
  cache.set(text, svg);
  return svg;
}
