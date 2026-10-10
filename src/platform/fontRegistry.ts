/**
 * Expo FontRegistry adapter (implementation.md Phase 3 step 2). Loads the
 * bundled OFL fonts (via Metro assets) plus user-imported fonts stored in the
 * app sandbox, and answers `fontSupports` from the core catalogue.
 */

import { Asset } from "expo-asset";
import { Directory, File, Paths } from "expo-file-system";

import { AppError } from "@core/errors";
import { BUNDLED_FONTS } from "@core/fontCatalog";
import { isSupportedFontFile, parseFontNames } from "@core/fontFile";
import { classifyChar } from "@core/shaping";

import type { FontAsset, FontRegistryPort, PickedFile } from "./ports";

const FONTS_DIR = "fonts";

/** Metro asset modules for the bundled fonts (static requires are required). */
const BUNDLED_ASSETS: Record<string, number> = {
  "latin-serif": require("../assets/fonts/NotoSerif-Regular.ttf"),
  "latin-sans": require("../assets/fonts/NotoSans-Regular.ttf"),
  "latin-script": require("../assets/fonts/GreatVibes-Regular.ttf"),
  "latin-mono": require("../assets/fonts/NotoSansMono-Regular.ttf"),
  malayalam: require("../assets/fonts/NotoSansMalayalam-Regular.ttf"),
  tamil: require("../assets/fonts/NotoSansTamil-Regular.ttf"),
  devanagari: require("../assets/fonts/NotoSansDevanagari-Regular.ttf"),
  bengali: require("../assets/fonts/NotoSansBengali-Regular.ttf"),
  telugu: require("../assets/fonts/NotoSansTelugu-Regular.ttf"),
  kannada: require("../assets/fonts/NotoSansKannada-Regular.ttf"),
  gujarati: require("../assets/fonts/NotoSansGujarati-Regular.ttf"),
  gurmukhi: require("../assets/fonts/NotoSansGurmukhi-Regular.ttf"),
};

function safeId(name: string): string {
  const base = name
    .replace(/\.[A-Za-z0-9]+$/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "font").slice(0, 60);
}

export class ExpoFontRegistry implements FontRegistryPort {
  private readonly fonts = new Map<string, FontAsset>();

  private fontsDirectory(): Directory {
    return new Directory(Paths.document, FONTS_DIR);
  }

  async load(): Promise<void> {
    for (const meta of BUNDLED_FONTS) {
      const moduleId = BUNDLED_ASSETS[meta.id];
      if (moduleId === undefined) continue;
      const asset = Asset.fromModule(moduleId);
      await asset.downloadAsync();
      this.fonts.set(meta.id, {
        id: meta.id,
        family: meta.family,
        path: asset.localUri ?? asset.uri,
        scripts: meta.scripts.join(","),
        bundled: true,
      });
    }

    const dir = this.fontsDirectory();
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      if (!(entry instanceof File)) continue;
      const names = parseFontNames(await entry.bytes());
      const id = entry.name.replace(/\.[A-Za-z0-9]+$/, "");
      this.fonts.set(id, {
        id,
        family: names?.family ?? entry.name,
        path: entry.uri,
        scripts: "",
        bundled: false,
      });
    }
  }

  list(): Promise<FontAsset[]> {
    return Promise.resolve([...this.fonts.values()]);
  }

  get(id: string): FontAsset | undefined {
    return this.fonts.get(id);
  }

  fontSupports(fontId: string, text: string): boolean {
    const font = this.fonts.get(fontId);
    if (!font) return false;
    // Bundled fonts: check the declared script list. Custom imports are trusted
    // (Skia shapes what it can; unknown glyphs fall back to the shaped pipeline).
    if (!font.bundled) return true;
    const scripts = new Set(font.scripts.split(","));
    for (const char of text) {
      const cls = classifyChar(char);
      if (cls === "common") continue;
      if (cls === "other" || !scripts.has(cls)) return false;
    }
    return true;
  }

  async register(picked: PickedFile): Promise<FontAsset> {
    const file = new File(picked.uri);
    if (!file.exists) throw new AppError("BAD_FONT");
    const bytes = await file.bytes();
    if (!isSupportedFontFile(bytes)) throw new AppError("BAD_FONT");

    const names = parseFontNames(bytes);
    const id = safeId(picked.name);
    const dir = this.fontsDirectory();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

    const target = new File(dir, `${id}.ttf`);
    if (target.exists) target.delete();
    target.write(bytes);

    const asset: FontAsset = {
      id,
      family: names?.family ?? picked.name,
      path: target.uri,
      scripts: "",
      bundled: false,
    };
    this.fonts.set(id, asset);
    return asset;
  }

  async remove(id: string): Promise<void> {
    const font = this.fonts.get(id);
    if (!font || font.bundled) return;
    const file = new File(font.path);
    if (file.exists) file.delete();
    this.fonts.delete(id);
  }
}
