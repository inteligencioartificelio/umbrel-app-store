import React from 'react';
import { Sparkles, Layers } from 'lucide-react';
import Dialog from './ui/Dialog';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';

export default function StylePresetDetailModal({ preset, isOpen, onClose, onSelectAndClose }) {
  if (!isOpen || !preset) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={preset.name}
      description="Detalles e instrucciones del Estilo Visual"
      maxWidth="540px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Cover Preview & Reference Gallery */}
        {preset.referenceImages && preset.referenceImages.length > 0 && (
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Imágenes de Referencia ({preset.referenceImages.length}):
            </span>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {preset.referenceImages.map((ref) => (
                <img
                  key={ref.id}
                  src={ref.url}
                  alt={ref.altText || 'Referencia'}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Instructions & Prompts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Descripción:
            </span>
            <div style={{ fontSize: '0.8rem', color: 'var(--foreground)', background: 'var(--secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              {preset.description || 'Sin descripción adicional.'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Prompt de Estilo:
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-gold-light)', background: 'var(--accent-gold-soft)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--accent-gold-border)', fontFamily: 'var(--font-mono)', lineHeight: '1.45' }}>
              {preset.stylePrompt}
            </div>
          </div>

          {preset.negativeStylePrompt && (
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--destructive)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Exclusiones (Negative Prompt):
              </span>
              <div style={{ fontSize: '0.78rem', color: 'var(--destructive)', background: 'rgba(239, 68, 68, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {preset.negativeStylePrompt}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant="gold"
          onClick={() => onSelectAndClose(preset)}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Usar este Estilo Visual
        </Button>
      </div>
    </Dialog>
  );
}
