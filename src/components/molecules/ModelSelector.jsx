import React from 'react';
import { Sparkles, Zap, Rocket, Wrench } from 'lucide-react';

const MODELS = [
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    tag: '👑 4K Studio',
    desc: 'Máxima fidelidad fotorrealista y razonamiento visual 4K',
    icon: Sparkles,
    color: 'var(--accent-gold)'
  },
  {
    id: 'nano-banana-2',
    name: 'Nano Banana 2',
    tag: '⚡ Rápido',
    desc: 'Equilibrio perfecto entre velocidad y alta resolución',
    icon: Zap,
    color: 'var(--accent-sky)'
  },
  {
    id: 'nano-banana-2-lite',
    name: 'Nano Banana 2 Lite',
    tag: '🚀 Ultra Fast',
    desc: 'Generación ligera instantánea de baja latencia',
    icon: Rocket,
    color: 'var(--accent-emerald)'
  },
  {
    id: 'custom',
    name: 'ID Personalizado',
    tag: '🔧 Manual',
    desc: 'Especificar endpoint o modelo experimental de Google AI',
    icon: Wrench,
    color: 'var(--text-muted)'
  }
];

export default function ModelSelector({
  selectedModel,
  customModelId,
  onChangeModel,
  onChangeCustomModel
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="model-grid">
        {MODELS.map((m) => {
          const isActive = selectedModel === m.id;
          const Icon = m.icon;

          return (
            <div
              key={m.id}
              className={`model-card-item ${isActive ? 'active' : ''}`}
              onClick={() => onChangeModel(m.id)}
              role="button"
              tabIndex={0}
              aria-label={`Seleccionar modelo ${m.name}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon size={14} color={isActive ? 'var(--accent-gold)' : m.color} />
                  <span className="model-card-title">{m.name}</span>
                </div>
                <span className="model-card-tag">{m.tag}</span>
              </div>
              <span className="model-card-desc" style={{ fontSize: '0.64rem', color: 'var(--text-muted)', lineHeight: '1.25', display: 'block' }}>
                {m.desc}
              </span>
            </div>
          );
        })}
      </div>

      {selectedModel === 'custom' && (
        <div style={{ marginTop: '6px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
          <span className="field-label" style={{ marginBottom: '4px' }}>ID del Modelo Manual:</span>
          <input
            type="text"
            className="ui-input"
            value={customModelId || ''}
            onChange={(e) => onChangeCustomModel(e.target.value)}
            placeholder="ej. gemini-3-pro-image-preview"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
          />
        </div>
      )}
    </div>
  );
}
