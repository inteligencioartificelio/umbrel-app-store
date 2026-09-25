/**
 * Comprehensive API Capabilities Audit & Parameter Matrix Tester
 * Tests all models, methods, parameters, resolutions, aspect ratios, and MIME formats
 * directly on the user's Google AI Studio API Key.
 */

const API_KEY = process.env.GOOGLE_AI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function getJpegDimensions(buf) {
  let i = 0;
  if (buf[i] !== 0xFF || buf[i+1] !== 0xD8) return null;
  i += 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) break;
    const marker = buf[i+1];
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

function getPngDimensions(buf) {
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) return null;
  if (buf.length >= 24) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }
  return null;
}

function getImageInfo(base64Str, mimeType) {
  const buf = Buffer.from(base64Str, 'base64');
  const sizeKb = Math.round(buf.length / 1024);
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;

  let dims = null;
  if (isJpeg) dims = getJpegDimensions(buf);
  if (isPng) dims = getPngDimensions(buf);

  return {
    detectedFormat: isPng ? 'PNG' : isJpeg ? 'JPEG' : 'UNKNOWN',
    fileSizeBytes: buf.length,
    fileSizeKb: sizeKb,
    dimensions: dims ? `${dims.width}x${dims.height}` : 'N/A',
    width: dims?.width || null,
    height: dims?.height || null,
    megapixels: dims ? ((dims.width * dims.height) / 1000000).toFixed(2) + ' MP' : 'N/A'
  };
}

async function auditApi() {
  console.log('================================================================');
  console.log('🔬 AUDITORÍA INTEGRAL DE CAPACIDADES DE LA API (GOOGLE AI STUDIO)');
  console.log('================================================================\n');

  // STEP 1: List all accessible models
  console.log('--- 1. CONSULTANDO MODELOS DISPONIBLES EN LA CUENTA ---');
  try {
    const res = await fetch(`${BASE_URL}/models?key=${API_KEY}`);
    const data = await res.json();
    const allModels = data.models || [];
    console.log(`Total de modelos disponibles: ${allModels.length}`);
    const imageModels = allModels.filter(m => 
      m.name.includes('image') || 
      m.name.includes('imagen') || 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    console.log('\nModelos con soporte de Imagen / Generación identificados:');
    imageModels.forEach(m => {
      console.log(`  • ${m.name} | Métodos: [${(m.supportedGenerationMethods || []).join(', ')}] | InputLimit: ${m.inputTokenLimit || 'N/A'}`);
    });
  } catch (err) {
    console.error('Error al listar modelos:', err.message);
  }

  // STEP 2: Test Nano Banana Pro (gemini-3-pro-image) Resolutions Matrix
  console.log('\n--- 2. MATRIZ DE RESOLUCIONES & ASPECT RATIO (gemini-3-pro-image / Nano Banana Pro) ---');
  const testMatrix = [
    { ratio: '16:9', size: '4K', desc: '16:9 Panorámico 4K' },
    { ratio: '1:1', size: '4K', desc: '1:1 Cuadrado 4K' },
    { ratio: '9:16', size: '4K', desc: '9:16 Vertical 4K' },
    { ratio: '4:3', size: '4K', desc: '4:3 Fotografía 4K' },
    { ratio: '21:9', size: '4K', desc: '21:9 Cine 4K' },
    { ratio: '16:9', size: '2K', desc: '16:9 Panorámico 2K' },
    { ratio: '16:9', size: '1K', desc: '16:9 Panorámico 1K' }
  ];

  for (const item of testMatrix) {
    process.stdout.write(`Probando ${item.desc} (imageConfig: { aspectRatio: "${item.ratio}", imageSize: "${item.size}" })... `);
    try {
      const startTime = Date.now();
      const res = await fetch(`${BASE_URL}/models/gemini-3-pro-image:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `A futuristic neon cyberpunk architectural structure in ${item.ratio}` }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio: item.ratio,
              imageSize: item.size
            }
          }
        })
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const data = await res.json();

      if (res.status === 200) {
        const part = data.candidates?.[0]?.content?.parts?.[0];
        const b64 = part?.inlineData?.data || part?.bytesBase64Encoded;
        if (b64) {
          const info = getImageInfo(b64, part?.inlineData?.mimeType);
          console.log(`✅ HTTP 200 (${elapsed}s) -> ${info.dimensions} (${info.megapixels}, ${info.fileSizeKb} KB, Formato: ${info.detectedFormat})`);
        } else {
          console.log(`⚠️ HTTP 200 (${elapsed}s) -> Sin datos de imagen (finishReason: ${data.candidates?.[0]?.finishReason})`);
        }
      } else {
        console.log(`❌ HTTP ${res.status}: ${JSON.stringify(data.error || data)}`);
      }
    } catch (err) {
      console.log(`❌ Error de red: ${err.message}`);
    }
  }

  // STEP 3: Test Nano Banana 2 (gemini-3.1-flash-image)
  console.log('\n--- 3. TEST DE NANO BANANA 2 (gemini-3.1-flash-image / Ultra Rápido) ---');
  try {
    const startTime = Date.now();
    const res = await fetch(`${BASE_URL}/models/gemini-3.1-flash-image:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'A sleek minimal hypercar on a mountain road' }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '16:9',
            imageSize: '4K'
          }
        }
      })
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const data = await res.json();
    if (res.status === 200) {
      const part = data.candidates?.[0]?.content?.parts?.[0];
      const b64 = part?.inlineData?.data || part?.bytesBase64Encoded;
      if (b64) {
        const info = getImageInfo(b64, part?.inlineData?.mimeType);
        console.log(`✅ gemini-3.1-flash-image HTTP 200 (${elapsed}s) -> ${info.dimensions} (${info.megapixels}, ${info.fileSizeKb} KB)`);
      }
    } else {
      console.log(`❌ HTTP ${res.status}: ${JSON.stringify(data.error || data)}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // STEP 4: Test Supported Response MIME Types (PNG vs JPEG)
  console.log('\n--- 4. TEST DE FORMATOS DE SALIDA (responseMimeType: image/png vs image/jpeg) ---');
  const mimeTests = ['image/png', 'image/jpeg', 'image/webp'];
  for (const m of mimeTests) {
    process.stdout.write(`Probando generationConfig.responseMimeType = "${m}"... `);
    try {
      const res = await fetch(`${BASE_URL}/models/gemini-3-pro-image:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'A golden crystal sphere in void' }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            responseMimeType: m,
            imageConfig: { aspectRatio: '1:1', imageSize: '1K' }
          }
        })
      });
      const data = await res.json();
      if (res.status === 200) {
        const part = data.candidates?.[0]?.content?.parts?.[0];
        const b64 = part?.inlineData?.data;
        const info = b64 ? getImageInfo(b64) : null;
        console.log(`✅ Aceptado -> Devuelve MIME: ${part?.inlineData?.mimeType || 'N/A'}, Formato Real: ${info?.detectedFormat || 'N/A'}`);
      } else {
        console.log(`❌ Rechazado (HTTP ${res.status}): ${data.error?.message || 'Error'}`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  // STEP 5: Test Thinking Budget & Reasoning Configurations
  console.log('\n--- 5. TEST DE THINKING CONFIG (Presupuesto de Razonamiento Visual) ---');
  const thinkingBudgets = [0, 512, 1024, 2048];
  for (const tb of thinkingBudgets) {
    process.stdout.write(`Probando thinkingConfig = { thinkingBudget: ${tb} }... `);
    try {
      const res = await fetch(`${BASE_URL}/models/gemini-3-pro-image:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'A samurai under cherry blossoms, highly complex composition' }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            thinkingConfig: {
              thinkingBudget: tb
            },
            imageConfig: { aspectRatio: '1:1', imageSize: '1K' }
          }
        })
      });
      const data = await res.json();
      if (res.status === 200) {
        console.log(`✅ Aceptado HTTP 200 | Thought tokens: ${data.usageMetadata?.candidatesTokensDetails?.[0]?.modality || 'OK'}`);
      } else {
        console.log(`❌ HTTP ${res.status}: ${data.error?.message || 'Error'}`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  // STEP 6: Test Safety Settings (Block None, etc)
  console.log('\n--- 6. TEST DE POLÍTICAS DE SEGURIDAD (safetySettings) ---');
  try {
    const safetyPayload = [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ];

    const res = await fetch(`${BASE_URL}/models/gemini-3-pro-image:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'A warrior in armor standing atop a mountain' }] }],
        safetySettings: safetyPayload,
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '16:9', imageSize: '1K' }
        }
      })
    });
    const data = await res.json();
    console.log(`safetySettings BLOCK_NONE: ${res.status === 200 ? '✅ Aceptado HTTP 200' : '❌ ' + data.error?.message}`);
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('🎉 AUDITORÍA COMPLETA FINALIZADA CON ÉXITO');
  console.log('================================================================\n');
}

auditApi();
