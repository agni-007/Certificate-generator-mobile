"use strict";
const path = require("path");
const CanvasKitInit = require("canvaskit-wasm");

let _ck = null;
async function initCanvasKit() {
  if (_ck) return _ck;
  _ck = await CanvasKitInit({
    locateFile: (file) => path.join(__dirname, "..", "node_modules", "canvaskit-wasm", "bin", file),
  });
  return _ck;
}

// Generates a noisy JPEG of the requested size and returns its bytes.
// CanvasKit's JPEG encoder is not compiled into canvaskit-wasm, so we use the
// pure-JS `jpeg-js` encoder (BSD-3-Clause) for this fixture only.
function makeNoiseJpeg(width, height, quality) {
  const jpeg = require("jpeg-js");
  const px = Buffer.alloc(width * height * 4);
  let seed = 0x12345678;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  for (let i = 0; i < px.length; i += 4) {
    const v = 60 + 150 * rand();
    px[i] = v;
    px[i + 1] = (v * 0.8 + 30 * rand()) & 255;
    px[i + 2] = (v * 0.6 + 40 * rand()) & 255;
    px[i + 3] = 255;
  }
  const encoded = jpeg.encode({ data: px, width, height }, quality);
  return encoded.data;
}

module.exports = { initCanvasKit, makeNoiseJpeg };
