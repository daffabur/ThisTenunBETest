// prisma/seed_articles.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/* ==================== CONFIG ==================== */
// Lokasi file JSON (cek berurutan, ambil yang pertama ketemu)
const JSON_PATHS = [
  path.join(process.cwd(), 'article_seed.json'),   // root
  path.join(process.cwd(), 'prisma', 'article_seed.json'), // prisma/
  path.join(process.cwd(), 'data', 'article_seed.json'),   // data/ (opsional)
];

// Folder gambar artikel yang kamu pakai
const DEFAULT_IMAGE_DIR = '/public/images/artikel';
/* ================================================= */

const norm = (s = '') => String(s).trim();
const toSlug = (s = '') =>
  norm(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function readJson() {
  for (const p of JSON_PATHS) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      return { path: p, data: Array.isArray(data) ? data : [] };
    }
  }
  return { path: null, data: [] };
}

function normalizeTags(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(norm).filter(Boolean);
  return String(val)
    .split(/[,\|;]/)
    .map(norm)
    .filter(Boolean);
}

async function ensureUniqueSlug(base) {
  let slug = base || 'artikel';
  let i = 2;
  // cek sampai unik
  // (gunakan findUnique by slug — harus ada @unique di schema)
  for (;;) {
    const found = await prisma.article.findUnique({ where: { slug } });
    if (!found) return slug;
    slug = `${base}-${i++}`;
  }
}

async function main() {
  const { path: jsonPath, data } = readJson();
  if (!jsonPath) {
    console.error('❌ Tidak menemukan article_seed.json di lokasi kandidat:', JSON_PATHS);
    process.exit(1);
  }
  console.log(`📄 Memuat ${data.length} artikel dari ${path.basename(jsonPath)}`);

  for (const row of data) {
    const title = norm(row.title || '');
    if (!title) continue;

    const summary = norm(row.summary || '');
    const content = norm(row.content || '');

    // Terima beberapa kemungkinan nama field gambar:
    // - imageFile (sesuai file kamu)
    // - image / image_url / imageUrl
    let img =
      row.imageFile ||
      row.image ||
      row.image_url ||
      row.imageUrl ||
      '';

    // Kalau img bukan URL absolut dan bukan path /public/**,
    // treat sebagai nama file di /public/images/artikel
    let imageUrl = norm(img);
    if (imageUrl && !/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith('/public/')) {
      imageUrl = `${DEFAULT_IMAGE_DIR}/${imageUrl}`.replace(/\/{2,}/g, '/');
    }

    // tags opsional
    const tags = normalizeTags(row.tags || []);

    // bikin slug dari judul dan pastikan unik
    const baseSlug = toSlug(title);
    const slug = await ensureUniqueSlug(baseSlug);

    // Upsert ke tabel Article
    // ⚠️ HANYA field yang ada di schema: slug, title, summary?, content?, imageUrl?, tags?
    await prisma.article.upsert({
      where: { slug },
      update: {
        title,
        summary: summary || null,
        content: content || null,
        imageUrl: imageUrl || null,
        tags,
      },
      create: {
        slug,
        title,
        summary: summary || null,
        content: content || null,
        imageUrl: imageUrl || null,
        tags,
      },
    });

    console.log('✓ upsert:', slug);
  }

  console.log('✅ Seeding Article selesai.');
}

main()
  .catch((e) => {
    console.error('❌ Seed Article error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
