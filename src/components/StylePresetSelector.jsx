import React from 'react';
import { Palette, Info, Settings, Check } from 'lucide-react';

export default function StylePresetSelector({
  presets = [],
  selectedPresetId = 'none',
  onSelectPreset,
  intensity = 'moderate',
  onChangeIntensity,
  onOpenDetailModal,
  onOpenAdminModal
}) {
  return (
    <div className="sidebar-group">
      <div className="section-label">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Palette size={13} color="var(--accent-gold-light)" /> Estilos Visuales
        </span>
        <button
          type="button"
          onClick={onOpenAdminModal}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.7rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}
          title="Administrar / Crear Estilos"
        >
          <Settings size={12} /> Admin
        </button>
      </div>

      {/* Preset Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          maxHeight: '220px',
          overflowY: 'auto',
          paddingRight: '2px'
        }}
      >
        {/* Default 'Sin estilo' option */}
        <div
          className={`model-pill-card ${selectedPresetId === 'none' ? 'active' : ''}`}
          onClick={() => onSelectPreset(null)}
          style={{
            padding: '8px 10px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            gridColumn: 'span 2'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>🚫 Sin estilo</span>
            {selectedPresetId === 'none' && <Check size={14} color="var(--accent-gold)" />}
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Generar directamente usando solo el prompt</span>
        </div>

        {/* Studio & Custom Presets */}
        {presets.map((preset) => {
          const isActive = selectedPresetId === preset.id;
          return (
            <div
              key={preset.id}
              className={`model-pill-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPreset(preset)}
              style={{
                padding: '8px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '6px',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '54px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: '#000',
                  position: 'relative'
                }}
              >
                <img
                  src={preset.coverImageUrl}
                  alt={preset.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetailModal(preset);
                  }}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.7)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Ver detalles del estilo"
                >
                  <Info size={11} />
                </button>
              </div>

              <div style={{ width: '100%' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isActive ? 'var(--accent-gold-light)' : '#fff',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {preset.name}
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: '1.2'
                  }}
                >
                  {preset.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intensity Selector Bar (Sutil | Moderado | Intenso) */}
      {selectedPresetId !== 'none' && (
        <div style={{ marginTop: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Intensidad del Estilo:
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--accent-gold-light)', fontWeight: 700 }}>
              {intensity === 'subtle' ? 'Sutil' : intensity === 'intense' ? 'Intenso' : 'Moderado'}
            </span>
          </div>

          <div className="res-segmented-bar">
            {[
              { id: 'subtle', label: 'Sutil' },
              { id: 'moderate', label: 'Moderado' },
              { id: 'intense', label: 'Intenso' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`res-pill ${intensity === opt.id ? 'active' : ''}`}
                onClick={() => onChangeIntensity(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
