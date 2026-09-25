import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PromptSection from './components/PromptSection';
import GalleryView from './components/GalleryView';
import ApiKeyModal from './components/ApiKeyModal';
import { generateImages, editImage, upscaleImage } from './services/googleAiApi';
import {
  saveGeneration,
  getGenerationsSummary,
  getGenerationById,
  migrateMissingThumbnails,
  deleteGeneration,
  bulkDeleteGenerations,
  bulkArchiveGenerations,
  toggleFavorite,
  clearAllHistory,
  getStylePresets
} from './services/database';
import { downloadImage } from './services/imageDownloader';

// Lazy-load heavy modals to reduce initial bundle size
const LightboxModal = lazy(() => import('./components/LightboxModal'));
const DatabaseModal = lazy(() => import('./components/DatabaseModal'));
const StyleExplorerModal = lazy(() => import('./components/StyleExplorerModal'));
const StylePresetDetailModal = lazy(() => import('./components/StylePresetDetailModal'));
const StyleAdminModal = lazy(() => import('./components/StyleAdminModal'));

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('google_ai_api_key') || '');
  const [theme, setTheme] = useState(() => localStorage.getItem('nanobanana_theme') || 'dark');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showStyleExplorerModal, setShowStyleExplorerModal] = useState(false);
  const [showStyleDetailModal, setShowStyleDetailModal] = useState(false);
  const [showStyleAdminModal, setShowStyleAdminModal] = useState(false);

  // Apply theme class to root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('nanobanana_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Style Presets State
  const [stylePresets, setStylePresets] = useState([]);
  const [selectedStylePresetDetail, setSelectedStylePresetDetail] = useState(null);

  // Generation Parameters
  const [config, setConfig] = useState({
    model: 'nano-banana-pro',
    customModelId: '',
    selectedStylePreset: null,
    styleIntensity: 'moderate',
    aspectRatio: '16:9',
    effortLevel: 5,
    resolution: '4096x4096',
    outputFormat: 'image/png',
    dpi: 300,
    referenceImageBase64: [],
    referenceMode: 'style',
    referenceStrength: 0.5,
    selectedStyle: 'Ninguno',
    enableGrounding: true,
    negativePrompt: '',
    seed: '',
    personGeneration: 'ALLOW_ADULT',
    safetySetting: 'block_medium_and_above'
  });

  const [prompt, setPrompt] = useState('');
  const [batchCount, setBatchCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  // Persistent Gallery & Database State
  const [images, setImages] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showHistoryOnly, setShowHistoryOnly] = useState(false);

  // Load history & style presets from IndexedDB on startup (lightweight summary)
  const reloadFromDatabase = useCallback(() => {
    getGenerationsSummary().then((stored) => {
      setImages(stored);
    });
  }, []);

  const reloadStylePresets = useCallback(() => {
    getStylePresets(true).then((presets) => {
      setStylePresets(presets);
    });
  }, []);

  useEffect(() => {
    reloadFromDatabase();
    reloadStylePresets();

    // Migrate any legacy images that lack a thumbnailUrl in the background without blocking the UI
    migrateMissingThumbnails((updatedId, newThumb) => {
      setImages((prev) =>
        prev.map((item) =>
          item.id === updatedId ? { ...item, thumbnailUrl: newThumb, hasThumbnail: true } : item
        )
      );
    });

    if (!apiKey) {
      setShowApiKeyModal(true);
    }
  }, [apiKey, reloadFromDatabase, reloadStylePresets]);

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('google_ai_api_key', key);
  };

  const handleConfigChange = (newPartial) => {
    setConfig((prev) => ({ ...prev, ...newPartial }));
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    if (!prompt.trim()) return;

    setGenerating(true);
    setGenError(null);

    const activeModelId = config.model === 'custom' ? config.customModelId : config.model;

    const requestPayload = {
      model: activeModelId,
      prompt: prompt.trim(),
      stylePreset: config.selectedStylePreset,
      styleIntensity: config.styleIntensity,
      negativePrompt: config.negativePrompt,
      aspectRatio: config.aspectRatio,
      numberOfImages: batchCount,
      effortLevel: config.effortLevel,
      resolution: config.resolution,
      outputFormat: config.outputFormat,
      referenceImageBase64: config.referenceImageBase64,
      referenceMode: config.referenceMode,
      referenceStrength: config.referenceStrength,
      enableGrounding: config.enableGrounding,
      seed: config.seed,
      personGeneration: config.personGeneration,
      safetySetting: config.safetySetting
    };

    try {
      const results = await generateImages(apiKey, requestPayload);

      // Guarantee generated images are added to UI state immediately with lightweight thumbnail
      const savedItems = [];
      for (const item of results) {
        let saved = item;
        try {
          saved = (await saveGeneration(item)) || item;
        } catch (dbErr) {
          console.warn('Persisting to IndexedDB failed, displaying image in UI anyway:', dbErr);
        }
        savedItems.push({
          ...saved,
          thumbnailUrl: saved.thumbnailUrl || saved.dataUrl
        });
      }

      setImages((prev) => [...savedItems, ...prev]);
    } catch (err) {
      console.error('Nano Banana Generation Error:', err);
      setGenError(err.message || 'Ocurrió un error al comunicar con el modelo Nano Banana.');
    } finally {
      setGenerating(false);
    }
  };

  // On-demand full resolution loader for Lightbox: opens instantly with thumbnail, swaps full 4K dataUrl
  const handleSelectImage = useCallback(async (img) => {
    if (!img) return;

    // If the image already has the full dataUrl in memory (e.g. fresh generation/scratch), display directly
    if (img.dataUrl && !img._isSummary) {
      setLightboxImage(img);
      return;
    }

    // Immediately open lightbox with thumbnail for 0ms perceived latency
    setLightboxImage({
      ...img,
      dataUrl: img.thumbnailUrl || img.dataUrl,
      _loadingFullRes: true
    });

    // Fetch full 4K/2K resolution dataUrl from IndexedDB on demand
    try {
      const full = await getGenerationById(img.id);
      if (full && full.dataUrl) {
        setLightboxImage(full);
      }
    } catch (err) {
      console.warn('Could not load full resolution image from DB:', err);
    }
  }, []);

  const handleToggleFavorite = useCallback(async (id) => {
    const newFavStatus = await toggleFavorite(id);
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, favorite: newFavStatus } : img))
    );
    setLightboxImage((prev) => {
      if (prev?.id === id) {
        return { ...prev, favorite: newFavStatus };
      }
      return prev;
    });
  }, []);

  const handleDeleteImage = useCallback(async (id) => {
    await deleteGeneration(id);
    setImages((prev) => prev.filter((img) => img.id !== id));
    setLightboxImage((prev) => {
      if (prev?.id === id) {
        return null;
      }
      return prev;
    });
  }, []);

  const handleBulkDelete = useCallback(async (ids = []) => {
    if (!ids.length) return;
    await bulkDeleteGenerations(ids);
    setImages((prev) => prev.filter((img) => !ids.includes(img.id)));
    setLightboxImage((prev) => {
      if (prev && ids.includes(prev.id)) {
        return null;
      }
      return prev;
    });
  }, []);

  const handleBulkArchive = useCallback(async (ids = [], archive = true) => {
    if (!ids.length) return;
    await bulkArchiveGenerations(ids, archive);
    setImages((prev) =>
      prev.map((img) => (ids.includes(img.id) ? { ...img, archived: archive } : img))
    );
  }, []);

  const handleBulkDownload = useCallback(async (ids = []) => {
    if (!ids.length) return;
    for (let idx = 0; idx < ids.length; idx++) {
      const id = ids[idx];
      const full = (await getGenerationById(id)) || images.find((i) => i.id === id);
      if (full) {
        setTimeout(() => {
          downloadImage(full);
        }, idx * 250);
      }
    }
  }, [images]);

  const handleClearHistory = async () => {
    if (window.confirm('¿Deseas vaciar la base de datos local de imágenes generadas?')) {
      await clearAllHistory();
      setImages([]);
      setLightboxImage(null);
    }
  };

  const handleDownloadImage = useCallback(async (img) => {
    if (!img) return;
    let full = img;
    if (!full.dataUrl || full._isSummary) {
      full = (await getGenerationById(img.id)) || img;
    }
    downloadImage(full);
  }, []);

  const handleRemix = (img) => {
    if (!img.config) return;
    setPrompt(img.config.originalPrompt || img.config.prompt || '');

    const matchingStyle = stylePresets.find((p) => p.id === img.config.stylePresetId);

    setConfig((prev) => ({
      ...prev,
      model: img.config.model || prev.model,
      selectedStylePreset: matchingStyle || null,
      styleIntensity: img.config.styleIntensity || 'moderate',
      aspectRatio: img.config.aspectRatio || prev.aspectRatio,
      effortLevel: img.config.effortLevel || prev.effortLevel,
      resolution: img.config.resolution || prev.resolution,
      negativePrompt: img.config.negativePrompt || '',
      seed: img.config.seed || ''
    }));
    setLightboxImage(null);
  };

  const handleEditImage = async (sourceImage, editInstruction, options = {}) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      throw new Error('Por favor configura tu API Key.');
    }

    const activeModelId = config.model === 'custom' ? config.customModelId : config.model;

    const results = await editImage(apiKey, {
      sourceImage,
      editInstruction,
      model: activeModelId,
      aspectRatio: options.aspectRatio || sourceImage?.config?.aspectRatio || config.aspectRatio,
      resolution: options.resolution || sourceImage?.config?.resolution || config.resolution,
      dpi: config.dpi,
      effortLevel: config.effortLevel,
      enableGrounding: config.enableGrounding,
      ...options
    });

    const itemsArray = Array.isArray(results) ? results : [results];
    const savedItems = [];
    for (const item of itemsArray) {
      let saved = item;
      try {
        saved = (await saveGeneration(item)) || item;
      } catch (dbErr) {
        console.warn('Persisting edited image to IndexedDB failed:', dbErr);
      }
      savedItems.push({
        ...saved,
        thumbnailUrl: saved.thumbnailUrl || saved.dataUrl
      });
    }

    setImages((prev) => [...savedItems, ...prev]);
    return savedItems;
  };

  const handleUpscaleImage = async (sourceImage, targetResolution = '4K', method = 'ai') => {
    if (method === 'ai' && !apiKey) {
      setShowApiKeyModal(true);
      throw new Error('Por favor configura tu API Key para usar la super-resolución con IA.');
    }

    const activeModelId = config.model === 'custom' ? config.customModelId : config.model;

    const upscaled = await upscaleImage(apiKey, {
      sourceImage,
      targetResolution,
      method,
      model: activeModelId,
      aspectRatio: sourceImage?.config?.aspectRatio || config.aspectRatio,
      dpi: config.dpi,
      effortLevel: config.effortLevel,
      enableGrounding: config.enableGrounding
    });

    let saved = upscaled;
    try {
      saved = (await saveGeneration(upscaled)) || upscaled;
    } catch (dbErr) {
      console.warn('Persisting upscaled image failed:', dbErr);
    }

    const summaryItem = {
      ...saved,
      thumbnailUrl: saved.thumbnailUrl || saved.dataUrl
    };

    setImages((prev) => [summaryItem, ...prev]);
    return saved;
  };

  const handleBulkUpscale = async (ids = [], targetResolution = '4K') => {
    if (!ids.length) return;
    for (const id of ids) {
      try {
        const item = (await getGenerationById(id)) || images.find((img) => img.id === id);
        if (item) {
          await handleUpscaleImage(item, targetResolution, 'ai');
        }
      } catch (err) {
        console.warn(`Upscaling item ${id} failed:`, err);
      }
    }
  };

  const handleLoadToStudio = async (img) => {
    let target = img;
    if (!target?.dataUrl || target._isSummary) {
      target = (await getGenerationById(img.id)) || img;
    }
    if (!target?.dataUrl) return;

    setConfig((prev) => ({
      ...prev,
      referenceImageBase64: [target.dataUrl]
    }));

    if (target.config?.originalPrompt) {
      setPrompt(target.config.originalPrompt);
    }

    setLightboxImage(null);
  };

  const handleOpenNewEditor = async (initialImage = null) => {
    let baseDataUrl = null;
    if (initialImage) {
      if (typeof initialImage === 'string') {
        baseDataUrl = initialImage;
      } else if (initialImage.dataUrl && !initialImage._isSummary) {
        baseDataUrl = initialImage.dataUrl;
      } else if (initialImage.id) {
        const full = await getGenerationById(initialImage.id);
        baseDataUrl = full?.dataUrl || initialImage.thumbnailUrl;
      }
    } else {
      baseDataUrl = config.referenceImageBase64?.[0] || null;
    }

    const scratchItem = {
      id: 'scratch_' + Date.now(),
      isScratch: true,
      dataUrl: baseDataUrl,
      favorite: false,
      config: {
        originalPrompt: prompt || '',
        prompt: prompt || '',
        model: config.model,
        imageSize: config.resolution === '4096x4096' ? '4K' : '2K',
        aspectRatio: config.aspectRatio,
        effortLevel: config.effortLevel,
        resolution: config.resolution,
        dpi: config.dpi
      }
    };

    setLightboxImage(scratchItem);
  };

  return (
    <div className="studio-shell">
      <Navbar
        apiKey={apiKey}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        onOpenDatabaseModal={() => setShowDatabaseModal(true)}
        onOpenEditorModal={() => handleOpenNewEditor()}
        showHistory={showHistoryOnly}
        onToggleHistory={() => setShowHistoryOnly(!showHistoryOnly)}
        onClearHistory={handleClearHistory}
        historyCount={images.length}
      />

      <div className="studio-main">
        <Sidebar
          config={config}
          onChangeConfig={handleConfigChange}
          stylePresets={stylePresets}
          onOpenStyleExplorerModal={() => setShowStyleExplorerModal(true)}
          onOpenStyleAdminModal={() => setShowStyleAdminModal(true)}
        />

        <div className="studio-content">
          {genError && (
            <div
              style={{
                margin: '16px 24px 0',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                color: '#ef4444',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>⚠️ <strong>Error Nano Banana:</strong> {genError}</span>
              <button
                onClick={() => setGenError(null)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          )}

          <GalleryView
            images={images}
            generating={generating}
            batchCount={batchCount}
            onSelectImage={handleSelectImage}
            onOpenCompare={handleSelectImage}
            onDownload={handleDownloadImage}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteImage}
            onRemix={handleRemix}
            onSelectSamplePrompt={(sample) => setPrompt(sample)}
            onOpenEditorModal={() => handleOpenNewEditor()}
            onBulkDelete={handleBulkDelete}
            onBulkArchive={handleBulkArchive}
            onBulkDownload={handleBulkDownload}
            onBulkUpscale={handleBulkUpscale}
          />

          <PromptSection
            apiKey={apiKey}
            prompt={prompt}
            onChangePrompt={setPrompt}
            selectedStylePreset={config.selectedStylePreset}
            styleIntensity={config.styleIntensity}
            onChangeIntensity={(intensity) => setConfig((prev) => ({ ...prev, styleIntensity: intensity }))}
            onOpenStyleExplorer={() => setShowStyleExplorerModal(true)}
            onOpenEditorModal={() => handleOpenNewEditor()}
            referenceImageBase64={config.referenceImageBase64}
            onChangeReferenceImage={(base64) => setConfig((prev) => ({ ...prev, referenceImageBase64: base64 }))}
            enableGrounding={config.enableGrounding}
            onChangeGrounding={(val) => setConfig((prev) => ({ ...prev, enableGrounding: val }))}
            batchCount={batchCount}
            onChangeBatchCount={setBatchCount}
            onGenerate={handleGenerate}
            generating={generating}
          />
        </div>
      </div>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <Suspense fallback={null}>
        {showDatabaseModal && (
          <DatabaseModal
            isOpen={showDatabaseModal}
            onClose={() => setShowDatabaseModal(false)}
            totalItems={images.length}
            onRefreshHistory={reloadFromDatabase}
          />
        )}

        {showStyleExplorerModal && (
          <StyleExplorerModal
            isOpen={showStyleExplorerModal}
            onClose={() => setShowStyleExplorerModal(false)}
            presets={stylePresets}
            selectedPresetId={config.selectedStylePreset?.id || 'none'}
            onSelectPreset={(preset) => setConfig((prev) => ({ ...prev, selectedStylePreset: preset }))}
            onOpenDetailModal={(preset) => {
              setSelectedStylePresetDetail(preset);
              setShowStyleDetailModal(true);
            }}
            onOpenAdminModal={() => setShowStyleAdminModal(true)}
          />
        )}

        {showStyleDetailModal && (
          <StylePresetDetailModal
            preset={selectedStylePresetDetail}
            isOpen={showStyleDetailModal}
            onClose={() => setShowStyleDetailModal(false)}
            onSelectAndClose={(preset) => {
              setConfig((prev) => ({ ...prev, selectedStylePreset: preset }));
              setShowStyleDetailModal(false);
              setShowStyleExplorerModal(false);
            }}
          />
        )}

        {showStyleAdminModal && (
          <StyleAdminModal
            isOpen={showStyleAdminModal}
            onClose={() => setShowStyleAdminModal(false)}
            apiKey={apiKey}
            presets={stylePresets}
            onRefreshPresets={reloadStylePresets}
          />
        )}

        {lightboxImage && (
          <LightboxModal
            image={lightboxImage}
            isOpen={Boolean(lightboxImage)}
            onClose={() => setLightboxImage(null)}
            onDownload={handleDownloadImage}
            onToggleFavorite={handleToggleFavorite}
            onRemix={handleRemix}
            onDelete={handleDeleteImage}
            onLoadToStudio={handleLoadToStudio}
            onEditImage={handleEditImage}
            onUpscaleImage={handleUpscaleImage}
            apiKey={apiKey}
            referenceImage={config.referenceImageBase64}
            recentImages={images.slice(0, 10)}
          />
        )}
      </Suspense>
    </div>
  );
}
