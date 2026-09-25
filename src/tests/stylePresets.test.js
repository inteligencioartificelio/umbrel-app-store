import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStylePresets,
  createStylePreset,
  validateStylePreset
} from '../services/database';
import { buildImageGenerationRequest } from '../services/promptBuilder';

describe('Style Presets (Estilos Visuales) Test Suite', () => {
  const samplePreset = {
    id: 'test-style-cyber',
    name: 'Neon Cyberpunk Studio',
    slug: 'neon-cyberpunk-studio',
    description: 'Vivid neon cyan and magenta lighting',
    stylePrompt: 'Cinematic cyberpunk atmosphere, neon cyan and vivid magenta lighting, 8k resolution',
    negativeStylePrompt: 'harsh daylight, pastel colors, vintage sepia',
    referenceImages: [
      { id: 'ref_1', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', mimeType: 'image/png', order: 1, altText: 'Neon light' }
    ]
  };

  it('1. Pre-populates default studio style presets', async () => {
    const presets = await getStylePresets();
    expect(presets.length).toBeGreaterThanOrEqual(4);
    expect(presets.some((p) => p.name.includes('Editorial'))).toBe(true);
  });

  it('2. Validates style preset - rejects missing name or stylePrompt', () => {
    const invalidNoName = validateStylePreset({ stylePrompt: 'Cinematic' });
    expect(invalidNoName).toContain('El nombre del estilo es obligatorio.');

    const invalidNoPrompt = validateStylePreset({ name: 'My Style' });
    expect(invalidNoPrompt).toContain('El prompt de instrucciones del estilo es obligatorio.');
  });

  it('3. Builds generation request with "Sin estilo" (null preset)', () => {
    const userPrompt = 'Un gato astronauta flotando en el espacio';
    const req = buildImageGenerationRequest(userPrompt, null, { styleIntensity: 'moderate' });

    expect(req.finalPromptText).toBe(userPrompt);
    expect(req.stylePresetUsed).toBeNull();
    expect(req.styleReferences.length).toBe(0);
  });

  it('4. Builds generation request with Subtle Intensity ("subtle")', () => {
    const userPrompt = 'Un samurai cibernético bajo la lluvia';
    const req = buildImageGenerationRequest(userPrompt, samplePreset, { styleIntensity: 'subtle' });

    expect(req.finalPromptText).toContain('SOLICITUD DEL USUARIO:\nUn samurai cibernético bajo la lluvia');
    expect(req.finalPromptText).toContain('Aplica el estilo de forma ligera');
    expect(req.styleIntensityUsed).toBe('subtle');
  });

  it('5. Builds generation request with Moderate Intensity ("moderate")', () => {
    const userPrompt = 'Una mujer explorando una biblioteca futurista';
    const req = buildImageGenerationRequest(userPrompt, samplePreset, { styleIntensity: 'moderate' });

    expect(req.finalPromptText).toContain('Aplica claramente la paleta, iluminación, textura y acabado del estilo');
    expect(req.styleIntensityUsed).toBe('moderate');
  });

  it('6. Builds generation request with Intense Intensity ("intense")', () => {
    const userPrompt = 'Un coche deportivo en una ciudad de noche';
    const req = buildImageGenerationRequest(userPrompt, samplePreset, { styleIntensity: 'intense' });

    expect(req.finalPromptText).toContain('Aplica de forma marcada la estética visual');
    expect(req.styleIntensityUsed).toBe('intense');
  });

  it('7. Combines user negative prompt with negativeStylePrompt', () => {
    const userPrompt = 'Retrato fotográfico';
    const req = buildImageGenerationRequest(userPrompt, samplePreset, {
      styleIntensity: 'moderate',
      negativePrompt: 'blur, distortion'
    });

    expect(req.negativePromptText).toContain('harsh daylight');
    expect(req.negativePromptText).toContain('blur, distortion');
  });
});
