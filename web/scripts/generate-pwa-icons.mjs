/**
 * Script para gerar ícones PWA a partir do logo existente.
 * Usa Jimp (já instalado no projeto).
 *
 * Gera: 192x192 e 512x512 (normal + maskable)
 */

import Jimp from 'jimp';
import path from 'path';
import fs from 'fs';

const SOURCE = path.resolve('./public/logo-sd.png');
const OUTPUT_DIR = path.resolve('./public/icons');

// Garante que o diretório de saída existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateIcons() {
  console.log('📱 Generating PWA icons from:', SOURCE);

  const image = await Jimp.read(SOURCE);

  // ─── Normal icons (full bleed) ────────────────────────────────
  const sizes = [192, 512];

  for (const size of sizes) {
    const resized = image.clone().cover(size, size);
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await resized.writeAsync(outputPath);
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  }

  // ─── Maskable icons (with safe zone padding) ──────────────────
  // Maskable icons need ~10% padding on each side (80% safe area)
  for (const size of sizes) {
    const canvas = new Jimp(size, size, 0x0d0f0dFF); // dark background
    const innerSize = Math.round(size * 0.7);
    const logoResized = image.clone().contain(innerSize, innerSize);
    const offset = Math.round((size - innerSize) / 2);
    canvas.composite(logoResized, offset, offset);
    const outputPath = path.join(OUTPUT_DIR, `icon-maskable-${size}x${size}.png`);
    await canvas.writeAsync(outputPath);
    console.log(`✅ Generated: icon-maskable-${size}x${size}.png`);
  }

  console.log('\n🎉 All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
