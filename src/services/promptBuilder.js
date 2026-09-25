/**
 * Prompt construction logic for Nano Banana Studio.
 * Builds structured prompts from user input, style presets, and quality settings.
 * Separated from API transport layer for testability and single-responsibility.
 */

import { MAX_STYLE_REFERENCE_IMAGES } from './database.js';

// ─── MODEL REGISTRY ───────────────────────────────────────────────────

export const MODEL_MAPPINGS = {
  'nano-banana-pro': [
    { id: 'gemini-3-pro-image', protocol: 'generateContent' },
    { id: 'gemini-3-pro-image-preview', protocol: 'generateContent' },
    { id: 'nano-banana-pro-preview', protocol: 'generateContent' },
    { id: 'imagen-4.0-ultra-generate-001', protocol: 'predict' },
    { id: 'imagen-4.0-generate-001', protocol: 'predict' },
    { id: 'imagen-3.0-generate-002', protocol: 'predict' }
  ],
  'nano-banana-2': [
    { id: 'gemini-3.1-flash-image', protocol: 'generateContent' },
    { id: 'gemini-3.1-flash-image-preview', protocol: 'generateContent' },
    { id: 'imagen-4.0-fast-generate-001', protocol: 'predict' },
    { id: 'imagen-3.0-fast-generate-001', protocol: 'predict' }
  ],
  'nano-banana-2-lite': [
    { id: 'gemini-3.1-flash-lite-image', protocol: 'generateContent' },
    { id: 'gemini-3.1-flash-image', protocol: 'generateContent' }
  ]
};

export const FALLBACK_MODELS = [
  { id: 'gemini-3-pro-image', protocol: 'generateContent' },
  { id: 'gemini-3.1-flash-image', protocol: 'generateContent' },
  { id: 'imagen-3.0-generate-002', protocol: 'predict' }
];

// ─── STYLE INTENSITY LABELS ──────────────────────────────────────────

const INTENSITY_INSTRUCTIONS = {
  subtle: 'Aplica el estilo de forma ligera. Conserva ampliamente la apariencia, composición y características descritas en la solicitud del usuario.',
  moderate: 'Aplica claramente la paleta, iluminación, textura y acabado del estilo, manteniendo la composición y el contenido principal solicitados por el usuario.',
  intense: 'Aplica de forma marcada la estética visual, iluminación, paleta, textura, composición y acabado del estilo seleccionado, sin sustituir el sujeto principal indicado por el usuario.'
};

// ─── RESOLUTION HELPERS ──────────────────────────────────────────────

export function getResolutionInstruction(resolution) {
  if (resolution === '4096x4096' || resolution === '4K') {
    return 'ESPECIFICACIÓN DE CALIDAD TÉCNICA: Masterpiece quality, ultra-sharp 4K resolution (3840x2160 pixels), maximum micro-texture fidelity, zero compression artifacts, crystal clear focus, high dynamic range.';
  }
  if (resolution === '2048x2048' || resolution === '2K') {
    return 'ESPECIFICACIÓN DE CALIDAD TÉCNICA: High definition 2K resolution, sharp focus, detailed textures.';
  }
  return '';
}

export function getImageSizeParam(resolution) {
  if (resolution === '4096x4096') return '4K';
  if (resolution === '2048x2048') return '2K';
  return '1024x1024';
}

// ─── MAIN PROMPT BUILDER ─────────────────────────────────────────────

/**
 * Builds a complete image generation prompt from user input and style preset.
 *
 * @param {string} userPrompt - Raw user prompt text
 * @param {object|null} stylePreset - Selected style preset object (or null)
 * @param {object} options - Additional options
 * @returns {{ finalPromptText, negativePromptText, stylePresetUsed, styleIntensityUsed, styleReferences }}
 */
export function buildImageGenerationRequest(userPrompt, stylePreset, options = {}) {
  const {
    styleIntensity = 'moderate',
    negativePrompt = '',
    resolution = '4096x4096',
    aspectRatio = '16:9'
  } = options;

  const resolutionInstruction = getResolutionInstruction(resolution);
  const aspectInstruction = aspectRatio ? `PROPORCIÓN DE ASPECTO: ${aspectRatio}.` : '';

  // No style preset — plain prompt with optional quality directives
  if (!stylePreset || stylePreset.id === 'none') {
    let finalPromptText = userPrompt.trim();
    const combinedNegative = negativePrompt ? negativePrompt.trim() : '';

    if (resolution !== '4096x4096' || aspectRatio !== '16:9' || combinedNegative) {
      const extras = [
        resolutionInstruction,
        aspectInstruction,
        combinedNegative ? `ELEMENTOS QUE DEBEN EVITARSE:\n${combinedNegative}` : ''
      ].filter(Boolean).join('\n');

      if (extras && options.resolution) {
        finalPromptText = `${userPrompt.trim()}\n\n${extras}`;
      }
    }

    return {
      finalPromptText,
      negativePromptText: combinedNegative,
      stylePresetUsed: null,
      styleIntensityUsed: null,
      styleReferences: []
    };
  }

  // With style preset — structured prompt
  const intensityText = INTENSITY_INSTRUCTIONS[styleIntensity] || INTENSITY_INSTRUCTIONS.moderate;

  let combinedNegative = stylePreset.negativeStylePrompt || '';
  if (negativePrompt && negativePrompt.trim()) {
    combinedNegative = combinedNegative
      ? `${combinedNegative}, ${negativePrompt.trim()}`
      : negativePrompt.trim();
  }

  const finalPromptText = `Genera una imagen nueva a partir de la solicitud del usuario.

SOLICITUD DEL USUARIO:
${userPrompt.trim()}

ESTILO VISUAL SELECCIONADO:
${stylePreset.stylePrompt}

INTENSIDAD DEL ESTILO:
${intensityText}

${resolutionInstruction}
${aspectInstruction}

INSTRUCCIONES DE TRANSFERENCIA:
Aplica principalmente la paleta de color, iluminación, contraste, textura, composición, perspectiva, tratamiento visual y acabado observados en las imágenes de referencia.

INSTRUCCIONES DE CONSERVACIÓN:
Mantén como prioridad la solicitud del usuario. No copies personas, rostros, logotipos, marcas, texto, objetos específicos ni la composición exacta de las imágenes de referencia.

${combinedNegative ? `ELEMENTOS QUE DEBEN EVITARSE:\n${combinedNegative}\n` : ''}
Las imágenes adjuntas son referencias de estilo, no contenido que deba reproducirse literalmente.`;

  return {
    finalPromptText,
    negativePromptText: combinedNegative,
    stylePresetUsed: {
      id: stylePreset.id,
      name: stylePreset.name,
      slug: stylePreset.slug
    },
    styleIntensityUsed: styleIntensity,
    styleReferences: (stylePreset.referenceImages || []).slice(0, MAX_STYLE_REFERENCE_IMAGES)
  };
}

/**
 * Parses a base64 Data URL (or plain base64 string) into mimeType + raw data.
 */
export function parseImageDataUrl(dataUrl, defaultMime = 'image/jpeg') {
  if (!dataUrl) return null;
  const urlStr = typeof dataUrl === 'string' ? dataUrl : dataUrl.url || '';
  if (!urlStr) return null;

  if (urlStr.startsWith('data:')) {
    const parts = urlStr.split(';base64,');
    const mimeType = parts[0].replace('data:', '');
    const data = parts[1];
    return { mimeType, data };
  }
  return { mimeType: dataUrl.mimeType || defaultMime, data: urlStr };
}

/**
 * Returns a human-friendly spatial description from coordinates.
 */
export function getSpatialDescription(x, y, width = null, height = null) {
  let horiz = 'Centro';
  if (x < 33) horiz = 'Lado izquierdo';
  else if (x > 66) horiz = 'Lado derecho';

  let vert = 'Zona media';
  if (y < 33) vert = 'Zona superior (cabeza / cielo)';
  else if (y > 66) vert = 'Zona inferior (base / suelo)';

  if (width && height) {
    return `${vert} - ${horiz} (Región delimitada: X: ${Math.round(x)}%-${Math.round(x + width)}%, Y: ${Math.round(y)}%-${Math.round(y + height)}%)`;
  }
  return `${vert} - ${horiz} (Coordenada X: ${Math.round(x)}%, Y: ${Math.round(y)}%)`;
}

/**
 * Builds a prompt for modifying an existing image with AI (Image-to-Image / Localized Inpainting with Annotations & Comments).
 *
 * @param {string} editInstruction - General edit instruction / prompt
 * @param {string} originalPrompt - The original prompt that created the image (if any)
 * @param {object} options - Additional options including annotations array and hasStyleReference flag
 * @returns {string} Structured prompt for localized image editing
 */
export function buildImageEditPrompt(editInstruction, originalPrompt = '', options = {}) {
  const { resolution = '4096x4096', aspectRatio = '16:9', annotations = [], hasStyleReference = false } = options;
  const resolutionInstruction = getResolutionInstruction(resolution);
  const aspectInstruction = aspectRatio ? `PROPORCIÓN DE ASPECTO: ${aspectRatio}.` : '';

  let localizedDirectives = '';
  if (Array.isArray(annotations) && annotations.length > 0) {
    const validAnnotations = annotations.filter((a) => a && (a.comment?.trim() || a.label));
    if (validAnnotations.length > 0) {
      localizedDirectives = `\nÁREAS ESPECÍFICAS DE LA IMAGEN MARCADAS PARA MODIFICAR:
El usuario ha señalado puntos y regiones concretas en la imagen adjunta con comentarios e instrucciones específicas para cada área:
${validAnnotations.map((ann, idx) => {
  const spatialDesc = getSpatialDescription(ann.x, ann.y, ann.width, ann.height);
  const comment = ann.comment?.trim() || 'Modificar según instrucción general';
  const typeLabel = ann.type === 'box' ? 'Región Delimitada' : 'Punto/Pin';
  return `\n📍 [ÁREA #${idx + 1} - ${typeLabel} en ${spatialDesc}]:\n-> COMENTARIO DEL USUARIO: "${comment}"`;
}).join('\n')}

DIRECTIVAS DE EDICIÓN LOCALIZADA:
- Aplica los cambios solicitados con extrema precisión únicamente en las áreas señaladas.
- Mantén el 100% de la fisonomía, pose, objetos, colores e iluminación intactos en todas las áreas donde no se hayan marcado anotaciones.
- Asegura una transición fluida, iluminación y sombras fotorrealistas en los bordes de cada área editada.`;
    }
  }

  let styleRefDirectives = '';
  if (hasStyleReference) {
    styleRefDirectives = `\nTRANSFERENCIA DE ESTILO VISUAL DE REFERENCIA:
Se ha adjuntado un archivo de imagen adicional exclusivamente como REFERENCIA DE ESTILO ARTÍSTICO.
- Extrae y aplica ÚNICAMENTE la estética artística, paleta de colores, iluminación, textura, medio (ej. fotografía, pintura, render 3D) y atmósfera visual de dicha imagen de referencia al realizar la edición.
- NO copies personas, rostros, objetos específicos, marcas ni la composición literal de la imagen de referencia de estilo. La imagen principal a conservar y modificar es la primera imagen base.`;
  }

  const generalInstructionText = editInstruction && editInstruction.trim()
    ? `INSTRUCCIÓN GENERAL DE EDICIÓN:\n${editInstruction.trim()}`
    : '';

  let prompt = `INSTRUCCIÓN DE EDICIÓN Y MODIFICACIÓN VISUAL DE IMAGEN:
Modifica la imagen adjunta aplicando con máxima precisión los cambios indicados a continuación.

${localizedDirectives}

${styleRefDirectives}

${generalInstructionText}

DIRECTIVAS DE PRESERVACIÓN Y CALIDAD:
- Mantén la identidad, fisonomía del sujeto, características clave y composición general de la imagen original en todo lo que no haya sido solicitado para modificar.
- Integra de forma orgánica y fotorrealista cualquier elemento nuevo para que coincida con la iluminación, textura y estilo de la imagen original.
- Si se solicita un cambio de fondo o iluminación, ajusta los reflejos y sombras correspondientes en el sujeto de manera fotorrealista.
${originalPrompt ? `\nCONTEXTO ORIGINAL:\n${originalPrompt.trim()}` : ''}

${resolutionInstruction}
${aspectInstruction}`;

  return prompt.trim();
}

/**
 * Builds a prompt for super-resolution / upscaling an image to 2K or 4K.
 *
 * @param {string} targetResolution - '4K' | '2K' | '4096x4096' | '2048x2048'
 * @param {string} originalPrompt - Original prompt (if any)
 * @param {object} options - Options such as aspectRatio
 * @returns {string} Structured prompt for image upscaling
 */
export function buildImageUpscalePrompt(targetResolution = '4K', originalPrompt = '', options = {}) {
  const normalizedRes = (targetResolution === '4096x4096' || targetResolution === '4K') ? '4K Ultra HD (4096x4096)' : '2K Quad HD (2048x2048)';
  const resolutionCode = (targetResolution === '4096x4096' || targetResolution === '4K') ? '4096x4096' : '2048x2048';
  const resolutionInstruction = getResolutionInstruction(resolutionCode);
  const aspectInstruction = options.aspectRatio ? `PROPORCIÓN DE ASPECTO: ${options.aspectRatio}.` : '';

  return `TAREA DE REESCALADO Y SUPER-RESOLUCIÓN DE ULTRA ALTA DEFINICIÓN (AI UPSCALE & ENHANCE):
Reconstruye, optimiza y reescala la imagen adjunta a una resolución nativa de ${normalizedRes}.

DIRECTIVAS DE REESCALADO Y PRESERVACIÓN 1:1:
- Conserva el 100% de la identidad, composición, sujetos, expresiones, ropa, paleta cromática, geometría e iluminación de la imagen original.
- Elimina cualquier ruido digital, artefacto de compresión, grano excesivo o bordes borrosos.
- Realza y reconstruye micro-texturas con nitidez cristalina: poros y detalles dérmicos, hebras de cabello individuales, texturas de tela, reflejos especulares en los ojos y micro-detalles de fondo.
- Mejora la nitidez y el enfoque general manteniendo un aspecto completamente orgánico y fotorrealista.
${originalPrompt ? `\nCONTEXTO Y DETALLES ORIGINALES DEL SUJETO:\n${originalPrompt.trim()}` : ''}

${resolutionInstruction}
${aspectInstruction}`.trim();
}

/**
 * Generates a unique image ID for a generation variant.
 */
export function generateImageId(variantIndex) {
  return `gen_${Date.now()}_var${variantIndex}_${Math.random().toString(36).substring(2, 7)}`;
}

