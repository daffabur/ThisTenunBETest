import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// ✅ aktifkan CORS supaya API bisa diakses dari frontend React
app.use(cors({ origin: '*' }));

// Tes
app.get('/', (req, res) => {
  res.send('Hello World, Outfit Santara API!');
});

// Ambil semua province
app.get('/api/provinces', async (req, res) => {
  const provinces = await prisma.province.findMany();
  res.json(provinces);
});

// Tambah province baru
app.post('/api/provinces', async (req, res) => {
  const { name } = req.body;
  const province = await prisma.province.create({
    data: { name },
  });
  res.status(201).json(province);
});

// Ambil semua outfit (bisa difilter by province name)
app.get('/api/outfits', async (req, res) => {
  const { province } = req.query; // contoh: /api/outfits?province=Jawa%20Barat
  const where = province ? { province: { name: province } } : {};

  const outfits = await prisma.outfit.findMany({
    where,
    include: { province: true },
    orderBy: [{ provinceId: 'asc' }, { name: 'asc' }]
  });

  res.json(outfits);
});

// ✅ Tambah outfit baru (POST)
app.post('/api/outfits', async (req, res) => {
  const { name, provinceName } = req.body;

  const province = await prisma.province.findUnique({
    where: { name: provinceName }
  });

  if (!province) {
    return res.status(404).json({ error: 'Province not found' });
  }

  const outfit = await prisma.outfit.create({
    data: {
      name,
      provinceId: province.id,
    },
  });

  res.status(201).json(outfit);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
