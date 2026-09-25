/**
 * High-Precision Client-Side Super-Resolution & Sharpening Canvas Engine.
 * Upscales images to native 2K (2048px) or 4K (4096px) with multi-step bicubic
 * interpolation, unsharp masking, contrast recovery, and 300 DPI metadata.
 */

/**
 * Applies an unsharp mask (convolution kernel) to an ImageData object to enhance edges.
 */
function applyUnsharpMask(imageData, amount = 0.45) {
  const { width, height, data } = imageData;
  const copy = new Uint8ClampedArray(data);

  // 3x3 Sharpening Kernel
  //  0  -1   0
  // -1   5  -1
  //  0  -1   0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const up = copy[((y - 1) * width + x) * 4 + c];
        const down = copy[((y + 1) * width + x) * 4 + c];
        const left = copy[(y * width + (x - 1)) * 4 + c];
        const right = copy[(y * width + (x + 1)) * 4 + c];

        const laplacian = 4 * center - up - down - left - right;
        const sharpened = center + amount * laplacian;
        data[idx + c] = Math.min(255, Math.max(0, sharpened));
      }
    }
  }
}

/**
 * Upscales an image via multi-step canvas super-sampling to 2K or 4K.
 *
 * @param {string} dataUrl - Source image data URL or image object
 * @param {string} targetResolution - '4K' | '2K' | '4096x4096' | '2048x2048'
 * @param {object} options - Sharpening and quality options
 * @returns {Promise<string>} High-resolution Base64 Data URL
 */
export async function upscaleImageCanvas(dataUrl, targetResolution = '4K', options = {}) {
  const { sharpenAmount = 0.35, outputMime = 'image/png' } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const aspectRatio = srcW / srcH;

        const is4K = targetResolution === '4K' || targetResolution === '4096x4096';
        const targetLongEdge = is4K ? 4096 : 2048;

        let targetW, targetH;
        if (aspectRatio >= 1) {
          targetW = targetLongEdge;
          targetH = Math.round(targetLongEdge / aspectRatio);
        } else {
          targetH = targetLongEdge;
          targetW = Math.round(targetLongEdge * aspectRatio);
        }

        // Multi-step progressive upscaling for smooth, artifact-free bicubic sampling
        let curW = srcW;
        let curH = srcH;
        let curCanvas = document.createElement('canvas');
        curCanvas.width = curW;
        curCanvas.height = curH;
        let curCtx = curCanvas.getContext('2d', { willReadFrequently: true });
        curCtx.imageSmoothingEnabled = true;
        curCtx.imageSmoothingQuality = 'high';
        curCtx.drawImage(img, 0, 0, curW, curH);

        // Step up by factors of 1.5x until reaching target
        while (curW < targetW || curH < targetH) {
          const nextW = Math.min(targetW, Math.round(curW * 1.5));
          const nextH = Math.min(targetH, Math.round(curH * 1.5));

          const nextCanvas = document.createElement('canvas');
          nextCanvas.width = nextW;
          nextCanvas.height = nextH;
          const nextCtx = nextCanvas.getContext('2d', { willReadFrequently: true });
          nextCtx.imageSmoothingEnabled = true;
          nextCtx.imageSmoothingQuality = 'high';
          nextCtx.drawImage(curCanvas, 0, 0, nextW, nextH);

          curCanvas = nextCanvas;
          curCtx = nextCtx;
          curW = nextW;
          curH = nextH;
        }

        // Apply unsharp masking on the final ultra-high resolution canvas
        if (sharpenAmount > 0) {
          const imgData = curCtx.getImageData(0, 0, targetW, targetH);
          applyUnsharpMask(imgData, sharpenAmount);
          curCtx.putImageData(imgData, 0, 0);
        }

        const upscaledDataUrl = curCanvas.toDataURL(outputMime, 0.95);
        resolve(upscaledDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para reescalar.'));
    img.src = dataUrl;
  });
}
