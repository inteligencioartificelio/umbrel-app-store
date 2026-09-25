/**
 * Unified IndexedDB database module for Nano Banana Studio.
 * Single source of truth for both generations history and style presets.
 * Consolidates the previously split historyStorage.js and stylePresetsService.js DB logic.
 */

const DB_NAME = 'NanoBananaStudioDB';
const DB_VERSION = 2;
const STORE_GENERATIONS = 'generations';
const STORE_PRESETS = 'style_presets';

let dbInstance = null;
let dbOpenPromise = null;

/**
 * Opens the database once and caches the connection.
 * All callers share the same connection to avoid version conflicts.
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpenPromise) return dbOpenPromise;

  dbOpenPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_GENERATIONS)) {
        const storeGen = db.createObjectStore(STORE_GENERATIONS, { keyPath: 'id' });
        storeGen.createIndex('createdAt', 'createdAt', { unique: false });
        storeGen.createIndex('favorite', 'favorite', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PRESETS)) {
        const storePresets = db.createObjectStore(STORE_PRESETS, { keyPath: 'id' });
        storePresets.createIndex('slug', 'slug', { unique: true });
        storePresets.createIndex('isActive', 'isActive', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle unexpected close (tab crash, storage eviction)
      dbInstance.onclose = () => {
        dbInstance = null;
        dbOpenPromise = null;
      };

      resolve(dbInstance);
    };

    request.onerror = () => {
      dbOpenPromise = null;
      reject(request.error);
    };
  });

  return dbOpenPromise;
}

/**
 * Runs a read-write transaction on a single store.
 * Returns the result of the callback's IDBRequest.
 */
async function withTransaction(storeName, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);

    if (result && typeof result.onsuccess !== 'undefined') {
      result.onsuccess = () => resolve(result.result);
      result.onerror = (e) => reject(result.error || e);
    }

    tx.onabort = (e) => reject(tx.error || e);
  });
}

// ─── GENERATIONS HISTORY ──────────────────────────────────────────────

/**
 * Generates an ultra-lightweight thumbnail (WebP/JPEG, ~20-40KB) from a Data URL
 * to avoid decoding full 4K/2K resolution bitmaps in the gallery grid.
 */
export async function createThumbnail(dataUrl, maxDimension = 420, quality = 0.82) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  // If the image is already tiny (less than 40KB), no need to compress further
  if (dataUrl.length < 50000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          if (!width || !height) {
            resolve(dataUrl);
            return;
          }

          let targetW = width;
          let targetH = height;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              targetW = maxDimension;
              targetH = Math.max(1, Math.round((height * maxDimension) / width));
            } else {
              targetH = maxDimension;
              targetW = Math.max(1, Math.round((width * maxDimension) / height));
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Attempt WebP format first (most compact)
          let thumb = canvas.toDataURL('image/webp', quality);
          // If webp is not supported or yielded a larger size, fallback to JPEG
          if (!thumb || !thumb.startsWith('data:image/webp') || thumb.length > dataUrl.length) {
            thumb = canvas.toDataURL('image/jpeg', quality);
          }

          // Clean canvas dimensions to free memory immediately
          canvas.width = 1;
          canvas.height = 1;

          resolve(thumb && thumb.length < dataUrl.length ? thumb : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * Saves a generated image with complete parameters.
 * Automatically generates a lightweight thumbnail for fluid gallery rendering.
 */
export async function saveGeneration(imageItem) {
  if (!imageItem || !imageItem.id) return imageItem;

  let thumbnailUrl = imageItem.thumbnailUrl;
  if (!thumbnailUrl && imageItem.dataUrl) {
    try {
      thumbnailUrl = await createThumbnail(imageItem.dataUrl, 420, 0.82);
    } catch {
      thumbnailUrl = null;
    }
  }

  const itemToSave = {
    ...imageItem,
    thumbnailUrl: thumbnailUrl || null,
    favorite: Boolean(imageItem.favorite),
    archived: Boolean(imageItem.archived),
    createdAt: imageItem.createdAt || new Date().toISOString()
  };

  try {
    await withTransaction(STORE_GENERATIONS, 'readwrite', (store) => store.put(itemToSave));
  } catch (err) {
    console.error('[DB] saveGeneration failed:', err);
  }

  return itemToSave;
}

/**
 * Retrieves generations summary for the gallery WITHOUT holding heavy 4K/2K dataUrls in memory.
 * Uses cursor newest-first traversal. Items return with thumbnailUrl and metadata.
 */
export async function getGenerationsSummary() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GENERATIONS, 'readonly');
      const store = tx.objectStore(STORE_GENERATIONS);
      const items = [];

      let req;
      if (store.indexNames.contains('createdAt')) {
        const index = store.index('createdAt');
        req = index.openCursor(null, 'prev');
      } else {
        req = store.openCursor(null, 'prev');
      }

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          const thumb = val.thumbnailUrl || val.dataUrl;

          items.push({
            id: val.id,
            createdAt: val.createdAt,
            favorite: Boolean(val.favorite),
            archived: Boolean(val.archived),
            thumbnailUrl: thumb,
            hasThumbnail: Boolean(val.thumbnailUrl),
            config: val.config,
            _isSummary: true
          });
          cursor.continue();
        } else {
          resolve(items);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[DB] getGenerationsSummary failed, falling back to getAllGenerations:', err);
    return getAllGenerations();
  }
}

/**
 * Retrieves a single complete generation by ID, including its full-resolution dataUrl.
 */
export async function getGenerationById(id) {
  if (!id) return null;
  try {
    return await withTransaction(STORE_GENERATIONS, 'readonly', (store) => store.get(id));
  } catch (err) {
    console.error('[DB] getGenerationById failed:', err);
    return null;
  }
}

/**
 * Background worker that finds any records lacking a thumbnailUrl and generates
 * compressed thumbnails in non-blocking slices using requestIdleCallback or setTimeout.
 */
export async function migrateMissingThumbnails(onProgress) {
  try {
    const db = await openDB();
    const missingIds = await new Promise((resolve) => {
      const tx = db.transaction(STORE_GENERATIONS, 'readonly');
      const store = tx.objectStore(STORE_GENERATIONS);
      const ids = [];
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (!cursor.value.thumbnailUrl && cursor.value.dataUrl) {
            ids.push(cursor.value.id);
          }
          cursor.continue();
        } else {
          resolve(ids);
        }
      };
      req.onerror = () => resolve([]);
    });

    if (missingIds.length === 0) return;

    // Process missing records gently in small batches to never block the main thread
    const processBatch = async (batch) => {
      for (const id of batch) {
        try {
          const item = await getGenerationById(id);
          if (item && item.dataUrl && !item.thumbnailUrl) {
            const thumb = await createThumbnail(item.dataUrl, 420, 0.82);
            if (thumb && thumb !== item.dataUrl) {
              item.thumbnailUrl = thumb;
              await withTransaction(STORE_GENERATIONS, 'readwrite', (store) => store.put(item));
              if (typeof onProgress === 'function') {
                onProgress(id, thumb);
              }
            }
          }
        } catch (e) {
          console.warn(`[DB] Thumbnail migration error for ${id}:`, e);
        }
      }
    };

    const batchSize = 3;
    let idx = 0;
    const runNextSlice = () => {
      if (idx >= missingIds.length) return;
      const slice = missingIds.slice(idx, idx + batchSize);
      idx += batchSize;

      processBatch(slice).finally(() => {
        if (idx < missingIds.length) {
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(runNextSlice, { timeout: 1000 });
          } else {
            setTimeout(runNextSlice, 80);
          }
        }
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(runNextSlice, { timeout: 1000 });
    } else {
      setTimeout(runNextSlice, 100);
    }
  } catch (err) {
    console.warn('[DB] migrateMissingThumbnails failed:', err);
  }
}

/**
 * Retrieves all saved generations with full data, newest first.
 */
export async function getAllGenerations() {
  try {
    const items = await withTransaction(STORE_GENERATIONS, 'readonly', (store) => store.getAll());
    const list = items || [];
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  } catch (err) {
    console.warn('[DB] getAllGenerations failed:', err);
    return [];
  }
}

/**
 * Deletes a generation by ID.
 */
export async function deleteGeneration(id) {
  try {
    await withTransaction(STORE_GENERATIONS, 'readwrite', (store) => store.delete(id));
  } catch (err) {
    console.error('[DB] deleteGeneration failed:', err);
  }
  return true;
}

/**
 * Deletes multiple generations by an array of IDs in a single transaction.
 */
export async function bulkDeleteGenerations(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GENERATIONS, 'readwrite');
      const store = tx.objectStore(STORE_GENERATIONS);
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve(ids.length);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[DB] bulkDeleteGenerations failed:', err);
    return 0;
  }
}

/**
 * Archives or unarchives multiple generations by an array of IDs in a single transaction.
 */
export async function bulkArchiveGenerations(ids = [], archived = true) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GENERATIONS, 'readwrite');
      const store = tx.objectStore(STORE_GENERATIONS);
      let count = 0;

      ids.forEach((id) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const item = getReq.result;
          if (item) {
            item.archived = Boolean(archived);
            store.put(item);
            count++;
          }
        };
      });

      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[DB] bulkArchiveGenerations failed:', err);
    return 0;
  }
}

/**
 * Toggles the archive status of a single generation.
 */
export async function toggleArchiveGeneration(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GENERATIONS, 'readwrite');
      const store = tx.objectStore(STORE_GENERATIONS);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return resolve(false);

        item.archived = !item.archived;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(item.archived);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error('[DB] toggleArchiveGeneration failed:', err);
    return false;
  }
}

/**
 * Toggles the favorite status of a generation. Returns the new status.
 */
export async function toggleFavorite(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GENERATIONS, 'readwrite');
      const store = tx.objectStore(STORE_GENERATIONS);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return resolve(false);

        item.favorite = !item.favorite;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(item.favorite);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error('[DB] toggleFavorite failed:', err);
    return false;
  }
}

/**
 * Clears the entire generations store.
 */
export async function clearAllHistory() {
  try {
    await withTransaction(STORE_GENERATIONS, 'readwrite', (store) => store.clear());
  } catch (err) {
    console.error('[DB] clearAllHistory failed:', err);
  }
  return true;
}

/**
 * Exports all generations as a downloadable JSON backup.
 */
export async function exportDatabaseBackup() {
  const items = await getAllGenerations();
  const backup = {
    app: 'NanoBananaStudioDB',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    totalRecords: items.length,
    data: items
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NanoBanana_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imports generations from a JSON backup file.
 */
export async function importDatabaseBackup(jsonContent) {
  const parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  const items = parsed.data || parsed;

  if (!Array.isArray(items)) {
    throw new Error('El archivo de respaldo no tiene un formato válido.');
  }

  const db = await openDB();
  const tx = db.transaction(STORE_GENERATIONS, 'readwrite');
  const store = tx.objectStore(STORE_GENERATIONS);

  for (const item of items) {
    if (item.id && item.dataUrl) {
      store.put({
        ...item,
        thumbnailUrl: item.thumbnailUrl || null
      });
    }
  }

  return new Promise((resolve) => {
    tx.oncomplete = () => {
      setTimeout(() => migrateMissingThumbnails(), 300);
      resolve(items.length);
    };
  });
}

// ─── STYLE PRESETS ────────────────────────────────────────────────────

export const MAX_STYLE_REFERENCE_IMAGES = 2;

const DEFAULT_PRESETS = [
  {
    id: 'editorial-cinematografico',
    name: 'Editorial Cinematográfico',
    slug: 'editorial-cinematografico',
    category: 'Cinematográfico',
    description: 'Estética de revista de alta moda con iluminación dramática y tonos cálidos.',
    stylePrompt: 'Cinematic editorial photography, high fashion lighting, dramatic rim light, shallow depth of field, 35mm film grain, warm color grading, 8k resolution',
    negativeStylePrompt: 'harsh flat lighting, overexposed highlights, cartoonish, low contrast, oversaturated neon',
    coverImageUrl: '',
    referenceImages: [],
    isActive: true,
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cyberpunk-neon-studio',
    name: 'Cyberpunk Neon',
    slug: 'cyberpunk-neon-studio',
    category: 'Cyberpunk',
    description: 'Atmósfera futurista distópica con neones cian y magenta y asfalto mojado.',
    stylePrompt: 'Futuristic cyberpunk atmosphere, neon cyan and vivid magenta lighting, wet rainy asphalt reflections, dark moody shadows, volumetric fog, octane render',
    negativeStylePrompt: 'daylight, bright sunshine, pastel colors, vintage sepia, rustic rural, natural landscape',
    coverImageUrl: '',
    referenceImages: [],
    isActive: true,
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'anime-masterpiece',
    name: 'Anime Masterpiece',
    slug: 'anime-masterpiece',
    category: 'Anime',
    description: 'Estilo de animación japonesa de alta calidad con colores vibrantes e iluminación Makoto Shinkai.',
    stylePrompt: 'High quality anime illustration, vivid vibrant colors, luminous cloudscape background, Makoto Shinkai aesthetic, detailed linework, 4k resolution masterpiece',
    negativeStylePrompt: 'photorealistic human face, 3d render, claymation, blurry lines, dull colors, dark horror',
    coverImageUrl: '',
    referenceImages: [],
    isActive: true,
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fotorrealista-ultra',
    name: 'Fotorrealista Studio',
    slug: 'fotorrealista-ultra',
    category: 'Fotorrealista',
    description: 'Fotografía comercial hyper-realista con lente Hasselblad y textura ultra definida.',
    stylePrompt: 'Hyper-realistic studio photography, shot on Hasselblad 80mm lens, natural crisp textures, balanced soft studio flash, ultra photorealism, 8k resolution',
    negativeStylePrompt: 'unreal render, anime, illustration, painting, plastic skin, CGI artifacts, airbrushed',
    coverImageUrl: '',
    referenceImages: [],
    isActive: true,
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'render-3d-unreal',
    name: 'Render 3D Unreal 5',
    slug: 'render-3d-unreal',
    category: '3D Render',
    description: 'Estética 3D cinematográfica en tiempo real con trazado de rayos (Ray Tracing) y materiales PBR.',
    stylePrompt: 'Cinematic 3D render, Unreal Engine 5 render, global illumination, ray tracing, PBR materials, intricate micro-textures, Octane render 8k',
    negativeStylePrompt: 'flat 2d, sketch, watercolor, low poly, noisy render, draft drawing',
    coverImageUrl: '',
    referenceImages: [],
    isActive: true,
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Seeds default presets into the database if the store is empty.
 */
async function seedDefaultPresets() {
  try {
    const existing = await withTransaction(STORE_PRESETS, 'readonly', (store) => store.getAll());
    if (existing && existing.length > 0) return;

    const db = await openDB();
    const tx = db.transaction(STORE_PRESETS, 'readwrite');
    const store = tx.objectStore(STORE_PRESETS);
    DEFAULT_PRESETS.forEach((p) => store.put(p));

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.warn('[DB] seedDefaultPresets failed:', err);
  }
}

/**
 * Gets all style presets (optionally including inactive ones).
 */
export async function getStylePresets(includeInactive = false) {
  try {
    await seedDefaultPresets();
    let results = await withTransaction(STORE_PRESETS, 'readonly', (store) => store.getAll());
    results = results || [];

    if (results.length === 0) return DEFAULT_PRESETS;
    if (!includeInactive) {
      results = results.filter((p) => p.isActive);
    }
    return results;
  } catch (err) {
    console.error('[DB] getStylePresets failed:', err);
    return DEFAULT_PRESETS;
  }
}

/**
 * Gets a style preset by ID or slug.
 */
export async function getStylePresetById(id) {
  const all = await getStylePresets(true);
  return all.find((p) => p.id === id || p.slug === id) || null;
}

/**
 * Validates a style preset payload.
 */
export function validateStylePreset(presetData) {
  const errors = [];
  if (!presetData.name || !presetData.name.trim()) {
    errors.push('El nombre del estilo es obligatorio.');
  }
  if (!presetData.stylePrompt || !presetData.stylePrompt.trim()) {
    errors.push('El prompt de instrucciones del estilo es obligatorio.');
  }
  if (presetData.referenceImages && presetData.referenceImages.length > MAX_STYLE_REFERENCE_IMAGES) {
    errors.push(`Un estilo puede incluir máximo ${MAX_STYLE_REFERENCE_IMAGES} imágenes de referencia.`);
  }
  return errors;
}

/**
 * Creates a new style preset.
 */
export async function createStylePreset(presetData) {
  const errors = validateStylePreset(presetData);
  if (errors.length > 0) throw new Error(errors.join(' '));

  const trimmedRefs = (presetData.referenceImages || []).slice(0, MAX_STYLE_REFERENCE_IMAGES);
  const slug = presetData.slug || presetData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const newPreset = {
    id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: presetData.name.trim(),
    slug,
    category: presetData.category || 'Personalizados',
    description: presetData.description || '',
    stylePrompt: presetData.stylePrompt.trim(),
    negativeStylePrompt: presetData.negativeStylePrompt || '',
    coverImageUrl: presetData.coverImageUrl || trimmedRefs[0]?.url || '',
    referenceImages: trimmedRefs,
    isActive: presetData.isActive !== undefined ? presetData.isActive : true,
    isPublic: presetData.isPublic !== undefined ? presetData.isPublic : true,
    createdBy: presetData.createdBy || 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await withTransaction(STORE_PRESETS, 'readwrite', (store) => store.put(newPreset));
  return newPreset;
}

/**
 * Updates an existing style preset.
 */
export async function updateStylePreset(id, partialData) {
  const existing = await getStylePresetById(id);
  if (!existing) throw new Error('Estilo predefinido no encontrado.');

  const updated = {
    ...existing,
    ...partialData,
    referenceImages: (partialData.referenceImages || existing.referenceImages || []).slice(0, MAX_STYLE_REFERENCE_IMAGES),
    updatedAt: new Date().toISOString()
  };

  const errors = validateStylePreset(updated);
  if (errors.length > 0) throw new Error(errors.join(' '));

  await withTransaction(STORE_PRESETS, 'readwrite', (store) => store.put(updated));
  return updated;
}

/**
 * Deletes a style preset by ID.
 */
export async function deleteStylePreset(id) {
  await withTransaction(STORE_PRESETS, 'readwrite', (store) => store.delete(id));
  return true;
}
