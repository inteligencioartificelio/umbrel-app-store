import { describe, it, expect } from 'vitest';
import { buildImageUpscalePrompt, getResolutionInstruction } from '../services/promptBuilder';

describe('Image Upscaling & Super-Resolution (2K / 4K)', () => {
  it('1. Generates 4K Ultra HD super-resolution prompt structure', () => {
    const origPrompt = 'Retrato de un astronauta en Marte';
    const upscalePrompt = buildImageUpscalePrompt('4K', origPrompt, { aspectRatio: '16:9' });

    expect(upscalePrompt).toContain('TAREA DE REESCALADO Y SUPER-RESOLUCIÓN DE ULTRA ALTA DEFINICIÓN');
    expect(upscalePrompt).toContain('4K Ultra HD');
    expect(upscalePrompt).toContain('DIRECTIVAS DE REESCALADO Y PRESERVACIÓN 1:1');
    expect(upscalePrompt).toContain('Conserva el 100% de la identidad');
    expect(upscalePrompt).toContain('Retrato de un astronauta en Marte');
    expect(upscalePrompt).toContain('PROPORCIÓN DE ASPECTO: 16:9');
  });

  it('2. Generates 2K Quad HD super-resolution prompt structure', () => {
    const origPrompt = 'Pintura al óleo de un jardín japonés';
    const upscalePrompt = buildImageUpscalePrompt('2K', origPrompt, { aspectRatio: '1:1' });

    expect(upscalePrompt).toContain('2K Quad HD');
    expect(upscalePrompt).toContain('High definition 2K resolution');
    expect(upscalePrompt).toContain('Pintura al óleo de un jardín japonés');
    expect(upscalePrompt).toContain('PROPORCIÓN DE ASPECTO: 1:1');
  });

  it('3. Resolution instruction returns appropriate quality technical specifications', () => {
    const res4K = getResolutionInstruction('4096x4096');
    expect(res4K).toContain('Masterpiece quality');
    expect(res4K).toContain('4K');

    const res2K = getResolutionInstruction('2048x2048');
    expect(res2K).toContain('2K');
  });
});
