import React, { useState, useRef } from 'react';
import { Columns } from 'lucide-react';

export default function CompareSlider({
  baseImage,
  overlayImage,
  baseLabel = 'Referencia',
  overlayLabel = 'Resultado'
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  return (
    <div
      className="split-canvas-wrapper"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {/* Floating Badges */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 20, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold-border)', fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: '12px' }}>
        {baseLabel}
      </div>

      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: '12px' }}>
        {overlayLabel}
      </div>

      {/* Base Image (Reference) */}
      <img src={baseImage} alt="Referencia" className="split-layer-img" />

      {/* Overlay Image (Generated) Clipped by Slider */}
      <div
        className="split-overlay-wrapper"
        style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
      >
        <img src={overlayImage} alt="Sintetizado" className="split-layer-img" />
      </div>

      {/* Interactive Slider Bar */}
      <div className="split-handle" style={{ left: `${sliderPos}%` }}>
        <div className="split-handle-button">
          <Columns size={16} />
        </div>
      </div>
    </div>
  );
}
