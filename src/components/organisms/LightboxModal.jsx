import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Star,
  Columns,
  Info,
  Maximize2,
  Edit3,
  Trash2,
  Palette,
  ShieldAlert,
  Zap,
  MessageSquare,
  Globe,
  FolderDown,
  Sparkles,
  Wand2,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
  MapPin,
  Square,
  MousePointer,
  Trash,
  Crosshair,
  Layers,
  UploadCloud,
  FileImage,
  Rocket
} from 'lucide-react';
import { saveImageWithPicker } from '../../services/imageDownloader';
import { enhanceEditPrompt } from '../../services/googleAiApi';
import { getSpatialDescription } from '../../services/promptBuilder';
import { getGenerationById } from '../../services/database';
import CompareSlider from '../molecules/CompareSlider';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const GENERAL_EDIT_SUGGESTIONS = [
  { label: '🌅 Cambiar fondo', prompt: 'Cambia el fondo por un paisaje cinematográfico de montañas al atardecer' },
  { label: '🕶️ Añadir accesorio', prompt: 'Añade elegantes gafas de sol oscuras y una chaqueta moderna al sujeto' },
  { label: '🌧️ Clima lluvioso', prompt: 'Modifica la atmósfera para que sea de noche con lluvia intensa y reflejos de luz en el suelo' },
  { label: '🎨 Estilo Óleo', prompt: 'Transforma el acabado visual a una pintura al óleo clásica con pinceladas expresivas' },
  { label: '⚡ Iluminación Neón', prompt: 'Añade iluminación volumétrica de neón estilo cyberpunk con tonos cian y magenta' },
  { label: '👗 Ropa Elegante', prompt: 'Cambia la vestimenta del personaje por un elegante traje de alta costura' }
];

const QUICK_AREA_CHIPS = [
  'Poner lentes de sol',
  'Cambiar color a negro',
  'Añadir iluminación dorada',
  'Transformar textura',
  'Eliminar este elemento',
  'Hacer más nítido / detallado'
];

export default function LightboxModal({
  image,
  isOpen,
  onClose,
  onDownload,
  onToggleFavorite,
  onRemix,
  onDelete,
  onLoadToStudio,
  onEditImage,
  onUpscaleImage,
  apiKey,
  referenceImage,
  recentImages = []
}) {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [mode, setMode] = useState('single');
  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState(0);

  // Drawer Tabs: 'inspect' or 'edit'
  const isScratchMode = Boolean(image?.isScratch);
  const [activeTab, setActiveTab] = useState(isScratchMode ? 'edit' : 'inspect');

  // Base Image DataUrl (can be loaded/replaced in scratch mode)
  const [baseImageDataUrl, setBaseImageDataUrl] = useState(image?.dataUrl || null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  // AI Edit States
  const [editInstruction, setEditInstruction] = useState('');
  const [editBatchCount, setEditBatchCount] = useState(1); // 1 to 4 images
  const [styleReferenceBase64, setStyleReferenceBase64] = useState(null); // Artistic style reference image
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editedResults, setEditedResults] = useState([]); // Array of generated edited variants
  const [selectedEditedIdx, setSelectedEditedIdx] = useState(0);
  const [isEnhancingEdit, setIsEnhancingEdit] = useState(false);
  const [editSuccessNotice, setEditSuccessNotice] = useState(null);

  // Upscale States
  const [upscaleTargetRes, setUpscaleTargetRes] = useState('4K'); // '2K' | '4K'
  const [upscaleMethod, setUpscaleMethod] = useState('ai'); // 'ai' | 'canvas'
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleError, setUpscaleError] = useState(null);

  // Interactive Area Annotations & Comments States
  const [annotations, setAnnotations] = useState([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState(null);
  const [annotationTool, setAnnotationTool] = useState('pin'); // 'pin' | 'box' | 'view'
  const [drawingBox, setDrawingBox] = useState(null); // { startX, startY, currentX, currentY }

  const imageContainerRef = useRef(null);

  // Synchronize baseImageDataUrl and initial tab when image changes
  useEffect(() => {
    if (image) {
      setBaseImageDataUrl(image.dataUrl || image.thumbnailUrl || null);
      if (image.isScratch) {
        setActiveTab('edit');
      }
      setEditedResults([]);
      setAnnotations([]);
      setEditError(null);
      setUpscaleError(null);
      setEditSuccessNotice(null);
    }
  }, [image]);

  // Global paste handler to paste an image onto the canvas in scratch mode
  useEffect(() => {
    if (!isOpen || baseImageDataUrl) return;

    const handleWindowPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setBaseImageDataUrl(event.target.result);
                setActiveTab('edit');
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isOpen, baseImageDataUrl]);

  if (!isOpen || !image) return null;

  // Determine reference images for subject comparison
  const rawSubjectRef = image.config?.referenceImageBase64 || referenceImage;
  const subjectImages = Array.isArray(rawSubjectRef)
    ? rawSubjectRef
    : rawSubjectRef
    ? [rawSubjectRef]
    : [];

  const hasSubjectReference = subjectImages.length > 0;
  const subjectReferenceImage = subjectImages[selectedSubjectIdx] || subjectImages[0] || null;
  const firstStyleRef = image.config?.styleReferences?.[0]?.url;

  // Active edited variant if available
  const activeEditedResult = editedResults[selectedEditedIdx] || null;
  const hasEditedResult = Boolean(activeEditedResult);

  // Compare mode data: If an edited result exists, compare original vs active edited result!
  const compareImage = hasEditedResult
    ? baseImageDataUrl
    : (subjectReferenceImage || firstStyleRef);
  const overlayImage = hasEditedResult
    ? activeEditedResult.dataUrl
    : baseImageDataUrl;

  const compareBaseLabel = hasEditedResult
    ? `🖼️ Original (${image.config?.imageSize || '1024'})`
    : (subjectReferenceImage ? `📷 Sujeto #${selectedSubjectIdx + 1}` : '🎨 Estilo Referencia');

  const compareOverlayLabel = hasEditedResult
    ? (activeEditedResult.config?.isUpscaled
        ? `🚀 Reescalada (${activeEditedResult.config?.imageSize || upscaleTargetRes})`
        : (editedResults.length > 1 ? `✨ Variante #${selectedEditedIdx + 1}` : '✨ Versión Editada con IA'))
    : '✨ Resultado Sintetizado';

  const copyText = (text, type) => {
    if (!text) return;
    // navigator.clipboard only exists in secure contexts (HTTPS/localhost);
    // umbrelOS serves apps over plain HTTP, so fall back to execCommand.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    if (type === 'original') {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else if (type === 'full') {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    } else {
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    }
  };

  // ─── BASE IMAGE UPLOAD (FOR SCRATCH MODE) ──────────────────────────────
  const handleUploadBaseImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBaseImageDataUrl(event.target.result);
        setActiveTab('edit');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBaseDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCanvas(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBaseImageDataUrl(event.target.result);
          setActiveTab('edit');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ─── STYLE REFERENCE FILE UPLOAD ──────────────────────────────────────
  const handleUploadStyleRef = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setStyleReferenceBase64(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── CANVAS INTERACTION HANDLERS ──────────────────────────────────────
  const getRelativeCoords = (e) => {
    if (!imageContainerRef.current) return { x: 50, y: 50 };
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleCanvasClick = (e) => {
    if (activeTab !== 'edit' || annotationTool !== 'pin' || isEditing || isUpscaling || !baseImageDataUrl) return;
    if (e.target.closest('.canvas-annotation-pin') || e.target.closest('.canvas-annotation-box')) return;

    const { x, y } = getRelativeCoords(e);
    const newPin = {
      id: `pin_${Date.now()}`,
      type: 'pin',
      x,
      y,
      comment: '',
      label: `Punto #${annotations.length + 1}`
    };

    setAnnotations((prev) => [...prev, newPin]);
    setActiveAnnotationId(newPin.id);
  };

  const handleMouseDown = (e) => {
    if (activeTab !== 'edit' || annotationTool !== 'box' || isEditing || isUpscaling || !baseImageDataUrl) return;
    if (e.target.closest('.canvas-annotation-pin') || e.target.closest('.canvas-annotation-box')) return;

    const { x, y } = getRelativeCoords(e);
    setDrawingBox({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMouseMove = (e) => {
    if (!drawingBox) return;
    const { x, y } = getRelativeCoords(e);
    setDrawingBox((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));
  };

  const handleMouseUp = () => {
    if (!drawingBox) return;
    const x = Math.min(drawingBox.startX, drawingBox.currentX);
    const y = Math.min(drawingBox.startY, drawingBox.currentY);
    const width = Math.abs(drawingBox.currentX - drawingBox.startX);
    const height = Math.abs(drawingBox.currentY - drawingBox.startY);

    if (width > 2 && height > 2) {
      const newBox = {
        id: `box_${Date.now()}`,
        type: 'box',
        x,
        y,
        width,
        height,
        comment: '',
        label: `Área #${annotations.length + 1}`
      };
      setAnnotations((prev) => [...prev, newBox]);
      setActiveAnnotationId(newBox.id);
    }
    setDrawingBox(null);
  };

  const handleRemoveAnnotation = (id, e) => {
    if (e) e.stopPropagation();
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (activeAnnotationId === id) {
      setActiveAnnotationId(null);
    }
  };

  const handleUpdateAnnotationComment = (id, comment) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, comment } : a))
    );
  };

  const handleClearAllAnnotations = () => {
    setAnnotations([]);
    setActiveAnnotationId(null);
  };

  // ─── AI GENERATION HANDLERS ───────────────────────────────────────────
  const handleMagicEnhanceEdit = async () => {
    if ((!editInstruction.trim() && annotations.length === 0) || isEnhancingEdit) return;
    setIsEnhancingEdit(true);
    try {
      const origPrompt = image.config?.originalPrompt || image.config?.prompt || '';
      const enhanced = await enhanceEditPrompt(apiKey, editInstruction.trim(), origPrompt, annotations);
      setEditInstruction(enhanced);
    } catch (err) {
      alert(err.message || 'No se pudo optimizar el prompt de edición.');
    } finally {
      setIsEnhancingEdit(false);
    }
  };

  const handleExecuteEdit = async () => {
    if (!baseImageDataUrl) {
      setEditError('Por favor sube o selecciona una imagen base antes de generar la edición.');
      return;
    }

    const hasAnnotations = annotations.some((a) => a.comment?.trim());
    if (!editInstruction.trim() && !hasAnnotations && !styleReferenceBase64) {
      setEditError('Por favor escribe qué cambios deseas, agrega un comentario en las áreas marcadas o sube un estilo de referencia.');
      return;
    }
    if (!onEditImage) return;

    setIsEditing(true);
    setEditError(null);
    setEditSuccessNotice(null);

    try {
      const sourceImagePayload = {
        ...image,
        dataUrl: baseImageDataUrl
      };

      const results = await onEditImage(sourceImagePayload, editInstruction.trim(), {
        annotations,
        numberOfImages: editBatchCount,
        styleReferenceBase64
      });

      const newImages = Array.isArray(results) ? results : [results];
      if (newImages.length > 0) {
        setEditedResults(newImages);
        setSelectedEditedIdx(0);
        setMode('split'); // Automatically switch to split compare mode
        setEditSuccessNotice(
          newImages.length === 1
            ? '¡Edición completada con éxito! Revisa la comparación.'
            : `¡${newImages.length} variantes generadas con éxito! Selecciona una variante arriba para comparar.`
        );
        setTimeout(() => setEditSuccessNotice(null), 6000);
      }
    } catch (err) {
      console.error('Error al editar imagen:', err);
      setEditError(err.message || 'Ocurrió un error al procesar la edición con el modelo.');
    } finally {
      setIsEditing(false);
    }
  };

  // ─── AI / CANVAS UPSCALE HANDLER ──────────────────────────────────────
  const handleExecuteUpscale = async () => {
    const targetSource = hasEditedResult ? activeEditedResult : { ...image, dataUrl: baseImageDataUrl };
    if (!targetSource?.dataUrl) {
      alert('Por favor carga una imagen antes de reescalar.');
      return;
    }
    if (!onUpscaleImage) return;

    setIsUpscaling(true);
    setUpscaleError(null);
    setEditSuccessNotice(null);

    try {
      const upscaled = await onUpscaleImage(targetSource, upscaleTargetRes, upscaleMethod);
      if (upscaled) {
        setEditedResults([upscaled]);
        setSelectedEditedIdx(0);
        setMode('split');
        setEditSuccessNotice(`¡Imagen reescalada exitosamente a ${upscaleTargetRes} (${upscaleMethod === 'ai' ? 'IA Super-Resolution' : 'Canvas 300 DPI'})! Desliza para comparar.`);
        setTimeout(() => setEditSuccessNotice(null), 6000);
      }
    } catch (err) {
      console.error('Error al reescalar imagen:', err);
      setUpscaleError(err.message || 'Error al reescalar la imagen.');
    } finally {
      setIsUpscaling(false);
    }
  };

  const userPrompt = image.config?.originalPrompt || image.config?.prompt;
  const fullModelPrompt = image.config?.prompt;
  const isFav = Boolean(image.favorite);

  return (
    <div
      className="ui-dialog-backdrop"
      style={{ padding: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="studio-lightbox-shell">
        {/* ─── LEFT CANVAS AREA ─── */}
        <div className="studio-lightbox-canvas">
          {/* Top-Left View Mode Toolbar */}
          <div className="lightbox-top-toolbar">
            <button
              type="button"
              className={`lightbox-mode-pill ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
            >
              <Maximize2 size={13} /> {isScratchMode ? 'Lienzo de Edición' : 'Imagen Completa'}
            </button>

            {baseImageDataUrl && (
              <button
                type="button"
                className={`lightbox-mode-pill ${mode === 'split' ? 'active' : ''}`}
                onClick={() => setMode('split')}
              >
                <Columns size={13} /> {hasEditedResult ? 'Comparar (Antes / Después)' : 'Comparar Referencia'}
              </button>
            )}

            {/* Edited Variants Switcher Bar */}
            {editedResults.length > 1 && (
              <div className="edited-variants-bar">
                <span style={{ fontSize: '0.64rem', color: 'var(--accent-gold-text)', fontWeight: 700 }}>
                  Variantes ({editedResults.length}):
                </span>
                {editedResults.map((_, vIdx) => (
                  <button
                    key={vIdx}
                    type="button"
                    className={`edited-variant-pill ${selectedEditedIdx === vIdx ? 'active' : ''}`}
                    onClick={() => setSelectedEditedIdx(vIdx)}
                  >
                    #{vIdx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Top-Right Quick Actions */}
          <div className="lightbox-top-actions">
            {baseImageDataUrl && onDownload && (
              <button
                type="button"
                onClick={() => onDownload(hasEditedResult ? activeEditedResult : { ...image, dataUrl: baseImageDataUrl })}
                className="lightbox-icon-btn gold"
                title="Descargar Imagen"
              >
                <Download size={16} />
              </button>
            )}

            {!isScratchMode && onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(image.id)}
                className="lightbox-icon-btn"
                title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Star size={16} fill={isFav ? 'var(--accent-gold)' : 'none'} color={isFav ? 'var(--accent-gold)' : '#fff'} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="lightbox-icon-btn"
              title="Cerrar visor"
            >
              <X size={17} />
            </button>
          </div>

          {/* Mode 1: Single Canvas or Scratch Empty Dropzone */}
          {mode === 'single' && (
            <>
              {/* CASE A: No Base Image Loaded Yet (Scratch Mode) */}
              {!baseImageDataUrl ? (
                <div
                  className={`canvas-empty-dropzone ${isDraggingCanvas ? 'dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingCanvas(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingCanvas(false); }}
                  onDrop={handleBaseDrop}
                >
                  <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadBaseImage}
                      style={{ display: 'none' }}
                    />
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-gold-soft)', border: '1px solid var(--accent-gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                      <UploadCloud size={30} color="var(--accent-gold)" />
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                      Cargar Imagen Base para Edición o Reescalado
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45', maxWidth: '380px', marginBottom: '16px' }}>
                      Arrastra una imagen aquí, haz clic para buscar un archivo o presiona <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px', color: '#fff' }}>Ctrl+V / ⌘V</kbd> para pegar desde el portapapeles.
                    </p>

                    <Button variant="gold" size="sm" icon={FileImage}>
                      Buscar Imagen en mi Equipo
                    </Button>
                  </label>

                  {/* Quick Select from Recent Generations */}
                  {recentImages.length > 0 && (
                    <div style={{ marginTop: '24px', width: '100%', borderTop: '1px solid var(--border-default)', paddingTop: '16px', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-gold-text)', display: 'block', marginBottom: '6px' }}>
                        💡 O selecciona una de tus imágenes recientes:
                      </span>
                      <div className="scratch-gallery-picker">
                        {recentImages.slice(0, 7).map((item) => (
                          <img
                            key={item.id}
                            src={item.thumbnailUrl || item.dataUrl}
                            alt="Reciente"
                            className="scratch-gallery-thumb"
                            loading="lazy"
                            onClick={async () => {
                              if (item.dataUrl && !item._isSummary) {
                                setBaseImageDataUrl(item.dataUrl);
                              } else {
                                const full = await getGenerationById(item.id);
                                setBaseImageDataUrl(full?.dataUrl || item.thumbnailUrl || item.dataUrl);
                              }
                            }}
                            title="Haz clic para usar como imagen base"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* CASE B: Base Image Present - Interactive Annotations Layer */
                <div
                  ref={imageContainerRef}
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxWidth: '92%',
                    maxHeight: '88vh'
                  }}
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <img
                    src={hasEditedResult ? activeEditedResult.dataUrl : baseImageDataUrl}
                    alt={userPrompt || 'Nano Banana Imagen'}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '88vh',
                      objectFit: 'contain',
                      borderRadius: 'var(--radius-sm)',
                      display: 'block',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Interactive Annotations Overlay (visible in Edit Tab & when editing base image) */}
                  {activeTab === 'edit' && !hasEditedResult && (
                    <div className={`canvas-annotation-layer ${annotationTool === 'view' ? 'view-mode' : ''}`}>
                      {/* Render Drawing Box in progress */}
                      {drawingBox && (
                        <div
                          className="canvas-annotation-box"
                          style={{
                            left: `${Math.min(drawingBox.startX, drawingBox.currentX)}%`,
                            top: `${Math.min(drawingBox.startY, drawingBox.currentY)}%`,
                            width: `${Math.abs(drawingBox.currentX - drawingBox.startX)}%`,
                            height: `${Math.abs(drawingBox.currentY - drawingBox.startY)}%`,
                            borderStyle: 'solid'
                          }}
                        />
                      )}

                      {/* Render Saved Annotations (Pins & Boxes) */}
                      {annotations.map((ann, idx) => {
                        const isActive = activeAnnotationId === ann.id;

                        if (ann.type === 'box') {
                          return (
                            <div
                              key={ann.id}
                              className={`canvas-annotation-box ${isActive ? 'active' : ''}`}
                              style={{
                                left: `${ann.x}%`,
                                top: `${ann.y}%`,
                                width: `${ann.width}%`,
                                height: `${ann.height}%`
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAnnotationId(ann.id);
                              }}
                            >
                              <span className="canvas-annotation-box-badge">
                                #{idx + 1} {ann.comment ? `• ${ann.comment.slice(0, 18)}...` : ''}
                              </span>
                            </div>
                          );
                        }

                        // Pin Marker
                        return (
                          <div
                            key={ann.id}
                            className={`canvas-annotation-pin ${isActive ? 'active' : ''}`}
                            style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAnnotationId(ann.id);
                            }}
                          >
                            <div className="pin-head">
                              <span className="pin-number">{idx + 1}</span>
                            </div>
                            <div className="pin-pulse" />
                            {ann.comment && (
                              <span className="pin-tooltip">
                                {ann.comment.slice(0, 24)}...
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Floating Canvas Tool Selector in Edit Mode */}
                  {activeTab === 'edit' && !hasEditedResult && (
                    <div className="canvas-annotation-toolbar">
                      <button
                        type="button"
                        className={`annotation-tool-btn ${annotationTool === 'pin' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnnotationTool('pin');
                        }}
                        title="Haz clic sobre cualquier parte de la imagen para colocar un punto numerado y comentarlo"
                      >
                        <MapPin size={13} /> Marcar Punto (Pin)
                      </button>

                      <button
                        type="button"
                        className={`annotation-tool-btn ${annotationTool === 'box' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnnotationTool('box');
                        }}
                        title="Arrastra sobre la imagen para seleccionar un área rectangular específica"
                      >
                        <Square size={13} /> Marcar Área
                      </button>

                      <button
                        type="button"
                        className={`annotation-tool-btn ${annotationTool === 'view' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnnotationTool('view');
                        }}
                        title="Modo visualización normal"
                      >
                        <MousePointer size={13} /> Ver
                      </button>

                      {annotations.length > 0 && (
                        <button
                          type="button"
                          className="annotation-tool-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearAllAnnotations();
                          }}
                          style={{ color: 'var(--accent-rose)' }}
                          title="Limpiar todas las anotaciones"
                        >
                          <Trash size={13} /> Limpiar ({annotations.length})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Generating / Upscaling loading overlay */}
                  {(isEditing || isUpscaling) && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', zIndex: 30, borderRadius: 'var(--radius-sm)' }}>
                      <Rocket size={42} color="var(--accent-gold)" className="ui-icon-spin" />
                      <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.05rem' }}>
                        {isUpscaling
                          ? `Reescalando a ${upscaleTargetRes} Ultra HD (${upscaleMethod === 'ai' ? 'IA Super-Resolution' : 'Canvas 300 DPI'})...`
                          : `Sintetizando ${editBatchCount > 1 ? `${editBatchCount} variantes de edición` : 'edición de imagen'} con IA...`}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {isUpscaling
                          ? 'Maximizando micro-texturas, nitidez y eliminando artefactos...'
                          : (styleReferenceBase64 ? 'Aplicando estilo artístico de referencia y coordenadas' : 'Aplicando comentarios y coordenadas espaciales')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Mode 2: Split Compare Slider */}
          {mode === 'split' && (
            <>
              {compareImage ? (
                <CompareSlider
                  baseImage={compareImage}
                  overlayImage={overlayImage}
                  baseLabel={compareBaseLabel}
                  overlayLabel={compareOverlayLabel}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', maxWidth: '400px', background: 'rgba(18, 18, 21, 0.9)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
                  <ShieldAlert size={32} color="var(--accent-gold)" style={{ marginBottom: '10px' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                    Sin Imagen de Referencia
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '14px' }}>
                    Esta imagen fue generada exclusivamente a partir de texto. Puedes editarla o reescalarla en la pestaña lateral para comparar.
                  </p>
                  <Button variant="gold" size="sm" onClick={() => { setActiveTab('edit'); setMode('single'); }}>
                    ✨ Editar esta imagen ahora
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── RIGHT DRAWER (INSPECTION & AI EDIT) ─── */}
        <div className="studio-lightbox-drawer">
          {/* Drawer Navigation Tabs */}
          <div className="lightbox-tab-bar">
            {!isScratchMode && (
              <button
                type="button"
                className={`lightbox-tab-btn ${activeTab === 'inspect' ? 'active' : ''}`}
                onClick={() => setActiveTab('inspect')}
              >
                <Info size={14} /> Inspección
              </button>
            )}

            <button
              type="button"
              className={`lightbox-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('edit');
                if (mode !== 'single') setMode('single');
              }}
              style={{ flex: isScratchMode ? 1 : undefined }}
            >
              <Sparkles size={14} /> Editar con IA {annotations.length > 0 && `(${annotations.length})`}
            </button>
          </div>

          {/* ══════════════ TAB 1: INSPECTION VIEW ══════════════ */}
          {activeTab === 'inspect' && !isScratchMode && (
            <>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Info size={16} color="var(--accent-gold)" /> Especificaciones
                </span>
                <Badge variant="gold">{image.config?.imageSize || '4K'}</Badge>
              </div>

              {/* ─── 🚀 UPSCALE & SUPER-RESOLUTION CARD (INSPECTION VIEW) ─── */}
              <div className="upscale-card-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Rocket size={14} color="var(--accent-gold)" /> Reescalar & Super-Resolución
                  </span>
                  <Badge variant="gold">{upscaleTargetRes}</Badge>
                </div>

                {/* Target Resolution Selector (2K vs 4K) */}
                <div>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Resolución de Destino:
                  </span>
                  <div className="upscale-pill-group">
                    <button
                      type="button"
                      className={`upscale-pill ${upscaleTargetRes === '2K' ? 'active' : ''}`}
                      onClick={() => setUpscaleTargetRes('2K')}
                      disabled={isUpscaling}
                    >
                      2K Quad HD (2048px)
                    </button>
                    <button
                      type="button"
                      className={`upscale-pill ${upscaleTargetRes === '4K' ? 'active' : ''}`}
                      onClick={() => setUpscaleTargetRes('4K')}
                      disabled={isUpscaling}
                    >
                      4K Ultra HD (4096px)
                    </button>
                  </div>
                </div>

                {/* Engine / Method Selector (AI vs Canvas) */}
                <div>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Motor de Reescalado:
                  </span>
                  <div className="upscale-pill-group">
                    <button
                      type="button"
                      className={`upscale-pill ${upscaleMethod === 'ai' ? 'active' : ''}`}
                      onClick={() => setUpscaleMethod('ai')}
                      disabled={isUpscaling}
                      title="Reconstruye micro-detalles dérmicos, texturas y elimina artefactos con Gemini / Imagen"
                    >
                      ✨ IA Super-Resolution
                    </button>
                    <button
                      type="button"
                      className={`upscale-pill ${upscaleMethod === 'canvas' ? 'active' : ''}`}
                      onClick={() => setUpscaleMethod('canvas')}
                      disabled={isUpscaling}
                      title="Reescalado instantáneo de alta precisión con enfoque Unsharp Mask a 300 DPI"
                    >
                      ⚡ Canvas 300 DPI
                    </button>
                  </div>
                </div>

                {upscaleError && (
                  <div style={{ color: 'var(--accent-rose)', fontSize: '0.72rem', background: 'var(--accent-rose-soft)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--accent-rose-border)' }}>
                    {upscaleError}
                  </div>
                )}

                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleExecuteUpscale}
                  disabled={isUpscaling || isEditing}
                  loading={isUpscaling}
                  icon={isUpscaling ? RefreshCw : Rocket}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isUpscaling
                    ? `Reescalando a ${upscaleTargetRes}...`
                    : `🚀 Reescalar a ${upscaleTargetRes} (${upscaleMethod === 'ai' ? 'IA' : 'Canvas'})`}
                </Button>
              </div>

              {/* Subject Reference Thumbnails */}
              {hasSubjectReference && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-gold-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-gold-text)' }}>
                      📷 Referencias de Sujeto ({subjectImages.length})
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      Transferencia visual
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {subjectImages.map((subUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedSubjectIdx(idx)}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-xs)',
                          overflow: 'hidden',
                          border: selectedSubjectIdx === idx ? '2px solid var(--accent-gold)' : '1px solid var(--border-default)',
                          width: '44px',
                          height: '44px',
                          flexShrink: 0
                        }}
                        title="Click para seleccionar en comparativa"
                      >
                        <img src={subUrl} alt={`Sujeto #${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Original User Prompt */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="field-label" style={{ margin: 0, gap: '4px' }}>
                    <MessageSquare size={12} color="var(--accent-gold)" /> Prompt del Usuario:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(userPrompt, 'original')}
                    style={{ background: 'transparent', border: 'none', color: copiedOriginal ? '#10b981' : 'var(--accent-gold-text)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    {copiedOriginal ? <Check size={11} /> : <Copy size={11} />}
                    {copiedOriginal ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="lightbox-prompt-box">
                  {userPrompt}
                </div>
              </div>

              {/* 2. Full Model Prompt */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="field-label" style={{ margin: 0, gap: '4px' }}>
                    <Zap size={12} color="var(--accent-gold)" /> Prompt Expandido Enviado:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(fullModelPrompt, 'full')}
                    style={{ background: 'transparent', border: 'none', color: copiedFull ? '#10b981' : 'var(--accent-gold-text)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    {copiedFull ? <Check size={11} /> : <Copy size={11} />}
                    {copiedFull ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="lightbox-prompt-box lightbox-prompt-box--gold">
                  {fullModelPrompt}
                </div>
              </div>

              {/* Negative Prompt (if any) */}
              {image.config?.negativePrompt && (
                <div>
                  <span className="field-label" style={{ marginBottom: '3px' }}>Exclusiones:</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', background: 'var(--accent-rose-soft)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-rose-border)' }}>
                    {image.config.negativePrompt}
                  </div>
                </div>
              )}

              {/* Style Preset Badge */}
              {image.config?.stylePresetName && (
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                    Estilo Predefinido
                  </span>
                  <span style={{ color: 'var(--accent-gold-text)', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Palette size={13} /> {image.config.stylePresetName}
                  </span>
                </div>
              )}

              {/* Technical Specs Grid */}
              <div>
                <span className="field-label" style={{ marginBottom: '6px' }}>Especificaciones Técnicas:</span>
                <div className="lightbox-meta-grid">
                  <div className="lightbox-meta-card">
                    <span className="lightbox-meta-label">Modelo</span>
                    <span className="lightbox-meta-value">{image.config?.model || 'Nano Banana Pro'}</span>
                  </div>

                  <div className="lightbox-meta-card">
                    <span className="lightbox-meta-label">Resolución</span>
                    <span className="lightbox-meta-value gold">{image.config?.imageSize || '4K Ultra'}</span>
                  </div>

                  <div className="lightbox-meta-card">
                    <span className="lightbox-meta-label">Proporción</span>
                    <span className="lightbox-meta-value">{image.config?.aspectRatio || '16:9'}</span>
                  </div>

                  <div className="lightbox-meta-card">
                    <span className="lightbox-meta-label">Imprenta (DPI)</span>
                    <span className="lightbox-meta-value gold">{image.config?.dpi || 300} DPI</span>
                  </div>

                  <div className="lightbox-meta-card">
                    <span className="lightbox-meta-label">Razonamiento</span>
                    <span className="lightbox-meta-value">{image.config?.effortLevel || 5} / 5 ★</span>
                  </div>

                  <div className="lightbox-meta-card">
                    <span className="lightbox-meta-label">Web Grounding</span>
                    <span className="lightbox-meta-value" style={{ color: image.config?.enableGrounding !== false ? 'var(--accent-sky)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={11} /> {image.config?.enableGrounding !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="lightbox-meta-card full-width">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="lightbox-meta-label">Semilla (Seed):</span>
                      <button
                        type="button"
                        onClick={() => copyText(String(image.config?.seed), 'seed')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold-text)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {copiedSeed ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem' }}>
                      {image.config?.seed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Pinned at Bottom */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
                <Button
                  variant="gold"
                  onClick={() => {
                    setActiveTab('edit');
                    if (mode !== 'single') setMode('single');
                  }}
                  icon={Sparkles}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  ✨ Editar esta Imagen con IA
                </Button>

                {onLoadToStudio && (
                  <Button
                    variant="outline"
                    onClick={() => onLoadToStudio(image)}
                    icon={ExternalLink}
                    style={{ width: '100%', justifyContent: 'center' }}
                    title="Cargar como foto de referencia en el panel principal del estudio"
                  >
                    📥 Cargar en Estudio (Prompt Dock)
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => onRemix(image)}
                  icon={Edit3}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Reutilizar Prompt (Remix)
                </Button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="outline"
                    onClick={() => onDownload(image)}
                    icon={Download}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Descargar
                  </Button>

                  {typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function' && (
                    <Button
                      variant="outline"
                      onClick={() => saveImageWithPicker(image)}
                      icon={FolderDown}
                      title="Guardar como... (elegir destino)"
                    >
                      Guardar como...
                    </Button>
                  )}
                </div>

                {onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(image.id)}
                    icon={Trash2}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Eliminar de la Base de Datos
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ══════════════ TAB 2: AI EDIT VIEW ══════════════ */}
          {activeTab === 'edit' && (
            <div className="lightbox-edit-section">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Sparkles size={16} color="var(--accent-gold)" /> Edición con IA
                </span>
                <Badge variant="gold">
                  {annotations.length} {annotations.length === 1 ? 'Área marcada' : 'Áreas marcadas'}
                </Badge>
              </div>

              {/* Source Base Image Preview / Replace button */}
              {baseImageDataUrl ? (
                <div className="edit-source-card">
                  <img src={baseImageDataUrl} alt="Imagen Base" className="edit-source-thumb" />
                  <div className="edit-source-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="edit-source-title">
                        <ImageIcon size={12} /> Imagen Base Activa
                      </span>
                      <label style={{ cursor: 'pointer', fontSize: '0.62rem', color: 'var(--accent-gold-text)', textDecoration: 'underline' }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadBaseImage}
                          style={{ display: 'none' }}
                        />
                        Cambiar
                      </label>
                    </div>
                    <span className="edit-source-sub">
                      {userPrompt ? `"${userPrompt}"` : 'Imagen para modificar'}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--accent-gold-text)' }}>
                      {image.config?.imageSize || '4K'} • {image.config?.aspectRatio || '16:9'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--accent-gold-border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    No hay imagen base seleccionada
                  </span>
                  <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadBaseImage}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold-text)', fontWeight: 700 }}>
                      + Subir Imagen Base ahora
                    </span>
                  </label>
                </div>
              )}

              {/* ─── 🚀 UPSCALE TOOL CARD (IN EDIT VIEW AS WELL) ─── */}
              {baseImageDataUrl && (
                <div className="upscale-card-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Rocket size={13} color="var(--accent-gold)" /> Reescalar esta Imagen a:
                    </span>
                    <Badge variant="gold">{upscaleTargetRes}</Badge>
                  </div>

                  <div className="upscale-pill-group">
                    <button
                      type="button"
                      className={`upscale-pill ${upscaleTargetRes === '2K' ? 'active' : ''}`}
                      onClick={() => setUpscaleTargetRes('2K')}
                      disabled={isUpscaling}
                    >
                      2K (2048px)
                    </button>
                    <button
                      type="button"
                      className={`upscale-pill ${upscaleTargetRes === '4K' ? 'active' : ''}`}
                      onClick={() => setUpscaleTargetRes('4K')}
                      disabled={isUpscaling}
                    >
                      4K Ultra HD (4096px)
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={handleExecuteUpscale}
                      disabled={isUpscaling || isEditing}
                      loading={isUpscaling}
                      icon={isUpscaling ? RefreshCw : Rocket}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {isUpscaling ? `Reescalando...` : `🚀 Reescalar a ${upscaleTargetRes}`}
                    </Button>
                  </div>
                </div>
              )}

              {/* Success / Error Banners */}
              {editSuccessNotice && (
                <div className="edit-success-banner">
                  <Check size={14} /> {editSuccessNotice}
                </div>
              )}
              {editError && (
                <div className="edit-error-banner">
                  <ShieldAlert size={14} /> {editError}
                </div>
              )}

              {/* ─── 1. BATCH VARIANTS COUNT SELECTOR (MÁX 4) ─── */}
              <div>
                <div className="field-label" style={{ marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Layers size={12} color="var(--accent-gold)" /> Cantidad de Imágenes a Generar:
                  </span>
                  <Badge variant="gold">{editBatchCount} {editBatchCount === 1 ? 'variante' : 'variantes'}</Badge>
                </div>
                <div className="edit-batch-group">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`edit-batch-pill ${editBatchCount === num ? 'active' : ''}`}
                      onClick={() => setEditBatchCount(num)}
                      disabled={isEditing}
                    >
                      {num} {num === 1 ? 'Foto' : 'Fotos'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── 2. ARTISTIC STYLE REFERENCE FILE UPLOADER ─── */}
              <div className="edit-styleref-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="field-label" style={{ margin: 0, gap: '5px' }}>
                    <Palette size={12} color="var(--accent-gold)" /> Estilo Visual de Referencia:
                  </span>
                  {styleReferenceBase64 && (
                    <button
                      type="button"
                      onClick={() => setStyleReferenceBase64(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Quitar
                    </button>
                  )}
                </div>

                {styleReferenceBase64 ? (
                  <div className="edit-styleref-preview">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={styleReferenceBase64} alt="Estilo de Referencia" className="edit-styleref-thumb" />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          🎨 Estilo Artístico Cargado
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--accent-gold-text)' }}>
                          Se transferirá sólo la estética y acabado
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStyleReferenceBase64(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}
                      title="Eliminar estilo de referencia"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="edit-styleref-dropzone" title="Subir imagen para extraer sólo su estilo artístico">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadStyleRef}
                      style={{ display: 'none' }}
                      disabled={isEditing}
                    />
                    <UploadCloud size={16} color="var(--accent-gold)" />
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-gold-text)' }}>
                        Subir archivo de estilo artístico...
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                        La IA extraerá únicamente colores, luces y pinceladas
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* ─── 3. MARKED AREAS & COMMENTS ─── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="field-label" style={{ margin: 0, gap: '4px' }}>
                    <Crosshair size={13} color="var(--accent-gold)" /> Áreas Marcadas & Comentarios:
                  </span>
                  {annotations.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllAnnotations}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.66rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Limpiar todas
                    </button>
                  )}
                </div>

                {annotations.length === 0 ? (
                  <div className="annotation-empty-box">
                    <MapPin size={22} color="var(--accent-gold)" style={{ marginBottom: '2px' }} />
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#ffffff' }}>
                      {baseImageDataUrl ? 'Haz clic en la imagen para señalar áreas' : 'Carga una imagen base primero'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                      Coloca pines o dibuja áreas sobre la imagen para indicarle a la IA qué cambiar en cada punto exacto.
                    </span>
                  </div>
                ) : (
                  <div className="annotation-list">
                    {annotations.map((ann, idx) => {
                      const isActive = activeAnnotationId === ann.id;
                      const spatialDesc = getSpatialDescription(ann.x, ann.y, ann.width, ann.height);

                      return (
                        <div
                          key={ann.id}
                          className={`annotation-card ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveAnnotationId(ann.id)}
                        >
                          <div className="annotation-card-header">
                            <div className="annotation-card-title">
                              <span className="annotation-card-badge">{idx + 1}</span>
                              <span style={{ fontSize: '0.74rem' }}>
                                {ann.type === 'box' ? 'Región Delimitada' : 'Punto Marcado'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleRemoveAnnotation(ann.id, e)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                              title="Eliminar este punto"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          <span className="annotation-card-loc">
                            📍 {spatialDesc}
                          </span>

                          <textarea
                            className="annotation-card-input"
                            value={ann.comment}
                            onChange={(e) => handleUpdateAnnotationComment(ann.id, e.target.value)}
                            placeholder="Comentario: ¿Qué cambio deseas en esta área? Ej. Poner lentes de sol..."
                            disabled={isEditing}
                          />

                          {/* Quick Chips for Active Annotation */}
                          {isActive && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                              {QUICK_AREA_CHIPS.map((chip, cIdx) => (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateAnnotationComment(
                                      ann.id,
                                      ann.comment ? `${ann.comment}, ${chip}` : chip
                                    );
                                  }}
                                  style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-default)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.62rem',
                                    borderRadius: 'var(--radius-full)',
                                    padding: '2px 7px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  + {chip}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ─── 4. GENERAL INSTRUCTION & STYLE ─── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="field-label" style={{ margin: 0 }}>
                    Instrucción General / Ambiente (Opcional):
                  </span>
                  <button
                    type="button"
                    onClick={handleMagicEnhanceEdit}
                    disabled={isEnhancingEdit || (!editInstruction.trim() && annotations.length === 0)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: (editInstruction.trim() || annotations.length > 0) ? 'var(--accent-gold-text)' : 'var(--text-muted)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: (editInstruction.trim() || annotations.length > 0) ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Optimizar instrucciones con Gemini"
                  >
                    <Wand2 size={12} className={isEnhancingEdit ? 'ui-icon-spin' : ''} />
                    {isEnhancingEdit ? 'Optimizando...' : 'Magic Prompt'}
                  </button>
                </div>

                <textarea
                  className="lightbox-edit-textarea"
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder="Ej: Mantener coherencia fotorrealista 4K, ajustar la iluminación global para que coincida..."
                  disabled={isEditing}
                  style={{ minHeight: '60px' }}
                />
              </div>

              {/* Quick General Suggestion Chips */}
              <div>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Ideas Rápidas Generales:
                </span>
                <div className="edit-chips-scroll">
                  {GENERAL_EDIT_SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      className="edit-suggestion-chip"
                      onClick={() => setEditInstruction(sug.prompt)}
                      disabled={isEditing}
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="edit-action-bar" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                <Button
                  variant="gold"
                  size="md"
                  onClick={handleExecuteEdit}
                  disabled={isEditing || isUpscaling || !baseImageDataUrl || (!editInstruction.trim() && !annotations.some((a) => a.comment?.trim()) && !styleReferenceBase64)}
                  loading={isEditing}
                  icon={isEditing ? RefreshCw : Sparkles}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isEditing
                    ? `Generando ${editBatchCount} ${editBatchCount === 1 ? 'Versión' : 'Versiones'} con IA...`
                    : `✨ Generar ${editBatchCount} ${editBatchCount === 1 ? 'Versión Editada' : 'Versiones Editadas'}`}
                </Button>

                {!isScratchMode && onLoadToStudio && (
                  <Button
                    variant="outline"
                    onClick={() => onLoadToStudio(image)}
                    icon={ExternalLink}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    📥 Cargar en Estudio (Prompt Dock)
                  </Button>
                )}

                {!isScratchMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('inspect')}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Volver a Inspección
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
