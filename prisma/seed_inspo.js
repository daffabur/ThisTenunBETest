// prisma/seed_inspo.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'inspo');

function toTitle(s) {
  return s.replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
}

async function main() {
  const files = fs.readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f));

  console.log(`📦 Found ${files.length} images in /public/images/inspo`);

  for (const f of files) {
    const base = path.parse(f).name;       // contoh: "inspo-1"
    const slug = base.toLowerCase();       // wajib unique
    const title = toTitle(base);           // "Inspo 1"
    const imageUrl = `/public/images/inspo/${f}`;

    await prisma.outfitInspo.upsert({
      where: { slug },                     // ← sekarang valid karena @unique
      update: { title, imageUrl },
      create: { slug, title, imageUrl }
    });
  }

  console.log('✅ Seed inspo selesai.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error('❌ Seed error:', err);
    prisma.$disconnect().finally(() => process.exit(1));
  });
