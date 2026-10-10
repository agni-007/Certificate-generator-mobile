export { drawName, type DrawNameOptions, type DrawNameResult } from "./draw";
export { isStandardFontKey, standardFontKeys, standardFontName } from "./fonts";
export { imageToPdf, type ImageToPdfOptions } from "./imageToPdf";
export { renderMergedPdf, type RenderMergedOptions } from "./merged";
export {
  drawShapedName,
  overlayDrawBox,
  type DrawOverlayOptions,
  type DrawOverlayResult,
  type ShapedOverlay,
} from "./overlay";
export { readPdfPageSize, type PdfPageGeometry } from "./pageSize";
export {
  addTemplatePage,
  embedFontFor,
  embedTemplate,
  type EmbeddedTemplate,
  type TemplateSource,
} from "./template";
export { renderCertificatePdf, type RenderCertificateOptions } from "./vector";
