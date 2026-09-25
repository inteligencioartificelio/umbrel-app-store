import assert from 'node:assert';
import { detectImageFormat, base64ToBlob } from '../services/imageDownloader.js';

console.log('🧪 Iniciando pruebas de descarga y conversión de imágenes...');

// Test 1: PNG format detection
const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pngInfo = detectImageFormat(pngDataUrl);
assert.strictEqual(pngInfo.ext, 'png', 'Extensión debe ser png');
assert.strictEqual(pngInfo.mimeType, 'image/png', 'MIME debe ser image/png');
console.log('✓ Test 1: Detección de formato PNG superada.');

// Test 2: JPEG format detection
const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const jpegInfo = detectImageFormat(jpegDataUrl);
assert.strictEqual(jpegInfo.ext, 'jpg', 'Extensión debe ser jpg');
assert.strictEqual(jpegInfo.mimeType, 'image/jpeg', 'MIME debe ser image/jpeg');
console.log('✓ Test 2: Detección de formato JPEG superada.');

// Test 3: WebP format detection
const webpDataUrl = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
const webpInfo = detectImageFormat(webpDataUrl);
assert.strictEqual(webpInfo.ext, 'webp', 'Extensión debe ser webp');
assert.strictEqual(webpInfo.mimeType, 'image/webp', 'MIME debe ser image/webp');
console.log('✓ Test 3: Detección de formato WebP superada.');

// Test 4: Base64 to Blob conversion
const blob = base64ToBlob(pngDataUrl);
assert.ok(blob, 'El Blob debe existir');
assert.strictEqual(blob.type, 'image/png', 'El Blob debe tener type image/png');
assert.ok(blob.size > 0, 'El Blob debe tener tamaño binario mayor a 0 bytes');
console.log('✓ Test 4: Conversión segura a Blob binario superada.');

console.log('🎉 ¡Todas las pruebas de imageDownloader completadas con ÉXITO!');
