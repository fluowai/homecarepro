const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [192, 512];
const outDir = path.join(__dirname, 'public');

async function generateIcons() {
  for (const size of sizes) {
    // Regular icon
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <rect width="256" height="256" rx="48" fill="#16a34a"/>
        <path d="M128 48a80 80 0 1 0 0 160 80 80 0 0 0 0-160z" fill="#ffffff" fill-opacity="0.2"/>
        <path d="M128 72a56 56 0 1 1 0 112 56 56 56 0 0 1 0-112z" fill="#ffffff"/>
        <path d="M100 128c0-15.5 12.5-28 28-28s28 12.5 28 28-12.5 28-28 28-28-12.5-28-28z" fill="#16a34a" fill-opacity="0.8"/>
      </svg>
    `;
    const pngBuffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    fs.writeFileSync(path.join(outDir, `pwa-${size}x${size}.png`), pngBuffer);
    console.log(`Created pwa-${size}x${size}.png`);

    // Maskable icon
    const svgMask = `
      <svg width="${size}" height="${size}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <rect width="256" height="256" rx="90" fill="#16a34a"/>
        <path d="M128 48a80 80 0 1 0 0 160 80 80 0 0 0 0-160z" fill="#ffffff" fill-opacity="0.2"/>
        <path d="M128 72a56 56 0 1 1 0 112 56 56 56 0 0 1 0-112z" fill="#ffffff"/>
        <path d="M100 128c0-15.5 12.5-28 28-28s28 12.5 28 28-12.5 28-28 28-28-12.5-28-28z" fill="#16a34a" fill-opacity="0.8"/>
      </svg>
    `;
    const pngMaskBuffer = await sharp(Buffer.from(svgMask)).resize(size, size).png().toBuffer();
    fs.writeFileSync(path.join(outDir, `pwa-maskable-${size}x${size}.png`), pngMaskBuffer);
    console.log(`Created pwa-maskable-${size}x${size}.png`);
  }
}

generateIcons().catch(console.error);
