import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Download,
  Star,
  Trash2,
  Archive,
  ArchiveRestore,
  CheckSquare,
  Square,
  Check,
  X,
  Layers,
  FolderArchive,
  Rocket
} from 'lucide-react';
import CyberSkeleton from '../molecules/CyberSkeleton';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

const INSPIRATIONS = [
  'Retrato cinematográfico de un samurai cibernético bajo la lluvia en Neo Tokio, luz volumétrica dorada 35mm',
  'Templo futurista de cristal y titanio sobre un acantilado al atardecer, arquitectura paramétrica 8K',
  'Zorro místico con nueve colas de fuego azul en un bosque encantado de cerezos, 3D Unreal Engine 5 Octane',
  'Astronauta explorando una cueva con cristales luminiscentes en Marte, fotografía editorial National Geographic'
];

const PAGE_SIZE = 24;

/**
 * Highly optimized, memoized card component.
 * Skips re-renders when other images are selected, favorited, or when prompt input changes.
 */
const StudioCard = React.memo(function StudioCard({
  img,
  isSelected,
  isSelectionMode,
  onSelectImage,
  onToggleSelect,
  onToggleFavorite,
  onDownload
}) {
  const isFav = Boolean(img.favorite);
  const promptText = img.config?.prompt || 'Nano Banana Generation';
  const resTag = img.config?.imageSize || '4K';
  // Use lightweight thumbnail (20-40KB) if available, falling back to dataUrl
  const imageSource = img.thumbnailUrl || img.dataUrl;

  return (
    <div
      className={`studio-card ${isSelected ? 'is-selected' : ''}`}
      onClick={(e) => {
        if (isSelectionMode) {
          onToggleSelect(img.id, e);
        } else {
          onSelectImage(img);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ver imagen: ${promptText}`}
    >
      <img
        src={imageSource}
        alt={promptText}
        loading="lazy"
        decoding="async"
      />

      {/* Top-Left Selection Checkbox Button */}
      <button
        type="button"
        className={`card-select-btn ${isSelected ? 'selected' : ''}`}
        onClick={(e) => onToggleSelect(img.id, e)}
        title={isSelected ? 'Deseleccionar imagen' : 'Seleccionar imagen'}
      >
        <Check size={14} strokeWidth={3.5} />
      </button>

      <div className="studio-card-overlay">
        {/* Top Bar: Resolution & Favorite Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '32px' }}>
          <span
            style={{
              background: 'rgba(0,0,0,0.75)',
              color: 'var(--accent-gold)',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--accent-gold-border)'
            }}
          >
            {resTag}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(img.id);
            }}
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: isFav ? 'var(--accent-gold)' : '#ffffff',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
            title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <Star size={14} fill={isFav ? 'var(--accent-gold)' : 'none'} />
          </button>
        </div>

        {/* Bottom Bar: Prompt text & Download CTA */}
        <div>
          <p
            style={{
              fontSize: '0.72rem',
              color: '#ffffff',
              lineHeight: '1.35',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: '8px',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)'
            }}
          >
            {promptText}
          </p>

          <Button
            variant="gold"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(img);
            }}
            icon={Download}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Descargar
          </Button>
        </div>
      </div>
    </div>
  );
});

export default function StudioGallery({
  images = [],
  generating = false,
  batchCount = 1,
  onSelectImage,
  onDownload,
  onToggleFavorite,
  onSelectSamplePrompt,
  onOpenEditorModal,
  onBulkDelete,
  onBulkArchive,
  onBulkDownload,
  onBulkUpscale
}) {
  const [filterTab, setFilterTab] = useState('active'); // 'active' | 'archived' | 'favorites' | 'all'
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  const skeletonCount = generating ? Math.max(1, Math.min(4, batchCount)) : 0;

  // Reset pagination on filter tab changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterTab]);

  // Counts
  const activeCount = useMemo(() => images.filter((i) => !i.archived).length, [images]);
  const archivedCount = useMemo(() => images.filter((i) => Boolean(i.archived)).length, [images]);
  const favCount = useMemo(() => images.filter((i) => Boolean(i.favorite)).length, [images]);
  const totalCount = images.length;

  // Filtered Images List
  const displayedImages = useMemo(() => {
    switch (filterTab) {
      case 'archived':
        return images.filter((i) => Boolean(i.archived));
      case 'favorites':
        return images.filter((i) => Boolean(i.favorite));
      case 'all':
        return images;
      case 'active':
      default:
        return images.filter((i) => !i.archived);
    }
  }, [images, filterTab]);

  // Slice displayed images for progressive rendering to prevent DOM bloat
  const visibleImages = useMemo(() => {
    return displayedImages.slice(0, visibleCount);
  }, [displayedImages, visibleCount]);

  // Intersection Observer for smooth infinite scrolling
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, displayedImages.length));
        }
      },
      { rootMargin: '350px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [displayedImages.length, visibleCount]);

  // Batch Selection Helpers
  const isSelectionMode = selectedIds.length > 0;

  const toggleSelect = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(displayedImages.map((img) => img.id));
  }, [displayedImages]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleExecuteBulkArchive = async (archive = true) => {
    if (selectedIds.length === 0 || !onBulkArchive) return;
    await onBulkArchive(selectedIds, archive);
    setSelectedIds([]);
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0 || !onBulkDelete) return;
    const count = selectedIds.length;
    const confirmMsg = count === 1
      ? '¿Estás seguro de que deseas eliminar permanentemente esta imagen?'
      : `¿Estás seguro de que deseas eliminar permanentemente las ${count} imágenes seleccionadas?`;

    if (window.confirm(confirmMsg)) {
      await onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleExecuteBulkDownload = () => {
    if (selectedIds.length === 0 || !onBulkDownload) return;
    onBulkDownload(selectedIds);
  };

  return (
    <div className="studio-gallery-scroll">
      {/* ─── GALLERY TOOLBAR & FILTER TABS ─── */}
      {images.length > 0 && (
        <div className="gallery-toolbar-bar">
          <div className="gallery-filter-tabs">
            <button
              type="button"
              className={`gallery-filter-pill ${filterTab === 'active' ? 'active' : ''}`}
              onClick={() => {
                setFilterTab('active');
                setSelectedIds([]);
              }}
            >
              <Sparkles size={12} />
              <span>Activas ({activeCount})</span>
            </button>

            <button
              type="button"
              className={`gallery-filter-pill ${filterTab === 'favorites' ? 'active' : ''}`}
              onClick={() => {
                setFilterTab('favorites');
                setSelectedIds([]);
              }}
            >
              <Star size={12} />
              <span>Favoritas ({favCount})</span>
            </button>

            <button
              type="button"
              className={`gallery-filter-pill ${filterTab === 'archived' ? 'active' : ''}`}
              onClick={() => {
                setFilterTab('archived');
                setSelectedIds([]);
              }}
            >
              <FolderArchive size={12} />
              <span>Archivadas ({archivedCount})</span>
            </button>

            <button
              type="button"
              className={`gallery-filter-pill ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFilterTab('all');
                setSelectedIds([]);
              }}
            >
              <Layers size={12} />
              <span>Todas ({totalCount})</span>
            </button>
          </div>

          {/* Multi-Select Toggle Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {displayedImages.length > 0 && (
              <button
                type="button"
                className={`batch-btn ${isSelectionMode ? 'batch-btn-gold' : ''}`}
                onClick={() => {
                  if (isSelectionMode) {
                    deselectAll();
                  } else {
                    selectAll();
                  }
                }}
              >
                {isSelectionMode ? <CheckSquare size={13} /> : <Square size={13} />}
                <span>
                  {isSelectionMode
                    ? `Deseleccionar (${selectedIds.length})`
                    : 'Seleccionar Lote'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── EMPTY STATE HERO ─── */}
      {images.length === 0 && !generating && (
        <div className="studio-empty-hero">
          <div className="studio-hero-icon">
            <Sparkles size={30} />
          </div>

          <div>
            <h2 className="studio-hero-title">
              Crea Arte Fotorrealista 4K con Nano Banana
            </h2>
            <p className="studio-hero-subtitle">
              Configura tu modelo, selecciona un estilo artístico multimodal y escribe tu idea en el dock flotante, o edita imágenes existentes con IA.
            </p>
          </div>

          {onOpenEditorModal && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <Button
                variant="gold"
                size="md"
                onClick={onOpenEditorModal}
                icon={Sparkles}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                ✨ Abrir Modo Edición de Imagen
              </Button>
            </div>
          )}

          <div style={{ width: '100%' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
              💡 Prompts de Inspiración de Estudio:
            </span>

            <div className="inspiration-pills-wrap">
              {INSPIRATIONS.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="inspiration-pill"
                  onClick={() => onSelectSamplePrompt(text)}
                >
                  ✨ {text.slice(0, 52)}...
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── FILTER EMPTY STATE (e.g. No archived or no favorites) ─── */}
      {images.length > 0 && displayedImages.length === 0 && !generating && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <FolderArchive size={36} color="var(--accent-gold)" style={{ marginBottom: '10px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            No hay imágenes en la sección "{filterTab === 'archived' ? 'Archivadas' : filterTab === 'favorites' ? 'Favoritas' : 'Activas'}"
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {filterTab === 'archived'
              ? 'Puedes archivar imágenes desde la vista principal seleccionándolas en lote.'
              : 'Marca imágenes con la estrella dorada para verlas aquí.'}
          </p>
        </div>
      )}

      {/* ─── STUDIO IMAGE GRID & SKELETON LOADERS ─── */}
      {(displayedImages.length > 0 || generating) && (
        <div className={`studio-grid ${isSelectionMode ? 'is-batch-active' : ''}`}>
          {/* Cyber Skeleton Loading Cards */}
          {generating &&
            Array.from({ length: skeletonCount }).map((_, idx) => (
              <CyberSkeleton key={`loading_${idx}`} variantIndex={idx} />
            ))}

          {/* Generated Image Cards with Progressive Rendering & Memoization */}
          {visibleImages.map((img) => (
            <StudioCard
              key={img.id}
              img={img}
              isSelected={selectedIds.includes(img.id)}
              isSelectionMode={isSelectionMode}
              onSelectImage={onSelectImage}
              onToggleSelect={toggleSelect}
              onToggleFavorite={onToggleFavorite}
              onDownload={onDownload}
            />
          ))}

          {/* Infinite Scroll Sentinel / Progressive Loader */}
          {displayedImages.length > visibleCount && (
            <div
              ref={sentinelRef}
              style={{
                gridColumn: '1 / -1',
                padding: '24px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <button
                type="button"
                className="batch-btn"
                onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, displayedImages.length))}
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--accent-gold-text)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-card)'
                }}
              >
                ⚡ Mostrando {visibleImages.length} de {displayedImages.length} imágenes • Cargar más
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── FLOATING BOTTOM BATCH ACTION BAR ─── */}
      {isSelectionMode && (
        <div className="floating-batch-bar">
          <Badge variant="gold" style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
            ✓ {selectedIds.length} {selectedIds.length === 1 ? 'seleccionada' : 'seleccionadas'}
          </Badge>

          {/* Select / Deselect All */}
          {selectedIds.length < displayedImages.length ? (
            <button type="button" className="batch-btn" onClick={selectAll}>
              Seleccionar Todas ({displayedImages.length})
            </button>
          ) : (
            <button type="button" className="batch-btn" onClick={deselectAll}>
              Deseleccionar
            </button>
          )}

          {/* Archive / Restore Button */}
          {filterTab === 'archived' ? (
            <button
              type="button"
              className="batch-btn"
              onClick={() => handleExecuteBulkArchive(false)}
              title="Restaurar a la galería principal de activas"
            >
              <ArchiveRestore size={13} color="var(--accent-gold)" />
              <span>Desarchivar ({selectedIds.length})</span>
            </button>
          ) : (
            <button
              type="button"
              className="batch-btn"
              onClick={() => handleExecuteBulkArchive(true)}
              title="Mover a la sección de Archivadas"
            >
              <Archive size={13} color="var(--accent-gold)" />
              <span>Archivar ({selectedIds.length})</span>
            </button>
          )}

          {/* Bulk Upscale to 4K */}
          {onBulkUpscale && (
            <button
              type="button"
              className="batch-btn batch-btn-gold"
              onClick={() => {
                onBulkUpscale(selectedIds, '4K');
                setSelectedIds([]);
              }}
              title="Reescalar todas las imágenes seleccionadas a 4K Ultra HD"
            >
              <Rocket size={13} />
              <span>Reescalar a 4K ({selectedIds.length})</span>
            </button>
          )}

          {/* Bulk Download */}
          {onBulkDownload && (
            <button
              type="button"
              className="batch-btn"
              onClick={handleExecuteBulkDownload}
              title="Descargar las imágenes seleccionadas"
            >
              <Download size={13} />
              <span>Descargar ({selectedIds.length})</span>
            </button>
          )}

          {/* Bulk Delete */}
          {onBulkDelete && (
            <button
              type="button"
              className="batch-btn batch-btn-danger"
              onClick={handleExecuteBulkDelete}
              title="Eliminar permanentemente de la base de datos"
            >
              <Trash2 size={13} />
              <span>Eliminar ({selectedIds.length})</span>
            </button>
          )}

          {/* Cancel Selection */}
          <button
            type="button"
            className="batch-btn"
            onClick={deselectAll}
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={13} /> Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
