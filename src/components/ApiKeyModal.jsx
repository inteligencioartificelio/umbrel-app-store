import React, { useState } from 'react';
import { Key, CheckCircle, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { testApiKey } from '../services/googleAiApi';
import Dialog from './ui/Dialog';
import Button from './ui/Button';
import Input from './ui/Input';

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveApiKey }) {
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!inputKey.trim()) {
      setTestResult({ success: false, message: 'Ingresa una API Key primero.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await testApiKey(inputKey.trim());
      setTestResult({
        success: true,
        message: '¡Conexión exitosa con Google AI Studio API! Acceso a Imagen 3 / Nano Banana confirmado.'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'No se pudo conectar a la API.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Google AI Studio API Key"
      description="Acceso a modelos Nano Banana e Imagen 3"
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--muted-foreground)',
              marginBottom: '6px'
            }}
          >
            Tu clave API de Google AI Studio:
          </label>
          <Input
            type="password"
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              setTestResult(null);
            }}
            placeholder="AIzaSy..."
            icon={Key}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--muted-foreground)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#10b981" /> Guardado seguro localmente
          </span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent-gold-light)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600
            }}
          >
            Obtener API Key gratis <ExternalLink size={12} />
          </a>
        </div>

        {testResult && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: testResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: testResult.success ? '#10b981' : '#ef4444'
            }}
          >
            {testResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{testResult.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <Button
            variant="outline"
            onClick={handleTest}
            loading={testing}
            style={{ flex: 1 }}
          >
            Probar Conexión
          </Button>

          <Button
            variant="gold"
            onClick={handleSave}
            style={{ flex: 1 }}
          >
            Guardar API Key
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
