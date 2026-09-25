/**
 * Google AI Studio API service for Nano Banana Studio.
 * Handles HTTP communication with Gemini/Imagen endpoints.
 * Prompt construction is delegated to promptBuilder.js.
 */

import { MAX_STYLE_REFERENCE_IMAGES } from './database.js';
import {
  MODEL_MAPPINGS,
  FALLBACK_MODELS,
  buildImageGenerationRequest,
  buildImageEditPrompt,
  buildImageUpscalePrompt,
  parseImageDataUrl,
  generateImageId,
  getImageSizeParam
} from './promptBuilder.js';
import { upscaleImageCanvas } from './canvasUpscaler.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Re-export for consumers that still import from this module
export { buildImageGenerationRequest, upscaleImageCanvas };

// ─── API KEY VALIDATION ───────────────────────────────────────────────

/**
 * Validates an API Key against Google AI Studio.
 */
export async function testApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Por favor ingresa una API Key válida de Google AI Studio.');
  }

  const response = await fetch(`${BASE_URL}/models?key=${apiKey.trim()}`, {
    headers: { 'x-goog-api-key': apiKey.trim() }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Error HTTP ${response.status}: API Key inválida.`);
  }

  const data = await response.json();
  return data.models || [];
}

/**
 * Fetches available image generation models from the user's API Key.
 */
export async function getAvailableImageModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return [];
  try {
    const response = await fetch(`${BASE_URL}/models?key=${apiKey.trim()}`, {
      headers: { 'x-goog-api-key': apiKey.trim() }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.models || [])
      .filter((m) => {
        const name = (m.name || '').toLowerCase();
        return name.includes('banana') || name.includes('imagen-3');
      })
      .map((m) => m.name.replace(/^models\//, ''));
  } catch {
    return [];
  }
}

// ─── PROMPT ENHANCEMENT ───────────────────────────────────────────────

/**
 * Enhances a user prompt using Gemini 2.5 Flash.
 */
export async function enhancePrompt(apiKey, userPrompt, styleContext = '') {
  if (!apiKey) throw new Error('Se requiere una API Key para usar Magic Prompt.');

  const systemInstruction = `Eres un ingeniero maestro de prompts de IA especializado en la familia de modelos Nano Banana (Nano Banana 2 y Nano Banana Pro).
Tu objetivo es transformar la idea del usuario en un prompt visualmente impresionante, atmosférico, extremadamente detallado y cinematográfico.
Incluye detalles de iluminación, composición de cámara, textura (ej. 4K resolution) y vibra artística.
IMPORTANTE: Devuelve ÚNICAMENTE el texto final del prompt expandido en inglés, sin explicaciones, ni comillas, ni frases introductorias.`;

  const fullUserContent = styleContext
    ? `Prompt original: "${userPrompt}". Estilo seleccionado: "${styleContext}".`
    : `Prompt original: "${userPrompt}".`;

  const url = `${BASE_URL}/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim()
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${fullUserContent}` }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al expandir el prompt con Gemini.');
  }

  const data = await response.json();
  const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!enhancedText) throw new Error('No se recibió respuesta válida del optimizador de prompts.');

  return enhancedText.trim();
}

// ─── STYLE ANALYSIS ───────────────────────────────────────────────────

/**
 * Analyzes artistic style from reference images using Gemini Multimodal Vision.
 */
export async function analyzeStyleFromImages(apiKey, referenceImages = []) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Se requiere una API Key configurada para analizar el estilo con IA.');
  }
  if (!referenceImages || referenceImages.length === 0) {
    throw new Error('Debes subir al menos 1 imagen de referencia para analizar su estilo.');
  }

  const parts = [];

  referenceImages.slice(0, MAX_STYLE_REFERENCE_IMAGES).forEach((imgObj) => {
    const parsed = parseImageDataUrl(imgObj);
    if (parsed && parsed.data) {
      parts.push({
        inlineData: { mimeType: parsed.mimeType || 'image/jpeg', data: parsed.data }
      });
    }
  });

  if (parts.length === 0) {
    throw new Error('No se pudieron procesar los datos Base64 de las imágenes de referencia.');
  }

  const promptText = `Realiza un análisis artístico, técnico y visual EXTREMADAMENTE DETALLADO Y ESPECÍFICO de las imágenes de referencia adjuntas.
Tu objetivo es extraer con máxima precisión el prompt de estilo en inglés para que modelos como Nano Banana / Gemini / Imagen 3 puedan replicar fielmente esta estética exacta.

Desglosa minuciosamente los siguientes aspectos:
1. MEDIO Y TÉCNICA ARTÍSTICA: Fotografía cinematográfica de 35mm/70mm, render 3D en Unreal Engine 5 / Octane, pintura al óleo expresionista, acuarela sobre papel texturizado, ilustración digital en capas, etc.
2. ILUMINACIÓN Y ESQUEMA DE LUZ: Dirección de luz (key light, rim light, volumétrica de niebla, sombras claroscuro dramáticas, luces de neón cibernéticas, hora dorada), temperatura cromática en Kelvin, altas luces y penumbras.
3. ÓPTICA, CÁMARA Y TEXTURA DE SUPERFICIE: Lente exacta (ej. 85mm f/1.2, anamórfica cine, lente macro), profundidad de campo y calidad de bokeh, grano de película Kodak Portra / Fuji, microtextura de piel/materiales, reflejos especulares y porosidad.
4. PALETA CROMÁTICA Y GRADACIÓN DE COLOR: Tonos predominantes, grado de desaturación, contraste dinámico, tintado de sombras (ej. teal and orange, paleta desaturada vintage, tonos cian y magenta, vibrancia pastel).
5. MOOD, COMPOSICIÓN Y AMBIENTE: Encuadre, atmósfera, grano, polvo en el aire, acabado general.

EXIGENCIAS DE SALIDA:
- "stylePrompt": Debe ser un prompt en INGLÉS EXTREMADAMENTE DETALLADO Y COMPLETO (mínimo 100 a 250 palabras), redactado con vocabulario técnico profesional de fotografía y arte para IA. NO lo abrevies ni lo resumas.
- "negativeStylePrompt": Una lista detallada en INGLÉS de 15 a 30 términos a excluir para preservar este estilo.
- "description": Un resumen conciso y elegante de 1 o 2 frases en español explicando el acabado estético.

RESPONDE EXCLUSIVAMENTE CON EL SIGUIENTE ESTRUCTURA JSON VÁLIDA:
{
  "stylePrompt": "...",
  "negativeStylePrompt": "...",
  "description": "..."
}`;

  parts.push({ text: promptText });

  const visionModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (const modelName of visionModels) {
    const configsToTry = [
      { temperature: 0.3, maxOutputTokens: 2500, responseMimeType: 'application/json' },
      { temperature: 0.3, maxOutputTokens: 2500 }
    ];

    for (const genConfig of configsToTry) {
      try {
        const url = `${BASE_URL}/models/${modelName}:generateContent?key=${apiKey.trim()}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim()
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: genConfig
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawResponse) {
            const cleanJsonStr = rawResponse
              .replace(/^```json/gi, '')
              .replace(/^```/gi, '')
              .replace(/```$/gi, '')
              .trim();

            try {
              const parsed = JSON.parse(cleanJsonStr);
              return {
                stylePrompt: (parsed.stylePrompt || rawResponse).trim(),
                negativeStylePrompt: (parsed.negativeStylePrompt || '').trim(),
                description: (parsed.description || '').trim()
              };
            } catch {
              // Regex fallback for malformed JSON
              const styleMatch = cleanJsonStr.match(/"stylePrompt"\s*:\s*"([\s\S]*?)"\s*,\s*"negativeStylePrompt"/i);
              const negMatch = cleanJsonStr.match(/"negativeStylePrompt"\s*:\s*"([\s\S]*?)"\s*,\s*"description"/i);
              const descMatch = cleanJsonStr.match(/"description"\s*:\s*"([\s\S]*?)"/i);

              if (styleMatch && styleMatch[1]) {
                return {
                  stylePrompt: styleMatch[1].replace(/\\"/g, '"').trim(),
                  negativeStylePrompt: (negMatch?.[1] || '').replace(/\\"/g, '"').trim(),
                  description: (descMatch?.[1] || '').replace(/\\"/g, '"').trim()
                };
              }

              return {
                stylePrompt: rawResponse.trim(),
                negativeStylePrompt: 'low quality, blurry, distorted, overexposed, bad lighting',
                description: 'Estilo analizado mediante visión artificial'
              };
            }
          }
        } else {
          const errObj = await response.json().catch(() => ({}));
          lastError = errObj.error?.message || `HTTP ${response.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }
  }

  throw new Error(`Error al analizar el estilo visual: ${lastError || 'Sin respuesta del servicio.'}`);
}

// ─── IMAGE GENERATION ─────────────────────────────────────────────────

/**
 * Fetches a single image variant from the API.
 * Tries candidate models in order until one succeeds.
 */
async function fetchSingleImage(apiKey, config, variantIndex) {
  const {
    model = 'nano-banana-pro',
    prompt,
    stylePreset,
    styleIntensity = 'moderate',
    negativePrompt = '',
    aspectRatio = '16:9',
    effortLevel = 5,
    resolution = '4096x4096',
    outputFormat = 'image/png',
    dpi = 300,
    referenceImageBase64 = null,
    enableGrounding = true,
    seed = ''
  } = config;

  const {
    finalPromptText,
    negativePromptText,
    stylePresetUsed,
    styleIntensityUsed,
    styleReferences: builtStyleReferences
  } = buildImageGenerationRequest(prompt, stylePreset, { styleIntensity, negativePrompt, resolution, aspectRatio });

  const customStyleRefs = Array.isArray(config.styleReferences)
    ? config.styleReferences
    : config.styleReferenceBase64
    ? [{ url: config.styleReferenceBase64, altText: 'Estilo de Referencia' }]
    : [];

  const styleReferences = [...(builtStyleReferences || []), ...customStyleRefs];

  const candidateModels = MODEL_MAPPINGS[model] || FALLBACK_MODELS;

  const variantSeed = seed !== '' && seed !== null
    ? (parseInt(seed, 10) + variantIndex) % 2147483647
    : Math.floor(Math.random() * 2000000000);

  const imageSizeParam = getImageSizeParam(resolution);

  let lastError = null;

  for (const targetModel of candidateModels) {
    const { id: modelId, protocol } = targetModel;

    // ── PROTOCOL 1: generateContent (Gemini models) ──
    if (protocol === 'generateContent') {
      try {
        const parts = [{ text: finalPromptText }];

        // Subject reference images
        const subjectList = Array.isArray(referenceImageBase64)
          ? referenceImageBase64
          : referenceImageBase64 ? [referenceImageBase64] : [];

        subjectList.forEach((subImg) => {
          const parsed = parseImageDataUrl(subImg);
          if (parsed && parsed.data) {
            parts.push({ inlineData: { mimeType: parsed.mimeType || 'image/jpeg', data: parsed.data } });
          }
        });

        // Style reference images
        styleReferences.forEach((refItem) => {
          const parsed = parseImageDataUrl(refItem.url);
          if (parsed && parsed.data) {
            parts.push({ inlineData: { mimeType: parsed.mimeType || 'image/jpeg', data: parsed.data } });
          }
        });

        const url = `${BASE_URL}/models/${modelId}:generateContent?key=${apiKey.trim()}`;

        const payload = {
          contents: [{ parts }],
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio, imageSize: imageSizeParam }
          }
        };

        // Google Search Web Grounding
        if (enableGrounding) {
          payload.tools = [{ googleSearch: {} }];
        }

        // Thinking budget based on effort level
        if (effortLevel >= 4) {
          payload.generationConfig.thinkingConfig = { thinkingBudget: 2048 };
        } else if (effortLevel >= 3) {
          payload.generationConfig.thinkingConfig = { thinkingBudget: 1024 };
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const candidateParts = candidate?.content?.parts || [];

          // Extract grounding metadata
          const groundingMetadata = candidate?.groundingMetadata;
          const groundingQueries = groundingMetadata?.webSearchQueries || [];
          const groundingSources = groundingMetadata?.groundingChunks?.map((chunk) => ({
            title: chunk.web?.title || 'Fuente Web',
            uri: chunk.web?.uri || ''
          })) || [];

          let candidateText = '';

          for (const part of candidateParts) {
            const base64Bytes =
              part.inlineData?.data ||
              part.inlineData?.bytesBase64Encoded ||
              part.image?.bytesBase64Encoded ||
              part.b64;

            if (base64Bytes) {
              const mime = part.inlineData?.mimeType || outputFormat || 'image/png';
              return {
                id: generateImageId(variantIndex),
                dataUrl: `data:${mime};base64,${base64Bytes}`,
                createdAt: new Date().toISOString(),
                favorite: false,
                config: {
                  model: modelId,
                  requestedModel: model,
                  variantIndex,
                  originalPrompt: prompt,
                  prompt: finalPromptText,
                  negativePrompt: negativePromptText,
                  stylePresetId: stylePresetUsed?.id || null,
                  stylePresetName: stylePresetUsed?.name || null,
                  styleIntensity: styleIntensityUsed || null,
                  aspectRatio,
                  effortLevel,
                  resolution,
                  imageSize: imageSizeParam,
                  outputFormat: mime,
                  dpi,
                  enableGrounding: Boolean(enableGrounding),
                  groundingQueries,
                  groundingSources,
                  seed: variantSeed
                }
              };
            }

            if (part.text) candidateText += part.text + ' ';
          }

          const finishReason = candidate?.finishReason;
          lastError = candidateText.trim() || (finishReason ? `Model finish reason: ${finishReason}` : 'Respuesta sin datos de imagen.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    // ── PROTOCOL 2: predict (Imagen models) ──
    if (protocol === 'predict') {
      try {
        const instances = [{ prompt: finalPromptText }];

        const subjectList = Array.isArray(referenceImageBase64)
          ? referenceImageBase64
          : referenceImageBase64 ? [referenceImageBase64] : [];

        subjectList.forEach((subImg, idx) => {
          const parsed = parseImageDataUrl(subImg);
          if (parsed && parsed.data) {
            if (idx === 0) {
              instances[0].image = { bytesBase64Encoded: parsed.data };
            } else {
              instances.push({
                prompt: 'Imagen adicional de referencia para sujeto / personaje principal',
                image: { bytesBase64Encoded: parsed.data }
              });
            }
          }
        });

        styleReferences.forEach((refItem) => {
          const parsed = parseImageDataUrl(refItem.url);
          if (parsed && parsed.data) {
            instances.push({
              prompt: `Imagen de referencia para extraer estilo artístico: ${refItem.altText || 'Estilo'}`,
              image: { bytesBase64Encoded: parsed.data }
            });
          }
        });

        const guidanceScale = Math.min(Math.max(1.0, effortLevel * 2.5), 15.0);
        const url = `${BASE_URL}/models/${modelId}:predict?key=${apiKey.trim()}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
          body: JSON.stringify({
            instances,
            parameters: {
              sampleCount: 1,
              aspectRatio,
              outputMimeType: outputFormat,
              guidanceScale,
              seed: variantSeed
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const predictions = data.predictions || data.generatedImages || [];
          if (predictions.length > 0) {
            const firstPred = predictions[0];
            const base64Bytes = firstPred.bytesBase64Encoded || firstPred.image?.bytesBase64Encoded || firstPred.b64;
            if (base64Bytes) {
              const mime = outputFormat || 'image/png';
              return {
                id: generateImageId(variantIndex),
                dataUrl: `data:${mime};base64,${base64Bytes}`,
                createdAt: new Date().toISOString(),
                favorite: false,
                config: {
                  model: modelId,
                  requestedModel: model,
                  variantIndex,
                  originalPrompt: prompt,
                  prompt: finalPromptText,
                  negativePrompt: negativePromptText,
                  stylePresetId: stylePresetUsed?.id || null,
                  stylePresetName: stylePresetUsed?.name || null,
                  styleIntensity: styleIntensityUsed || null,
                  aspectRatio,
                  effortLevel,
                  resolution,
                  imageSize: imageSizeParam,
                  outputFormat: mime,
                  dpi,
                  seed: variantSeed,
                  guidanceScale
                }
              };
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }
  }

  throw new Error(`Error en variante #${variantIndex + 1}: ${lastError || 'No se pudo generar la imagen.'}`);
}

/**
 * Generates N images in parallel with style preset support.
 */
export async function generateImages(apiKey, config) {
  const { numberOfImages = 1, prompt } = config;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key no configurada. Agrega tu API Key en la barra superior.');
  }
  if (!prompt || !prompt.trim()) {
    throw new Error('El prompt no puede estar vacío.');
  }

  const targetCount = Math.min(Math.max(1, numberOfImages), 4);
  const promises = Array.from({ length: targetCount }).map((_, idx) =>
    fetchSingleImage(apiKey, config, idx)
  );

  const results = await Promise.allSettled(promises);
  const successfulImages = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  if (successfulImages.length === 0) {
    const firstError = results.find((r) => r.status === 'rejected')?.reason?.message;
    throw new Error(firstError || 'Fallo en la generación de imágenes.');
  }

  return successfulImages;
}

// ─── IMAGE EDITING ───────────────────────────────────────────────────

/**
 * Enhances an image editing instruction using Gemini 2.5 Flash, taking into account any localized area annotations and comments.
 */
export async function enhanceEditPrompt(apiKey, editInstruction, originalPrompt = '', annotations = []) {
  if (!apiKey) throw new Error('Se requiere una API Key para usar Magic Prompt.');

  const systemInstruction = `Eres un ingeniero maestro de edición de imágenes con IA multimodal (Gemini / Imagen).
Tu objetivo es transformar las instrucciones del usuario y sus anotaciones/comentarios en áreas específicas en una directiva clara, fotorrealista y precisa en inglés para modificar la imagen de entrada preservando la coherencia global y calidad 4K.
IMPORTANTE: Devuelve ÚNICAMENTE el texto final del prompt expandido en inglés, sin explicaciones ni comillas.`;

  let areaContext = '';
  if (Array.isArray(annotations) && annotations.length > 0) {
    areaContext = '\nÁreas anotadas con comentarios: ' + annotations
      .filter((a) => a && (a.comment?.trim() || a.label))
      .map((a, i) => `#${i + 1} (X:${Math.round(a.x)}%, Y:${Math.round(a.y)}%): "${a.comment || a.label}"`)
      .join('; ');
  }

  const fullUserContent = `Instrucción general: "${editInstruction || 'Aplica los cambios solicitados en las áreas marcadas'}".${areaContext}${originalPrompt ? ` Contexto de imagen original: "${originalPrompt}".` : ''}`;

  const url = `${BASE_URL}/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim()
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${fullUserContent}` }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 500 }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al expandir el prompt de edición.');
  }

  const data = await response.json();
  const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!enhancedText) throw new Error('No se recibió respuesta válida del optimizador de prompts.');

  return enhancedText.trim();
}

/**
 * Edits an image generating 1 to 4 variants in parallel, with optional localized area annotations and style reference image.
 *
 * @param {string} apiKey - User API key
 * @param {object} params - Edit parameters
 * @returns {Promise<Array<object>>} The newly generated edited image objects
 */
export async function editImage(apiKey, params) {
  const {
    sourceImage,
    editInstruction = '',
    annotations = [],
    numberOfImages = 1,
    styleReferenceBase64 = null,
    model = 'nano-banana-pro',
    aspectRatio,
    resolution,
    dpi = 300,
    effortLevel = 5,
    enableGrounding = true,
    seed = ''
  } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('API Key no configurada. Agrega tu API Key en la barra superior.');
  }

  const hasAnnotations = Array.isArray(annotations) && annotations.some((a) => a && (a.comment?.trim() || a.label));
  if (!editInstruction?.trim() && !hasAnnotations && !styleReferenceBase64) {
    throw new Error('Debes escribir una instrucción, marcar un área con comentario o adjuntar un estilo de referencia.');
  }

  const sourceDataUrl = typeof sourceImage === 'string' ? sourceImage : sourceImage?.dataUrl;
  if (!sourceDataUrl) {
    throw new Error('No se proporcionó la imagen base para editar.');
  }

  const originalPrompt = typeof sourceImage === 'object'
    ? (sourceImage?.config?.originalPrompt || sourceImage?.config?.prompt || '')
    : '';

  const finalAspectRatio = aspectRatio || sourceImage?.config?.aspectRatio || '16:9';
  const finalResolution = resolution || sourceImage?.config?.resolution || '4096x4096';
  const finalModel = model || sourceImage?.config?.model || 'nano-banana-pro';

  const editPromptText = buildImageEditPrompt(editInstruction, originalPrompt, {
    resolution: finalResolution,
    aspectRatio: finalAspectRatio,
    annotations,
    hasStyleReference: Boolean(styleReferenceBase64)
  });

  const styleReferences = styleReferenceBase64
    ? [{ url: styleReferenceBase64, altText: 'Estilo de Referencia Artístico' }]
    : [];

  const targetCount = Math.min(Math.max(1, parseInt(numberOfImages, 10) || 1), 4);

  const promises = Array.from({ length: targetCount }).map((_, variantIdx) => {
    const singleConfig = {
      model: finalModel,
      prompt: editPromptText,
      aspectRatio: finalAspectRatio,
      resolution: finalResolution,
      effortLevel: effortLevel || sourceImage?.config?.effortLevel || 5,
      dpi: dpi || sourceImage?.config?.dpi || 300,
      referenceImageBase64: [sourceDataUrl],
      styleReferences,
      enableGrounding,
      seed: seed !== '' ? seed : '',
      outputFormat: sourceImage?.config?.outputFormat || 'image/png'
    };

    return fetchSingleImage(apiKey, singleConfig, variantIdx).then((generatedImage) => {
      generatedImage.config.isEdited = true;
      generatedImage.config.parentImageId = sourceImage?.id || null;
      generatedImage.config.editInstruction = editInstruction?.trim() || '';
      generatedImage.config.annotations = annotations;
      generatedImage.config.hasStyleReference = Boolean(styleReferenceBase64);
      generatedImage.config.parentImageUrl = sourceDataUrl;
      return generatedImage;
    });
  });

  const results = await Promise.allSettled(promises);
  const successfulImages = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  if (successfulImages.length === 0) {
    const firstError = results.find((r) => r.status === 'rejected')?.reason?.message;
    throw new Error(firstError || 'Fallo en la edición de imágenes.');
  }

  return successfulImages;
}

/**
 * Upscales an image to 2K or 4K with AI super-resolution (or canvas enhancement).
 *
 * @param {string} apiKey - User API key
 * @param {object} params - Upscale parameters
 * @returns {Promise<object>} Newly generated high-resolution image object
 */
export async function upscaleImage(apiKey, params) {
  const {
    sourceImage,
    targetResolution = '4K',
    method = 'ai', // 'ai' | 'canvas'
    model = 'nano-banana-pro',
    aspectRatio,
    dpi = 300,
    effortLevel = 5,
    enableGrounding = true,
    seed = ''
  } = params;

  const sourceDataUrl = typeof sourceImage === 'string' ? sourceImage : sourceImage?.dataUrl;
  if (!sourceDataUrl) {
    throw new Error('No se proporcionó la imagen para reescalar.');
  }

  const finalResCode = (targetResolution === '4K' || targetResolution === '4096x4096') ? '4096x4096' : '2048x2048';
  const finalImageSize = (targetResolution === '4K' || targetResolution === '4096x4096') ? '4K' : '2K';

  // Method 1: Instant High-Precision Canvas Super-Resolution
  if (method === 'canvas' || !apiKey || !apiKey.trim()) {
    const upscaledDataUrl = await upscaleImageCanvas(sourceDataUrl, finalResCode);
    const newId = generateImageId(0);
    return {
      id: newId,
      dataUrl: upscaledDataUrl,
      favorite: false,
      createdAt: new Date().toISOString(),
      config: {
        ...(typeof sourceImage === 'object' ? sourceImage.config : {}),
        isUpscaled: true,
        upscaleMethod: 'canvas',
        imageSize: finalImageSize,
        resolution: finalResCode,
        dpi: 300,
        originalResolution: sourceImage?.config?.imageSize || '1024x1024',
        parentImageId: sourceImage?.id || null,
        parentImageUrl: sourceDataUrl
      }
    };
  }

  // Method 2: Multimodal Generative AI Super-Resolution
  const originalPrompt = typeof sourceImage === 'object'
    ? (sourceImage?.config?.originalPrompt || sourceImage?.config?.prompt || '')
    : '';

  const finalAspectRatio = aspectRatio || sourceImage?.config?.aspectRatio || '16:9';
  const finalModel = model || sourceImage?.config?.model || 'nano-banana-pro';

  const upscalePromptText = buildImageUpscalePrompt(finalResCode, originalPrompt, {
    aspectRatio: finalAspectRatio
  });

  const singleConfig = {
    model: finalModel,
    prompt: upscalePromptText,
    aspectRatio: finalAspectRatio,
    resolution: finalResCode,
    effortLevel: effortLevel || 5,
    dpi: dpi || 300,
    referenceImageBase64: [sourceDataUrl],
    enableGrounding,
    seed: seed !== '' ? seed : '',
    outputFormat: sourceImage?.config?.outputFormat || 'image/png'
  };

  const generatedImage = await fetchSingleImage(apiKey, singleConfig, 0);

  // Attach upscale metadata
  generatedImage.config.isUpscaled = true;
  generatedImage.config.upscaleMethod = 'ai';
  generatedImage.config.imageSize = finalImageSize;
  generatedImage.config.resolution = finalResCode;
  generatedImage.config.originalResolution = sourceImage?.config?.imageSize || '1024x1024';
  generatedImage.config.parentImageId = sourceImage?.id || null;
  generatedImage.config.parentImageUrl = sourceDataUrl;

  return generatedImage;
}


