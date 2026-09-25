import React from 'react';
import { Plus, X, UploadCloud, Image as ImageIcon } from 'lucide-react';
import Badge from '../ui/Badge';

const MAX_SUBJECTS = 5;

export default function SubjectUploader({
  images = [],
  onChangeImages
}) {
  const imageList = Array.isArray(images) ? images : images ? [images] : [];

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_SUBJECTS - imageList.length;
    if (remaining <= 0) return;

    const filesToRead = files.slice(0, remaining);
    let loaded = 0;
    const newItems = [];

    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newItems.push(event.target.result);
        }
        loaded++;
        if (loaded === filesToRead.length) {
          onChangeImages([...imageList, ...newItems]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemove = (index) => {
    onChangeImages(imageList.filter((_, idx) => idx !== index));
  };

  const handleClear = () => {
    onChangeImages([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="field-label" style={{ margin: 0 }}>
          Fotos de Sujeto ({imageList.length}/{MAX_SUBJECTS})
        </span>

        {imageList.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.68rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Limpiar todas
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {imageList.map((imgUrl, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              aspectRatio: '1',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)'
            }}
          >
            <img src={imgUrl} alt={`Sujeto #${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                left: '2px',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: '0.55rem',
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: '3px'
              }}
            >
              #{idx + 1}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                background: 'rgba(239, 68, 68, 0.9)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Eliminar foto"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {imageList.length < MAX_SUBJECTS && (
          <label
            style={{
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--accent-gold-border)',
              background: 'var(--accent-gold-soft)',
              aspectRatio: '1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              gap: '2px',
              transition: 'all 0.2s ease'
            }}
            title="Subir o pegar fotos del sujeto"
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            <Plus size={14} color="var(--accent-gold)" />
            <span style={{ fontSize: '0.62rem', color: 'var(--accent-gold-text)', fontWeight: 600 }}>
              + Foto
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
