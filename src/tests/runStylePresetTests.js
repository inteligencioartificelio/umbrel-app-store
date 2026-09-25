import assert from 'assert';
import { validateStylePreset } from '../services/database.js';
import { buildImageGenerationRequest } from '../services/promptBuilder.js';

console.log('🧪 Iniciando ejecutor de pruebas de Estilos Visuales (Style Presets)...');

const samplePreset = {
  id: 'test-cyber-1',
  name: 'Cyberpunk Neon Studio',
  slug: 'cyberpunk-neon-studio',
  description: 'Neones cian y magenta',
  stylePrompt: 'Cinematic cyberpunk atmosphere, neon cyan and vivid magenta lighting',
  negativeStylePrompt: 'harsh daylight, pastel colors',
  referenceImages: [
    { id: 'ref_1', url: 'data:image/svg+xml;utf8,<svg></svg>', mimeType: 'image/svg+xml', order: 1, altText: 'Ref' }
  ]
};

// 1. Validaciones
const errs1 = validateStylePreset({});
assert(errs1.includes('El nombre del estilo es obligatorio.'), 'Test 1 Falló');

const errs2 = validateStylePreset({ name: 'Solo Nombre' });
assert(errs2.includes('El prompt de instrucciones del estilo es obligatorio.'), 'Test 2 Falló');

console.log('✓ Test 1 & 2: Validaciones de campos obligatorios superadas.');

// 3. Generación sin estilo ("Sin estilo")
const reqNoStyle = buildImageGenerationRequest('Un samurai en el bosque', null);
assert.strictEqual(reqNoStyle.finalPromptText, 'Un samurai en el bosque');
assert.strictEqual(reqNoStyle.stylePresetUsed, null);
assert.strictEqual(reqNoStyle.styleReferences.length, 0);
console.log('✓ Test 3: Generación sin estilo ("Sin estilo") superada.');

// 4. Intensidad Sutil
const reqSubtle = buildImageGenerationRequest('Un samurai en el bosque', samplePreset, { styleIntensity: 'subtle' });
assert(reqSubtle.finalPromptText.includes('Aplica el estilo de forma ligera'), 'Test 4 Falló');
assert.strictEqual(reqSubtle.styleIntensityUsed, 'subtle');
console.log('✓ Test 4: Intensidad Sutil superada.');

// 5. Intensidad Moderada
const reqModerate = buildImageGenerationRequest('Un samurai en el bosque', samplePreset, { styleIntensity: 'moderate' });
assert(reqModerate.finalPromptText.includes('Aplica claramente la paleta'), 'Test 5 Falló');
assert.strictEqual(reqModerate.styleIntensityUsed, 'moderate');
console.log('✓ Test 5: Intensidad Moderada superada.');

// 6. Intensidad Intensa
const reqIntense = buildImageGenerationRequest('Un samurai en el bosque', samplePreset, { styleIntensity: 'intense' });
assert(reqIntense.finalPromptText.includes('Aplica de forma marcada la estética visual'), 'Test 6 Falló');
assert.strictEqual(reqIntense.styleIntensityUsed, 'intense');
console.log('✓ Test 6: Intensidad Intensa superada.');

// 7. Combinación de Prompts Negativos
const reqNeg = buildImageGenerationRequest('Retrato', samplePreset, {
  styleIntensity: 'moderate',
  negativePrompt: 'blur, noise'
});
assert(reqNeg.negativePromptText.includes('harsh daylight'), 'Test 7 Falló');
assert(reqNeg.negativePromptText.includes('blur, noise'), 'Test 7 Falló');
console.log('✓ Test 7: Combinación de Exclusiones (Negative Prompts) superada.');

console.log('🎉 ¡Todas las 7 pruebas unitarias de Estilos Visuales completadas con ÉXITO!');
