import React, { useState, useEffect } from 'react';
import { Zap, Sparkles } from 'lucide-react';

const PHRASES = [
  'Inicializando red difusora Nano Banana...',
  'Mapeando tensores de iluminación y textura 4K...',
  'Sintetizando matriz de píxeles hiperrealistas...',
  'Refinando nitidez y gradación de color de estudio...'
];

export default function CyberSkeleton({ variantIndex = 0 }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % PHRASES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="studio-skeleton-card">
      <div className="cyber-shimmer-sweep" />

      <div className="cyber-ring-outer">
        <div className="cyber-ring-inner">
          <Zap size={18} color="var(--accent-gold)" />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px', zIndex: 10 }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: 'var(--accent-gold-text)',
            display: 'block',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em'
          }}
        >
          SINTETIZANDO #{variantIndex + 1}
        </span>
        <p
          style={{
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            marginTop: '4px',
            maxWidth: '190px',
            lineHeight: '1.4'
          }}
        >
          {PHRASES[step]}
        </p>
      </div>
    </div>
  );
}
