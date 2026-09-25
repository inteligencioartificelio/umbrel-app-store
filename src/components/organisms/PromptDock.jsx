import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Palette,
  Paperclip,
  X,
  ChevronDown,
  Globe
} from 'lucide-react';
import { enhancePrompt } from '../../services/googleAiApi';
import Button from '../ui/Button';

const BATCH_VARIANTS = [1, 2, 3, 4];

export default function PromptDock({
  apiKey,
  prompt,
  onChangePrompt,
  selectedStylePreset,
  styleIntensity = 'moderate',
  onChangeIntensity,
  onOpenStyleExplorer,
  onOpenEditorModal,
  referenceImageBase64,
  onChangeReferenceImage,
  enableGrounding = true,
  onChangeGrounding,
  batchCount,
  onChangeBatchCount,
  onGenerate,
  generating
}) {
  const [enhancing, setEnhancing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [toastNotice, setToastNotice] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 24), 160)}px`;
    }
  }, [prompt]);

  const handleMagicEnhance = async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);

    try {
      const styleName = selectedStylePreset?.name || '';
      const enhanced = await enhancePrompt(apiKey, prompt, styleName);
      onChangePrompt(enhanced);
    } catch (err) {
      alert(err.message || 'No se pudo expandir el prompt.');
    } finally {
      setEnhancing(false);
    }
  };

  const subjectList = Array.isArray(referenceImageBase64)
    ? referenceImageBase64
    : referenceImageBase64
    ? [referenceImageBase64]
    : [];

  const processImageFiles = (files) => {
    const validImageFiles = Array.from(files || []).filter(
      (f) => f && f.type && f.type.startsWith('image/')
    );
    if (validImageFiles.length === 0) return;

    const maxPhotos = 5;
    const remaining = maxPhotos - subjectList.length;
    if (remaining <= 0) {
      setToastNotice('⚠️ Límite alcanzado: Máximo 5 fotos de sujeto.');
      setTimeout(() => setToastNotice(null), 3000);
      return;
    }

    const filesToRead = validImageFiles.slice(0, remaining);
    let loaded = 0;
    const newItems = [];

    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newItems.push(event.target.result);
        }
        loaded++;
        if (loaded === filesToRead.length) {
          onChangeReferenceImage([...subjectList, ...newItems]);
          setToastNotice(`📷 ${newItems.length} foto(s) pegada(s) como referencia.`);
          setTimeout(() => setToastNotice(null), 3500);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubjectUpload = (e) => {
    processImageFiles(e.target.files);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      processImageFiles(imageFiles);
      const textData = e.clipboardData.getData('text');
      if (!textData || !textData.trim()) {
        e.preventDefault();
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer?.files?.length > 0) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  return (
    <div
      className={`studio-prompt-dock ${isDraggingOver ? 'dragging-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
    >
      {/* Toast Notice when image pasted */}
      {toastNotice && (
        <div
          style={{
            position: 'absolute',
            top: '-65px',
            left: '20px',
            background: 'var(--accent-gold)',
            color: '#000000',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.74rem',
            fontWeight: 800,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 10,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Top Dock Ribbon Controls */}
      <div className="dock-ribbon">
        {/* Style Trigger Button */}
        <button
          type="button"
          className={`dock-pill-btn ${selectedStylePreset?.id && selectedStylePreset.id !== 'none' ? 'active' : ''}`}
          onClick={onOpenStyleExplorer}
        >
          <Palette size={13} />
          <span>🎨 {selectedStylePreset?.name || 'Sin estilo'}</span>
          <ChevronDown size={11} />
        </button>

        {/* Style Intensity Controls if style active */}
        {selectedStylePreset && selectedStylePreset.id !== 'none' && (
          <div
            style={{
              background: 'var(--bg-glass-heavy)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              backdropFilter: 'blur(12px)'
            }}
          >
            {['subtle', 'moderate', 'intense'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onChangeIntensity(lvl)}
                style={{
                  background: styleIntensity === lvl ? 'var(--accent-gold)' : 'transparent',
                  color: styleIntensity === lvl ? '#000000' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 8px',
                  fontSize: '0.66rem',
                  fontWeight: styleIntensity === lvl ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {lvl === 'subtle' ? 'Sutil' : lvl === 'moderate' ? 'Mod' : 'Intenso'}
              </button>
            ))}
          </div>
        )}

        {/* Web Grounding Toggle */}
        <button
          type="button"
          className={`dock-pill-btn ${enableGrounding ? 'active' : ''}`}
          onClick={() => onChangeGrounding && onChangeGrounding(!enableGrounding)}
          style={{
            borderColor: enableGrounding ? 'var(--accent-sky-border)' : undefined,
            backgroundColor: enableGrounding ? 'var(--accent-sky-soft)' : undefined,
            color: enableGrounding ? 'var(--accent-sky)' : undefined
          }}
          title={enableGrounding ? 'Web Grounding ACTIVO' : 'Web Grounding INACTIVO'}
        >
          <Globe size={13} />
          <span>Web Search: {enableGrounding ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Multimodal Subject Reference Pill & Thumbnails */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
        <label
          style={{
            background: subjectList.length > 0 ? 'var(--accent-gold-soft)' : 'var(--bg-secondary)',
            border: subjectList.length > 0 ? '1px solid var(--accent-gold-border)' : '1px solid var(--border-default)',
            color: subjectList.length > 0 ? 'var(--accent-gold-text)' : 'var(--text-muted)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.74rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginBottom: '2px',
            transition: 'all var(--transition-fast)'
          }}
          title="Adjuntar o pegar (Ctrl+V) fotos de sujeto (hasta 5)"
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleSubjectUpload}
            style={{ display: 'none' }}
          />
          <Paperclip size={13} />
          {subjectList.length > 0 ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Sujeto ({subjectList.length}/5)</span>
              <X
                size={12}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChangeReferenceImage([]);
                }}
                style={{ cursor: 'pointer', color: 'var(--accent-rose)' }}
                title="Quitar fotos de sujeto"
              />
            </span>
          ) : (
            <span>+ Sujeto</span>
          )}
        </label>

        {/* AI Image Editor Modal Trigger */}
        {onOpenEditorModal && (
          <button
            type="button"
            className="dock-tool-btn"
            onClick={onOpenEditorModal}
            title="Abrir Editor de Imágenes con IA desde cero (marcar áreas, comentarios y estilo de referencia)"
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent-gold-soft)',
              border: '1px solid var(--accent-gold-border)',
              color: 'var(--accent-gold-text)',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: '2px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Sparkles size={13} color="var(--accent-gold)" />
            <span>Editor IA</span>
          </button>
        )}

        {/* Thumbnail Previews of Subject Photos in Dock */}
        {subjectList.map((imgUrl, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--accent-gold-border)',
              flexShrink: 0,
              marginBottom: '2px',
              background: 'var(--bg-card)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
          >
            <img src={imgUrl} alt={`Sujeto #${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const updated = subjectList.filter((_, i) => i !== idx);
                onChangeReferenceImage(updated);
              }}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: 'rgba(239, 68, 68, 0.9)',
                color: '#fff',
                border: 'none',
                width: '13px',
                height: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '9px'
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Main Textarea Input */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', minWidth: 0 }}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onPaste={handlePaste}
          placeholder="Describe tu idea visual... (Shift+Enter para salto de línea, Enter para generar)"
          className="dock-textarea"
          aria-label="Prompt de generación"
          onKeyDown={(e) => {
            if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && !e.shiftKey)) {
              e.preventDefault();
              if (!generating && prompt.trim()) {
                onGenerate();
              }
            }
          }}
        />

        {prompt.length > 0 && (
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '0 4px', marginBottom: '4px' }}>
            {prompt.length}
          </span>
        )}

        <button
          type="button"
          className="magic-btn"
          onClick={handleMagicEnhance}
          disabled={enhancing || !prompt.trim()}
          title="Optimizar prompt con Gemini"
          style={{ marginBottom: '2px', flexShrink: 0 }}
        >
          <Wand2 size={13} className={enhancing ? 'ui-icon-spin' : ''} />
          <span>{enhancing ? 'Optimizando...' : 'Magic'}</span>
        </button>
      </div>

      {/* Batch Variants Pills (1 - 4) */}
      <div className="batch-segmented">
        {BATCH_VARIANTS.map((n) => (
          <button
            key={n}
            type="button"
            className={`batch-pill ${batchCount === n ? 'active' : ''}`}
            onClick={() => onChangeBatchCount(n)}
            title={`Generar ${n} ${n === 1 ? 'imagen' : 'imágenes en paralelo'}`}
          >
            {n}x
          </button>
        ))}
      </div>

      {/* Main Generate Button */}
      <Button
        variant="gold"
        onClick={onGenerate}
        disabled={generating || !prompt.trim()}
        loading={generating}
        icon={Sparkles}
        style={{
          borderRadius: 'var(--radius-full)',
          padding: '0 20px',
          height: '38px',
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
          transition: 'all var(--transition-fast)'
        }}
      >
        <span>{generating ? 'Sintetizando...' : 'Generar'}</span>
      </Button>
    </div>
  );
}
