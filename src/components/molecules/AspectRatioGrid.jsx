import React from 'react';

const RATIOS = [
  { id: '16:9', label: '16:9', width: 22, height: 12, name: 'Cinema' },
  { id: '1:1', label: '1:1', width: 16, height: 16, name: 'Cuadrado' },
  { id: '9:16', label: '9:16', width: 12, height: 22, name: 'Story / Reel' },
  { id: '4:3', label: '4:3', width: 19, height: 14, name: 'Foto' },
  { id: '3:4', label: '3:4', width: 14, height: 19, name: 'Retrato' },
  { id: '21:9', label: '21:9', width: 26, height: 10, name: 'Ultrawide' }
];

export default function AspectRatioGrid({
  value = '16:9',
  onChange
}) {
  return (
    <div className="ratio-grid">
      {RATIOS.map((r) => {
        const isActive = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            className={`ratio-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(r.id)}
            aria-label={`Proporción ${r.label} - ${r.name}`}
            title={`${r.name} (${r.label})`}
          >
            <div
              className="ratio-svg-frame"
              style={{ width: `${r.width}px`, height: `${r.height}px` }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{r.label}</span>
              <span style={{ fontSize: '0.58rem', color: isActive ? 'var(--accent-gold-text)' : 'var(--text-muted)', marginTop: '2px' }}>
                {r.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
