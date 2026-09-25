import React, { useState } from 'react';
import {
  Cpu,
  ChevronDown,
  ChevronUp,
  Palette,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Globe,
  Sliders,
  Brain,
  Hash,
  Ban
} from 'lucide-react';
import ModelSelector from '../molecules/ModelSelector';
import AspectRatioGrid from '../molecules/AspectRatioGrid';
import ResolutionBar from '../molecules/ResolutionBar';
import SubjectUploader from '../molecules/SubjectUploader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

const REASONING_LEVELS = [
  { val: 1, label: '1★ Rápido', desc: 'Mínimo razonamiento' },
  { val: 2, label: '2★ Estándar', desc: 'Equilibrado' },
  { val: 3, label: '3★ Detallado', desc: 'Composición cuidada' },
  { val: 4, label: '4★ Avanzado', desc: 'Alta coherencia visual' },
  { val: 5, label: '5★ Maestro', desc: 'Máxima fidelidad fotorrealista' }
];

export default function StudioSidebar({
  config,
  onChangeConfig,
  onOpenStyleExplorerModal
}) {
  const [openSection, setOpenSection] = useState('engine');

  const toggleSection = (sec) => {
    setOpenSection(openSection === sec ? null : sec);
  };

  const currentEffort = config.effortLevel || 5;

  return (
    <aside className="studio-sidebar">
      {/* ─── SECTION 1: ENGINE & CANVAS SPECS ─── */}
      <div className={`sidebar-accordion ${openSection === 'engine' ? 'open' : ''}`}>
        <button
          type="button"
          className="sidebar-accordion-trigger"
          onClick={() => toggleSection('engine')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={15} color="var(--accent-gold)" /> Motor & Lienzo
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.66rem', color: 'var(--accent-gold-text)', fontWeight: 700 }}>
              {config.model === 'nano-banana-pro' ? 'Pro 4K' : config.model === 'nano-banana-2' ? 'Flash 4K' : 'Lite'}
            </span>
            {openSection === 'engine' ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {openSection === 'engine' && (
          <div className="sidebar-accordion-content">
            {/* Model Selector */}
            <div>
              <span className="field-label">Modelo Generativo</span>
              <ModelSelector
                selectedModel={config.model}
                customModelId={config.customModelId}
                onChangeModel={(m) => onChangeConfig({ model: m })}
                onChangeCustomModel={(id) => onChangeConfig({ customModelId: id })}
              />
            </div>

            {/* Aspect Ratio */}
            <div>
              <span className="field-label">Proporción de Aspecto</span>
              <AspectRatioGrid
                value={config.aspectRatio || '16:9'}
                onChange={(ratio) => onChangeConfig({ aspectRatio: ratio })}
              />
            </div>

            {/* Resolution, Format, DPI */}
            <ResolutionBar
              resolution={config.resolution}
              outputFormat={config.outputFormat}
              dpi={config.dpi}
              onChangeResolution={(res) => onChangeConfig({ resolution: res })}
              onChangeFormat={(fmt) => onChangeConfig({ outputFormat: fmt })}
              onChangeDpi={(dpi) => onChangeConfig({ dpi })}
            />

            {/* Effort Level (Reasoning Budget) */}
            <div>
              <div className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Brain size={13} color="var(--accent-gold)" /> Razonamiento Visual
                </span>
                <Badge variant="gold">{currentEffort} / 5 ★</Badge>
              </div>

              {/* Step Pills for Effort Level */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                {REASONING_LEVELS.map((lvl) => (
                  <button
                    key={lvl.val}
                    type="button"
                    className={`segmented-bar-btn ${currentEffort === lvl.val ? 'active gold' : ''}`}
                    onClick={() => onChangeConfig({ effortLevel: lvl.val })}
                    style={{ flex: 1, padding: '5px 2px', fontSize: '0.64rem', fontWeight: 700 }}
                    title={`${lvl.label} - ${lvl.desc}`}
                  >
                    {lvl.val}★
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px', textAlign: 'center' }}>
                {REASONING_LEVELS.find((l) => l.val === currentEffort)?.desc}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── SECTION 2: VISUAL STYLES ─── */}
      <div className={`sidebar-accordion ${openSection === 'style' ? 'open' : ''}`}>
        <button
          type="button"
          className="sidebar-accordion-trigger"
          onClick={() => toggleSection('style')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={15} color="var(--accent-gold)" /> Estilos Visuales
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.66rem', color: config.selectedStylePreset?.id ? 'var(--accent-gold-text)' : 'var(--text-muted)', fontWeight: 700 }}>
              {config.selectedStylePreset?.name || 'Ninguno'}
            </span>
            {openSection === 'style' ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {openSection === 'style' && (
          <div className="sidebar-accordion-content">
            <Card
              hover
              onClick={onOpenStyleExplorerModal}
              style={{
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderColor: config.selectedStylePreset?.id ? 'var(--accent-gold-border)' : 'var(--border-default)',
                backgroundColor: config.selectedStylePreset?.id ? 'var(--accent-gold-soft)' : 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
                  <Palette size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                    {config.selectedStylePreset?.name || 'Explorar Estilos Visuales...'}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {config.selectedStylePreset?.category || 'Haz clic para seleccionar o crear un estilo'}
                  </span>
                </div>
              </div>
              <Sparkles size={15} color="var(--accent-gold)" />
            </Card>

            <Badge variant="sky" icon={ShieldCheck}>
              Gemini Multimodal: estilo visual fotorrealista 4K
            </Badge>
          </div>
        )}
      </div>

      {/* ─── SECTION 3: ADVANCED & MULTIMODAL ─── */}
      <div className={`sidebar-accordion ${openSection === 'advanced' ? 'open' : ''}`}>
        <button
          type="button"
          className="sidebar-accordion-trigger"
          onClick={() => toggleSection('advanced')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={15} color="var(--accent-gold)" /> Referencias & Avanzado
          </span>
          {openSection === 'advanced' ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {openSection === 'advanced' && (
          <div className="sidebar-accordion-content">
            {/* Web Grounding Toggle Card */}
            <Card
              style={{
                padding: '10px 12px',
                borderColor: config.enableGrounding !== false ? 'var(--accent-sky-border)' : undefined,
                backgroundColor: config.enableGrounding !== false ? 'var(--accent-sky-soft)' : 'var(--bg-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: config.enableGrounding !== false ? 'var(--accent-sky)' : 'var(--text-primary)' }}>
                  <Globe size={14} /> Web Grounding
                </span>

                <Button
                  variant={config.enableGrounding !== false ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onChangeConfig({ enableGrounding: config.enableGrounding === false ? true : false })}
                  style={{
                    height: '22px',
                    fontSize: '0.62rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: config.enableGrounding !== false ? 'var(--accent-sky)' : undefined
                  }}
                >
                  {config.enableGrounding !== false ? 'ACTIVO' : 'INACTIVO'}
                </Button>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.35, margin: 0 }}>
                Conexión en vivo con Google Search para fundamentar figuras reales y conceptos actuales.
              </p>
            </Card>

            {/* Subject Reference Images Dropzone */}
            <SubjectUploader
              images={config.referenceImageBase64}
              onChangeImages={(imgs) => onChangeConfig({ referenceImageBase64: imgs })}
            />

            {/* Negative Prompt Input */}
            <div>
              <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Ban size={12} color="var(--accent-rose)" />
                <span>Exclusiones (Negative Prompt)</span>
              </div>
              <input
                type="text"
                className="ui-input"
                value={config.negativePrompt || ''}
                onChange={(e) => onChangeConfig({ negativePrompt: e.target.value })}
                placeholder="Ej. desdibujado, baja calidad, artefactos..."
              />
            </div>

            {/* Numeric Seed Input */}
            <div>
              <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Hash size={12} color="var(--accent-gold)" />
                <span>Semilla Numérica (Seed)</span>
              </div>
              <input
                type="number"
                className="ui-input"
                value={config.seed || ''}
                onChange={(e) => onChangeConfig({ seed: e.target.value })}
                placeholder="Fijar semilla..."
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
