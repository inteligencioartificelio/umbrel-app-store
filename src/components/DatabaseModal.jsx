import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  Trash2,
  HardDrive,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  clearAllHistory
} from '../services/database';
import Dialog from './ui/Dialog';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';

export default function DatabaseModal({
  isOpen,
  onClose,
  totalItems,
  onRefreshHistory
}) {
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      await exportDatabaseBackup();
      setStatusMsg({ type: 'success', text: '¡Base de datos exportada exitosamente como respaldo JSON!' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Error al exportar la base de datos.' });
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setStatusMsg(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const count = await importDatabaseBackup(event.target.result);
        setStatusMsg({ type: 'success', text: `¡Se importaron ${count} registros a la base de datos local!` });
        onRefreshHistory();
      } catch (err) {
        setStatusMsg({ type: 'error', text: err.message || 'Error al importar el archivo JSON.' });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleClear = async () => {
    if (window.confirm('¿Estás seguro de vaciar toda la base de datos local de generaciones?')) {
      await clearAllHistory();
      onRefreshHistory();
      setStatusMsg({ type: 'success', text: 'Base de datos vaciada.' });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Base de Datos Persistente"
      description="IndexedDB Local • Historial y Parámetros Guardados"
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Database Status Card */}
        <Card style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold-light)' }}>
              <HardDrive size={18} />
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', display: 'block' }}>
                {totalItems} Imágenes Guardadas
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                Persistencia automática activa
              </span>
            </div>
          </div>
          <Badge variant="sky">● Activa</Badge>
        </Card>

        {statusMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: statusMsg.type === 'success' ? '#10b981' : '#ef4444',
              border: statusMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Database Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={totalItems === 0}
            icon={Download}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Exportar Respaldo JSON
          </Button>

          <label style={{ width: '100%' }}>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              disabled={importing}
              style={{ display: 'none' }}
            />
            <Button
              variant="outline"
              as="span"
              icon={Upload}
              loading={importing}
              style={{ width: '100%', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'none' }}
            >
              Importar Respaldo JSON
            </Button>
          </label>

          <Button
            variant="destructive"
            onClick={handleClear}
            disabled={totalItems === 0}
            icon={Trash2}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Vaciar Base de Datos Local
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
