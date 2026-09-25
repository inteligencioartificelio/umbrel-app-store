import React from 'react';
import {
  Sparkles,
  Key,
  Database,
  History,
  Trash2,
  Sun,
  Moon
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function StudioNavbar({
  apiKey,
  theme = 'dark',
  onToggleTheme,
  onOpenApiKeyModal,
  onOpenDatabaseModal,
  onOpenEditorModal,
  showHistory,
  onToggleHistory,
  onClearHistory,
  historyCount
}) {
  const isConnected = Boolean(apiKey && apiKey.trim());

  return (
    <header className="studio-header">
      {/* Brand & Logo */}
      <div className="studio-brand">
        <div className="studio-brand-logo">
          <Sparkles size={16} />
        </div>
        <span className="studio-brand-title">Nano Banana</span>
        <Badge variant="gold">Studio 4K</Badge>
      </div>

      {/* Actions */}
      <div className="studio-header-actions">
        {/* Open AI Image Editor Modal (From Scratch or Upload) */}
        {onOpenEditorModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenEditorModal}
            title="Abrir Editor de Imágenes con IA (marcar áreas, comentarios y estilo de referencia)"
            icon={Sparkles}
            style={{
              borderRadius: 'var(--radius-full)',
              borderColor: 'var(--accent-gold-border)',
              color: 'var(--accent-gold-text)',
              backgroundColor: 'var(--accent-gold-soft)',
              fontWeight: 700
            }}
          >
            <span>Modo Edición</span>
          </Button>
        )}

        {/* Light / Dark Mode Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Cambiar a Modo Claro (Light)' : 'Cambiar a Modo Oscuro (Dark)'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#09090b" />}
        </Button>

        {/* API Key Status Pill */}
        <Button
          variant={isConnected ? 'outline' : 'gold'}
          size="sm"
          onClick={onOpenApiKeyModal}
          title="Configuración de clave API Google AI Studio"
          icon={Key}
          style={{
            borderRadius: 'var(--radius-full)',
            borderColor: isConnected ? 'rgba(16, 185, 129, 0.4)' : undefined,
            color: isConnected ? '#10b981' : undefined,
            backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.08)' : undefined
          }}
        >
          <span>{isConnected ? 'API Conectada' : 'Conectar API Key'}</span>
        </Button>

        {/* Database & Backup Trigger */}
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenDatabaseModal}
          title="Gestor de Base de Datos y Respaldos"
          aria-label="Abrir base de datos"
        >
          <Database size={15} />
        </Button>

        {/* History Gallery Toggle Button */}
        <Button
          variant={showHistory ? 'gold' : 'outline'}
          size="icon"
          onClick={onToggleHistory}
          title="Historial de Generaciones"
          aria-label="Alternar historial"
          style={{ position: 'relative' }}
        >
          <History size={15} />
          {historyCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--accent-gold)',
                color: '#000000',
                fontSize: '0.58rem',
                fontWeight: 800,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {historyCount > 99 ? '99+' : historyCount}
            </span>
          )}
        </Button>

        {/* Clear History Button if items exist */}
        {historyCount > 0 && (
          <Button
            variant="destructive"
            size="icon"
            onClick={onClearHistory}
            title="Borrar Historial"
            aria-label="Borrar historial"
          >
            <Trash2 size={15} />
          </Button>
        )}
      </div>
    </header>
  );
}
