import React from 'react';
import { Layers, FileCode, Printer } from 'lucide-react';

const RESOLUTIONS = [
  { id: '4096x4096', label: '4K Ultra', sub: '4096px', gold: true },
  { id: '2048x2048', label: '2K HD', sub: '2048px', gold: false },
  { id: '1024x1024', label: '1K Standard', sub: '1024px', gold: false }
];

const FORMATS = [
  { id: 'image/png', label: 'PNG', sub: 'Sin pérdida' },
  { id: 'image/jpeg', label: 'JPEG', sub: 'Comprimido' },
  { id: 'image/webp', label: 'WEBP', sub: 'Web ultra' }
];

const DPIS = [
  { id: 300, label: '300 DPI', sub: 'Editorial / Imprenta' },
  { id: 150, label: '150 DPI', sub: 'Media calidad' },
  { id: 72, label: '72 DPI', sub: 'Pantalla Web' }
];

export default function ResolutionBar({
  resolution = '4096x4096',
  outputFormat = 'image/png',
  dpi = 300,
  onChangeResolution,
  onChangeFormat,
  onChangeDpi
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Resolution */}
      <div>
        <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Layers size={13} color="var(--accent-gold)" />
          <span>Resolución Nativa</span>
        </div>
        <div className="segmented-bar">
          {RESOLUTIONS.map((r) => {
            const isActive = resolution === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={`segmented-bar-btn ${isActive ? 'active' : ''} ${isActive && r.gold ? 'gold' : ''}`}
                onClick={() => onChangeResolution(r.id)}
                title={`Resolución ${r.label} (${r.sub})`}
              >
                <span style={{ fontWeight: 700 }}>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format */}
      <div>
        <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FileCode size={13} color="var(--accent-gold)" />
          <span>Formato de Salida</span>
        </div>
        <div className="segmented-bar">
          {FORMATS.map((f) => {
            const isActive = outputFormat === f.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`segmented-bar-btn ${isActive ? 'active' : ''}`}
                onClick={() => onChangeFormat(f.id)}
                title={`${f.label} - ${f.sub}`}
              >
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DPI */}
      <div>
        <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Printer size={13} color="var(--accent-gold)" />
          <span>Densidad Imprenta</span>
        </div>
        <div className="segmented-bar">
          {DPIS.map((d) => {
            const isActive = dpi === d.id;
            return (
              <button
                key={d.id}
                type="button"
                className={`segmented-bar-btn ${isActive ? 'active' : ''}`}
                onClick={() => onChangeDpi(d.id)}
                title={`${d.label} - ${d.sub}`}
              >
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
