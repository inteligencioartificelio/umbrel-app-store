import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  Settings,
  ShieldCheck,
  Sparkles,
  Wand2,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  createStylePreset,
  updateStylePreset,
  deleteStylePreset,
  MAX_STYLE_REFERENCE_IMAGES
} from '../services/database.js';
import { analyzeStyleFromImages } from '../services/googleAiApi.js';
import Dialog from './ui/Dialog';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Card from './ui/Card';

const CATEGORIES = ['Cinematográfico', 'Cyberpunk', 'Anime', 'Fotorrealista', '3D Render', 'Personalizados'];

export default function StyleAdminModal({
  isOpen,
  onClose,
  apiKey,
  presets = [],
  onRefreshPresets
}) {
  const [editingPreset, setEditingPreset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cinematográfico',
    description: '',
    stylePrompt: '',
    negativeStylePrompt: '',
    coverImageUrl: '',
    referenceImages: [],
    isActive: true,
    isPublic: true
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [analyzingStyle, setAnalyzingStyle] = useState(false);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingPreset(null);
    setFormData({
      name: '',
      category: 'Cinematográfico',
      description: '',
      stylePrompt: '',
      negativeStylePrompt: '',
      coverImageUrl: '',
      referenceImages: [],
      isActive: true,
      isPublic: true
    });
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleStartEdit = (preset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name || '',
      category: preset.category || 'Cinematográfico',
      description: preset.description || '',
      stylePrompt: preset.stylePrompt || '',
      negativeStylePrompt: preset.negativeStylePrompt || '',
      coverImageUrl: preset.coverImageUrl || '',
      referenceImages: (preset.referenceImages || []).slice(0, MAX_STYLE_REFERENCE_IMAGES),
      isActive: preset.isActive !== undefined ? preset.isActive : true,
      isPublic: preset.isPublic !== undefined ? preset.isPublic : true
    });
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (editingPreset) {
        await updateStylePreset(editingPreset.id, formData);
      } else {
        await createStylePreset(formData);
      }
      onRefreshPresets();
      handleStartCreate();
      setSuccessMsg('¡Estilo guardado exitosamente!');
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el estilo predefinido.');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar el estilo "${name}"?`)) {
      try {
        await deleteStylePreset(id);
        onRefreshPresets();
        if (editingPreset?.id === id) {
          handleStartCreate();
        }
      } catch {
        setErrorMsg('Error al eliminar el estilo.');
      }
    }
  };

  const handleAddReferenceFile = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (formData.referenceImages.length >= MAX_STYLE_REFERENCE_IMAGES) {
      setErrorMsg(`Máximo ${MAX_STYLE_REFERENCE_IMAGES} fotos de referencia por estilo.`);
      return;
    }

    const availableSlots = MAX_STYLE_REFERENCE_IMAGES - formData.referenceImages.length;
    const filesToUpload = files.slice(0, availableSlots);

    filesToUpload.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Por favor selecciona únicamente archivos de imagen válidos.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newRef = {
          id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: event.target.result,
          mimeType: file.type,
          order: formData.referenceImages.length + 1,
          altText: file.name
        };
        setFormData((prev) => {
          if (prev.referenceImages.length >= MAX_STYLE_REFERENCE_IMAGES) return prev;
          const updatedRefs = [...prev.referenceImages, newRef];
          return {
            ...prev,
            referenceImages: updatedRefs,
            coverImageUrl: prev.coverImageUrl || newRef.url
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveReference = (refId) => {
    setFormData((prev) => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((r) => r.id !== refId)
    }));
  };

  const handleAnalyzeStyleAI = async () => {
    if (!formData.referenceImages || formData.referenceImages.length === 0) {
      setErrorMsg('Sube primero al menos 1 imagen de referencia para que la IA la pueda analizar.');
      return;
    }

    if (!apiKey || !apiKey.trim()) {
      setErrorMsg('Se requiere una API Key configurada para usar el analizador de estilo.');
      return;
    }

    setAnalyzingStyle(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await analyzeStyleFromImages(apiKey, formData.referenceImages);
      setFormData((prev) => ({
        ...prev,
        stylePrompt: result.stylePrompt || prev.stylePrompt,
        negativeStylePrompt: result.negativeStylePrompt || prev.negativeStylePrompt,
        description: result.description || prev.description || ''
      }));
      setSuccessMsg('¡Estilo analizado y redactado automáticamente con visión artificial!');
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo analizar el estilo.');
    } finally {
      setAnalyzingStyle(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Editor de Estilos Visuales"
      description="Crea, edita y analiza presets multimodales con visión artificial de Gemini"
      maxWidth="860px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Badge variant="sky" icon={ShieldCheck}>
          Regla Multimodal API: Máximo {MAX_STYLE_REFERENCE_IMAGES} imágenes por estilo.
        </Badge>

        <div style={{ display: 'flex', gap: '16px', minHeight: '480px' }}>
          {/* Left Presets List */}
          <div style={{ width: '220px', background: 'var(--secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            <Button
              variant="gold"
              size="sm"
              onClick={handleStartCreate}
              icon={Plus}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Nuevo Estilo
            </Button>

            {presets.map((preset) => {
              const isSelected = editingPreset?.id === preset.id;
              return (
                <div
                  key={preset.id}
                  style={{
                    background: isSelected ? 'var(--card)' : 'transparent',
                    border: isSelected ? '1px solid var(--accent-gold-border)' : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleStartEdit(preset)}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--foreground)', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {preset.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: preset.isActive ? '#10b981' : '#ef4444' }}>
                      {preset.isActive ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>

                  {preset.createdBy !== 'system' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(preset.id, preset.name);
                      }}
                      className="icon-btn"
                      style={{ width: '22px', height: '22px', color: '#ef4444' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Form Editor */}
          <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
            {errorMsg && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.78rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.78rem', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} /> {successMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                  Nombre del Estilo *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej. Vintage 35mm"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: '100%', height: '34px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--foreground)', fontSize: '0.78rem', padding: '0 8px' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reference Images + AI Vision Analyzer */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
                  Fotos de Referencia ({formData.referenceImages.length}/{MAX_STYLE_REFERENCE_IMAGES})
                </span>

                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleAnalyzeStyleAI}
                  loading={analyzingStyle}
                  disabled={formData.referenceImages.length === 0}
                  icon={Wand2}
                >
                  Analizar Estilo con IA
                </Button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {formData.referenceImages.map((ref) => (
                  <div key={ref.id} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={ref.url} alt="Ref" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveReference(ref.id)}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {formData.referenceImages.length < MAX_STYLE_REFERENCE_IMAGES && (
                  <label style={{ width: '64px', height: '64px', borderRadius: '8px', border: '1px dashed var(--accent-gold-border)', background: 'var(--accent-gold-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '2px' }}>
                    <input type="file" accept="image/*" multiple onChange={handleAddReferenceFile} style={{ display: 'none' }} />
                    <Upload size={14} color="var(--accent-gold-light)" />
                    <span style={{ fontSize: '0.6rem', color: 'var(--accent-gold-light)', fontWeight: 600 }}>+ Ref</span>
                  </label>
                )}
              </div>
            </div>

            {/* Prompt de Estilo */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                Prompt de Estilo (Instrucciones Técnicas) *
              </label>
              <textarea
                value={formData.stylePrompt}
                onChange={(e) => setFormData({ ...formData, stylePrompt: e.target.value })}
                placeholder="Instrucciones visuales..."
                rows={3}
                required
                style={{ width: '100%', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--foreground)', fontSize: '0.78rem', padding: '8px', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Exclusiones */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>
                Exclusiones del Estilo (Negative Prompt)
              </label>
              <input
                type="text"
                value={formData.negativeStylePrompt}
                onChange={(e) => setFormData({ ...formData, negativeStylePrompt: e.target.value })}
                placeholder="ej. flat lighting, oversaturated..."
                style={{ width: '100%', height: '34px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--foreground)', fontSize: '0.78rem', padding: '0 8px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
              <Button type="button" variant="outline" onClick={handleStartCreate}>
                Cancelar
              </Button>
              <Button type="submit" variant="gold">
                {editingPreset ? 'Actualizar Estilo' : 'Crear Estilo'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
