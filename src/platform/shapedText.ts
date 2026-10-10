/**
 * Skia ShapedTextRenderer adapter (implementation.md 7.4, Phase 3 step 4).
 *
 * Lays out a single-line name with HarfBuzz-backed shaping, measures it, and
 * rasterises it to a tightly-cropped transparent PNG at the requested DPI.
 * Only the name is rasterised; the template page stays vector and pdf-lib
 * embeds this PNG (see `core/pdf/overlay.ts`).
 */

import { ImageFormat, Skia, type SkTypeface } from "@shopify/react-native-skia";

import { AppError } from "@core/errors";

import type { ShapedTextRenderer, ShapedTextResult } from "./ports";

function familyFromPath(path: string): string {
  const base = path.split("/").pop() ?? "font";
  return base.replace(/\.[A-Za-z0-9]+$/, "");
}

export class SkiaShapedTextRenderer implements ShapedTextRenderer {
  private readonly typefaces = new Map<string, SkTypeface>();

  private async loadTypeface(path: string): Promise<SkTypeface> {
    const cached = this.typefaces.get(path);
    if (cached) return cached;
    let typeface: SkTypeface | null = null;
    try {
      const data = await Skia.Data.fromURI(path);
      typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
    } catch (cause) {
      throw new AppError("BAD_FONT", cause);
    }
    if (!typeface) throw new AppError("BAD_FONT");
    this.typefaces.set(path, typeface);
    return typeface;
  }

  async render(
    text: string,
    font: string,
    fontSizePt: number,
    color: string,
    dpi: number,
  ): Promise<ShapedTextResult> {
    const typeface = await this.loadTypeface(font);
    const family = familyFromPath(font);
    const scale = dpi / 72;
    const fontSize = fontSizePt * scale;

    const provider = Skia.TypefaceFontProvider.Make();
    provider.registerFont(typeface, family);

    const builder = Skia.ParagraphBuilder.Make(
      {
        textStyle: {
          fontFamilies: [family],
          fontSize,
          color: Skia.Color(color),
        },
      },
      provider,
    );
    builder.addText(text);
    const paragraph = builder.build();
    paragraph.layout(1e7); // no wrapping; measured below

    const measuredWidth = Math.max(1, paragraph.getLongestLine());
    const measuredHeight = Math.max(1, paragraph.getHeight());
    const pad = Math.ceil(2 * scale);
    const widthPx = Math.ceil(measuredWidth) + pad * 2;
    const heightPx = Math.ceil(measuredHeight) + pad * 2;

    const surface = Skia.Surface.MakeOffscreen(widthPx, heightPx);
    if (!surface) throw new AppError("GENERATION_FAILED");
    try {
      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color("transparent"));
      paragraph.paint(canvas, pad, pad);
      const image = surface.makeImageSnapshot();
      const png = image.encodeToBytes(ImageFormat.PNG, 100);
      image.dispose?.();

      const baselinePx = baselineFromParagraph(paragraph, typeface, fontSize);
      return {
        png,
        widthPt: widthPx / scale,
        heightPt: heightPx / scale,
        // Distance from the top of the PNG (including padding) to the baseline.
        baselinePt: (pad + baselinePx) / scale,
      };
    } finally {
      surface.dispose();
      paragraph.dispose?.();
      builder.dispose?.();
    }
  }

  supports(): boolean {
    // Best-effort: Skia shapes whatever the registered typeface provides; if a
    // glyph is missing it renders a fallback box rather than throwing.
    return true;
  }
}

function baselineFromParagraph(
  paragraph: { getLineMetrics?: () => { baseline: number }[] },
  typeface: SkTypeface,
  fontSize: number,
): number {
  try {
    const lines = paragraph.getLineMetrics?.();
    const first = lines?.[0];
    if (first && Number.isFinite(first.baseline)) return first.baseline;
  } catch {
    // fall through to font metrics
  }
  const metrics = Skia.Font(typeface, fontSize).getMetrics();
  const ascent = metrics.ascent;
  return Number.isFinite(ascent) ? -ascent : fontSize * 0.8;
}
