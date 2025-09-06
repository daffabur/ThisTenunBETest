import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

/* --------------------------- App Middleware --------------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: '*' }));

// Serve static files: /public/** -> ./public/**
app.use('/public', express.static(path.join(process.cwd(), 'public')));

/* ----------------------- Helper: image key & file --------------------- */
const PROVINCE_IMAGE_KEY = {
  'nanggroe aceh darussalam': 'aceh', aceh: 'aceh',
  'sumatra utara': 'sumut', 'sumatera utara': 'sumut',
  'sumatra selatan': 'sumsel', 'sumatera selatan': 'sumsel',
  'sumatra barat': 'sumbar', 'sumatera barat': 'sumbar',
  riau: 'riau', 'kepulauan riau': 'kepri', jambi: 'jambi', bengkulu: 'bengkulu',
  'bangka belitung': 'babel', 'kepulauan bangka belitung': 'babel',
  lampung: 'lampung',
  'dki jakarta': 'jakarta', jakarta: 'jakarta',
  'jawa barat': 'jabar', 'jawa tengah': 'jateng', 'jawa timur': 'jatim', banten: 'banten',
  'daerah istimewa yogyakarta': 'yogyakarta', 'diy yogyakarta': 'yogyakarta', yogyakarta: 'yogyakarta',
  bali: 'bali',
  'nusa tenggara barat': 'ntb', 'nusa tenggara timur': 'ntt',
  'kalimantan barat': 'kalbar', 'kalimantan tengah': 'kalteng',
  'kalimantan timur': 'kaltim', 'kalimantan selatan': 'kalsel', 'kalimantan utara': 'kalut',
  gorontalo: 'gorontalo',
  'sulawesi barat': 'sulbar', 'sulawesi selatan': 'sulsel',
  'sulawesi tengah': 'sulteng', 'sulawesi tenggara': 'sultra', 'sulawesi utara': 'sulut',
  maluku: 'maluku', 'maluku utara': 'malut',
  papua: 'papua', 'papua barat': 'papuabarat',
};

const norm = (s = '') => String(s).toLowerCase().trim().replace(/\s+/g, ' ');
const slug = (s = '') =>
  norm(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const imageKey = (provinceName = '') => {
  const n = norm(provinceName);
  return PROVINCE_IMAGE_KEY[n] || slug(n);
};

const pickExisting = (folder, prefix, key) => {
  const exts = ['.jpg', '.jpeg', '.png', '.webp'];
  for (const ext of exts) {
    const rel = path.join('public', 'images', folder, `${prefix}-${key}${ext}`);
    const abs = path.join(process.cwd(), rel);
    if (fs.existsSync(abs)) return '/' + rel.replace(/\\/g, '/');
  }
  return null;
};

const withImages = (row) => {
  const key = imageKey(row?.province?.name || '');
  // Prioritas: imageUrl dari DB (kalau kamu isi nanti), kalau kosong pakai auto scan
  const tenunAuto = pickExisting('tenun', 'tenun', key);
  const pemakaianAuto = pickExisting('pemakaian', 'pemakaian', key);

  return {
    ...row,
    tenunImageUrl: row.imageUrl || tenunAuto || null,
    pemakaianImageUrl: pemakaianAuto || null,
  };
};

/* ------------------------------- Routes ------------------------------- */
app.get('/', (_req, res) => res.send('Hello World, Outfit Santara API!'));
app.get('/health', (_req, res) => res.json({ ok: true }));

// Provinces
app.get('/api/provinces', async (_req, res) => {
  try {
    const provinces = await prisma.province.findMany({ orderBy: { name: 'asc' } });
    res.json(provinces);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch provinces' });
  }
});

app.post('/api/provinces', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name wajib diisi' });
    }
    const province = await prisma.province.create({ data: { name: String(name).trim() } });
    res.status(201).json(province);
  } catch (e) {
    console.error(e);
    // Unique name
    if (e?.code === 'P2002') return res.status(409).json({ error: 'province sudah ada' });
    res.status(500).json({ error: 'Failed to create province' });
  }
});

// Tenun (list)
app.get('/api/tenun', async (req, res) => {
  try {
    const { province } = req.query;
    const where = province ? { province: { name: String(province) } } : {};

    const items = await prisma.tenun.findMany({
      where,
      include: { province: true },
      orderBy: [{ province: { name: 'asc' } }, { jenisTenun: 'asc' }],
    });

    res.json(items.map(withImages));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch tenun' });
  }
});

// Tenun (create)
app.post('/api/tenun', async (req, res) => {
  try {
    const { jenisTenun, description = '', imageUrl, provinceName } = req.body || {};
    if (!jenisTenun || !provinceName) {
      return res.status(400).json({ error: 'jenisTenun dan provinceName wajib diisi' });
    }

    const province = await prisma.province.findUnique({ where: { name: String(provinceName) } });
    if (!province) return res.status(404).json({ error: 'Province not found' });

    const item = await prisma.tenun.create({
      data: {
        jenisTenun: String(jenisTenun).trim(),
        description: String(description || ''),
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        provinceId: province.id,
      },
      include: { province: true },
    });

    res.status(201).json(withImages(item));
  } catch (e) {
    console.error(e);
    // Unique (provinceId, jenisTenun)
    if (e?.code === 'P2002') return res.status(409).json({ error: 'jenisTenun sudah ada di provinsi ini' });
    res.status(500).json({ error: 'Failed to create tenun' });
  }
});

/* ------------------- Aliases: outfits -> tenun (read/create) ---------- */
// GET outfits (alias tenun)
app.get('/api/outfits', async (req, res) => {
  try {
    const { province } = req.query;
    const where = province ? { province: { name: String(province) } } : {};

    const tenun = await prisma.tenun.findMany({
      where,
      include: { province: true },
      orderBy: [{ province: { name: 'asc' } }, { jenisTenun: 'asc' }],
    });

    res.json(
      tenun.map(t =>
        withImages({
          ...t,
          name: t.jenisTenun, // biar FE lama tetap jalan
        }),
      ),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch outfits' });
  }
});

// POST outfits (alias: buat Tenun)
app.post('/api/outfits', async (req, res) => {
  try {
    const { name, description = '', imageUrl, provinceName } = req.body || {};
    if (!name || !provinceName) {
      return res.status(400).json({ error: 'name dan provinceName wajib diisi' });
    }

    const province = await prisma.province.findUnique({ where: { name: String(provinceName) } });
    if (!province) return res.status(404).json({ error: 'Province not found' });

    const t = await prisma.tenun.create({
      data: {
        jenisTenun: String(name).trim(),
        description: String(description || ''),
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        provinceId: province.id,
      },
      include: { province: true },
    });

    res.status(201).json(withImages({ ...t, name: t.jenisTenun }));
  } catch (e) {
    console.error(e);
    if (e?.code === 'P2002') return res.status(409).json({ error: 'outfit/tenun sudah ada di provinsi ini' });
    res.status(500).json({ error: 'Failed to create outfit' });
  }
});

/* --------------------------- Outfit Inspo APIs ------------------------ */
/**
 * NOTE:
 * - Tabel: OutfitInspo (model sudah kamu buat di schema.prisma)
 * - Field penting: slug (unique), title, imageUrl, (opsional) credit, sourceUrl, gender, tags[]
 */

// List + filter + pagination
app.get('/api/inspo', async (req, res) => {
  try {
    const { q, gender, limit, offset, order } = req.query;

    const where = {};
    if (q) {
      const term = String(q);
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { credit: { contains: term, mode: 'insensitive' } },
        // cari di tags
        { tags: { hasSome: term.split(',').map(s => s.trim()).filter(Boolean) } },
      ];
    }
    if (gender) {
      where.gender = String(gender).toUpperCase(); // MEN/WOMEN/UNISEX
    }

    const items = await prisma.outfitInspo.findMany({
      where,
      orderBy: { createdAt: String(order).toLowerCase() === 'asc' ? 'asc' : 'desc' },
      take: limit ? Number(limit) : undefined,
      skip: offset ? Number(offset) : undefined,
    });

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch outfit inspo' });
  }
});

// Random pick (default 6)
app.get('/api/inspo/random', async (req, res) => {
  try {
    const size = Math.max(1, Math.min(50, Number(req.query.limit) || 6));
    const count = await prisma.outfitInspo.count();
    if (!count) return res.json([]);

    // ambil window acak biar ringan
    const maxStart = Math.max(0, count - size);
    const skip = Math.floor(Math.random() * (maxStart + 1));

    const items = await prisma.outfitInspo.findMany({
      take: size,
      skip,
      orderBy: { id: 'asc' },
    });

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch random inspo' });
  }
});

// Detail by slug
app.get('/api/inspo/:slug', async (req, res) => {
  try {
    const item = await prisma.outfitInspo.findUnique({
      where: { slug: String(req.params.slug) },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch inspo' });
  }
});

// Create inspo
app.post('/api/inspo', async (req, res) => {
  try {
    const { title, imageUrl, credit, sourceUrl, gender, tags } = req.body || {};
    if (!title || !imageUrl) {
      return res.status(400).json({ error: 'title dan imageUrl wajib diisi' });
    }
    const parsedTags = Array.isArray(tags)
      ? tags
      : String(tags || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

    const data = {
      slug: slug(title),
      title: String(title).trim(),
      imageUrl: String(imageUrl).trim(),
      credit: credit ? String(credit).trim() : null,
      sourceUrl: sourceUrl ? String(sourceUrl).trim() : null,
      gender: gender ? String(gender).toUpperCase() : null, // MEN/WOMEN/UNISEX
      tags: parsedTags,
    };

    const created = await prisma.outfitInspo.create({ data });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'slug sudah dipakai' });
    }
    res.status(500).json({ error: 'Failed to create inspo' });
  }
});

// Update by slug
app.put('/api/inspo/:slug', async (req, res) => {
  try {
    const { title, imageUrl, credit, sourceUrl, gender, tags } = req.body || {};
    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
        ? tags.split(',').map(s => s.trim()).filter(Boolean)
        : undefined;

    const updated = await prisma.outfitInspo.update({
      where: { slug: String(req.params.slug) },
      data: {
        ...(title != null ? { title: String(title).trim() } : {}),
        ...(imageUrl != null ? { imageUrl: String(imageUrl).trim() } : {}),
        ...(credit !== undefined ? { credit: credit ? String(credit).trim() : null } : {}),
        ...(sourceUrl !== undefined ? { sourceUrl: sourceUrl ? String(sourceUrl).trim() : null } : {}),
        ...(gender !== undefined ? { gender: gender ? String(gender).toUpperCase() : null } : {}),
        ...(parsedTags !== undefined ? { tags: parsedTags } : {}),
      },
    });

    res.json(updated);
  } catch (e) {
    console.error(e);
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Failed to update inspo' });
  }
});

// Delete by slug
app.delete('/api/inspo/:slug', async (req, res) => {
  try {
    await prisma.outfitInspo.delete({ where: { slug: String(req.params.slug) } });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: 'Failed to delete inspo' });
  }
});

/* ----------------------------- Error Trap ----------------------------- */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ------------------------------ Start App ----------------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
