import React, { useState } from 'react';
import {
  Palette,
  Search,
  Plus,
  Info,
  Check,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { MAX_STYLE_REFERENCE_IMAGES } from '../services/database';
import Dialog from './ui/Dialog';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Input from './ui/Input';
import Card from './ui/Card';

const CATEGORIES = ['Todos', 'Cinematográfico', 'Cyberpunk', 'Anime', 'Fotorrealista', '3D Render', 'Personalizados'];

export default function StyleExplorerModal({
  isOpen,
  onClose,
  presets = [],
  selectedPresetId = 'none',
  onSelectPreset,
  onOpenDetailModal,
  onOpenAdminModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  if (!isOpen) return null;

  const filteredPresets = presets.filter((preset) => {
    const matchesSearch =
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.stylePrompt.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'Todos' ||
      (selectedCategory === 'Personalizados' ? preset.createdBy !== 'system' : preset.category === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Explorador de Estilos Visuales"
      description="Presets multimodales de color, iluminación y textura para Nano Banana"
      maxWidth="880px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Top Actions & Info Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <Badge variant="sky" icon={ShieldCheck}>
            Límite API: Máx {MAX_STYLE_REFERENCE_IMAGES} fotos de estilo por preset (+1 sujeto en prompt = 3 máx)
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onOpenAdminModal();
            }}
            icon={Plus}
          >
            Crear / Administrar Estilos
          </Button>
        </div>

        {/* Search & Category Filter Bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar estilo por nombre o concepto..."
              icon={Search}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* None / Reset Option */}
        <Card
          hover
          onClick={() => {
            onSelectPreset(null);
            onClose();
          }}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderColor: selectedPresetId === 'none' || !selectedPresetId ? 'var(--accent-gold-border)' : undefined,
            backgroundColor: selectedPresetId === 'none' || !selectedPresetId ? 'var(--accent-gold-soft)' : undefined
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
              <Palette size={16} />
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>
                Sin Estilo Predefinido
              </span>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                Genera imágenes directamente a partir de tu prompt de texto sin modificaciones de estilo
              </p>
            </div>
          </div>
          {(selectedPresetId === 'none' || !selectedPresetId) && (
            <Badge variant="gold" icon={Check}>Activo</Badge>
          )}
        </Card>

        {/* Presets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px', maxHeight: '50vh', overflowY: 'auto', padding: '2px' }}>
          {filteredPresets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <Card
                key={preset.id}
                hover
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  borderColor: isSelected ? 'var(--accent-gold-border)' : undefined,
                  backgroundColor: isSelected ? 'var(--accent-gold-soft)' : undefined
                }}
              >
                {/* Preset Header / Cover */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? 'var(--accent-gold-light)' : 'var(--foreground)', display: 'block' }}>
                      {preset.name}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>
                      {preset.category}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isSelected && <Badge variant="gold"><Check size={10} /></Badge>}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetailModal(preset);
                      }}
                      className="icon-btn"
                      style={{ width: '24px', height: '24px' }}
                      title="Ver detalles técnicos del preset"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                </div>

                {/* Preset Description */}
                <p style={{ fontSize: '0.74rem', color: 'var(--muted-foreground)', padding: '0 14px 12px', margin: 0, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {preset.description || preset.stylePrompt}
                </p>

                {/* Footer Badges */}
                <div style={{ marginTop: 'auto', padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                    {preset.referenceImages?.length || 0} ref(s)
                  </span>
                  <span style={{ fontSize: '0.68rem', color: isSelected ? 'var(--accent-gold-light)' : 'var(--muted-foreground)', fontWeight: 700 }}>
                    {isSelected ? 'Seleccionado' : 'Seleccionar →'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
