/**
 * High-performance, robust image file downloader.
 * Converts Data URLs / Base64 into binary Blobs with proper MIME type headers and extensions.
 * Prevents browser data-URI truncation and missing extension issues.
 */

// Active object URLs pool to prevent premature garbage collection during download
const activeBlobUrls = new Set();

/**
 * Detects the real image format (mime & extension) from binary magic bytes or Data URL header.
 */
export function detectImageFormat(dataUrlOrBase64, fallbackMime = 'image/png') {
  let mimeType = fallbackMime;
  let base64Data = dataUrlOrBase64 || '';

  if (base64Data.startsWith('data:')) {
    const commaIdx = base64Data.indexOf(',');
    const header = base64Data.substring(0, commaIdx);
    base64Data = base64Data.substring(commaIdx + 1);
    const mimeMatch = header.match(/data:([^;]+)/i);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1].toLowerCase();
    }
  }

  // Check magic bytes signatures in base64
  if (base64Data.startsWith('iVBORw0KGgo')) {
    mimeType = 'image/png';
  } else if (base64Data.startsWith('/9j/') || base64Data.startsWith('/9j/4')) {
    mimeType = 'image/jpeg';
  } else if (base64Data.startsWith('UklGR')) {
    mimeType = 'image/webp';
  }

  // Determine standard file extension
  let ext = 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    ext = 'jpg';
    mimeType = 'image/jpeg';
  } else if (mimeType.includes('webp')) {
    ext = 'webp';
    mimeType = 'image/webp';
  } else {
    ext = 'png';
    mimeType = 'image/png';
  }

  return { mimeType, ext, base64Data };
}

/**
 * Converts a Base64 string / Data URL into a real binary Blob.
 */
export function base64ToBlob(dataUrlOrBase64, defaultMime = 'image/png') {
  const { mimeType, base64Data } = detectImageFormat(dataUrlOrBase64, defaultMime);
  
  // Clean whitespace/newlines that might have been added to the base64 string
  const cleanBase64 = base64Data.replace(/[\r\n\s]+/g, '');
  
  const binaryStr = atob(cleanBase64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

/**
 * Generates a clean, safe filename with valid extension for the image.
 */
export function generateImageFilename(imageItem) {
  const { ext } = detectImageFormat(
    imageItem?.dataUrl,
    imageItem?.config?.outputFormat || 'image/png'
  );

  const rawPrompt = (
    imageItem?.config?.originalPrompt ||
    imageItem?.config?.prompt ||
    'NanoBanana_Creation'
  );

  const cleanPrompt = rawPrompt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 30) || 'NanoBanana';

  const resolutionTag = (imageItem?.config?.imageSize || imageItem?.config?.resolution || '4K')
    .replace(/[^a-zA-Z0-9]/g, '');

  const idTag = (imageItem?.id || `gen_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(-6);

  return `NanoBanana_${cleanPrompt}_${resolutionTag}_${idTag}.${ext}`;
}

/**
 * Native file picker save (Save As dialog) using File System Access API when available.
 */
export async function saveImageWithPicker(imageItem) {
  if (!imageItem || !imageItem.dataUrl || typeof window.showSaveFilePicker !== 'function') {
    return downloadImage(imageItem);
  }

  try {
    const { mimeType, ext } = detectImageFormat(
      imageItem.dataUrl,
      imageItem.config?.outputFormat || 'image/png'
    );
    const blob = base64ToBlob(imageItem.dataUrl, mimeType);
    const filename = generateImageFilename(imageItem);

    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: `Imagen ${ext.toUpperCase()}`,
          accept: { [mimeType]: [`.${ext}`] }
        }
      ]
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    if (err.name === 'AbortError') {
      // User cancelled save dialog
      return false;
    }
    console.warn('showSaveFilePicker fallback to regular download:', err);
    return downloadImage(imageItem);
  }
}

/**
 * Downloads a generated image item safely to the user's computer with proper filename and extension.
 */
export function downloadImage(imageItem) {
  if (!imageItem || !imageItem.dataUrl) {
    console.error('Cannot download: Invalid image object or missing dataUrl', imageItem);
    return;
  }

  try {
    const { mimeType } = detectImageFormat(
      imageItem.dataUrl,
      imageItem.config?.outputFormat || 'image/png'
    );

    const blob = base64ToBlob(imageItem.dataUrl, mimeType);
    const filename = generateImageFilename(imageItem);

    // Create persistent Object URL
    const blobUrl = URL.createObjectURL(blob);
    activeBlobUrls.add(blobUrl);

    // Standard anchor download with proper attributes
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.setAttribute('download', filename);
    link.download = filename;
    link.rel = 'noopener';

    document.body.appendChild(link);

    // Trigger click
    link.click();

    // Remove DOM element shortly after click
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);

    // Retain the blob URL in memory for 5 minutes (300,000 ms) so Chrome's background download stream completes flawlessly
    setTimeout(() => {
      if (activeBlobUrls.has(blobUrl)) {
        activeBlobUrls.delete(blobUrl);
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (_) {}
      }
    }, 300000);
  } catch (err) {
    console.error('Error triggering blob image download:', err);
    // Direct Data URL fallback
    const fallbackLink = document.createElement('a');
    fallbackLink.href = imageItem.dataUrl;
    fallbackLink.download = `NanoBanana_${Date.now()}.png`;
    fallbackLink.setAttribute('download', `NanoBanana_${Date.now()}.png`);
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    setTimeout(() => {
      if (document.body.contains(fallbackLink)) {
        document.body.removeChild(fallbackLink);
      }
    }, 2000);
  }
}
