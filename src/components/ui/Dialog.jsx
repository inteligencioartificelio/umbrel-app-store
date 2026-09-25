import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Dialog({
  isOpen,
  onClose,
  children,
  title,
  description,
  maxWidth = '540px',
  className = '',
  showClose = true
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ui-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`ui-dialog-panel ${className}`} style={{ maxWidth }}>
        {(title || showClose) && (
          <div className="ui-dialog-header">
            <div>
              {title && <h2 className="ui-dialog-title">{title}</h2>}
              {description && <p className="ui-dialog-description">{description}</p>}
            </div>

            {showClose && (
              <button
                type="button"
                className="ui-dialog-close-btn"
                onClick={onClose}
                aria-label="Cerrar diálogo"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div className="ui-dialog-body">{children}</div>
      </div>
    </div>
  );
}

export default Dialog;
