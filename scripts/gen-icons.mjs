// Genererer PNG-ikoner fra SVG-kildene (kjør: node scripts/gen-icons.mjs).
// Brukes for PWA-manifest + iOS apple-touch-icon. PNG-ene sjekkes inn.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");

const jobs = [
  { src: "logo.svg", out: "icon-192.png", size: 192 },
  { src: "logo.svg", out: "icon-512.png", size: 512 },
  { src: "logo.svg", out: "apple-touch-icon.png", size: 180 },
  { src: "logo-maskable.svg", out: "icon-maskable-512.png", size: 512 },
];

for (const j of jobs) {
  await sharp(join(pub, j.src))
    .resize(j.size, j.size)
    .png()
    .toFile(join(pub, j.out));
  console.log(`✓ ${j.out} (${j.size}px)`);
}
console.log("Ferdig.");
