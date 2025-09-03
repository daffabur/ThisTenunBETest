// prisma/seed.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // baca seed file (tanpa imageUrl)
  const raw = fs.readFileSync(path.join(process.cwd(), 'tenun_seed.json'), 'utf-8');
  const items = JSON.parse(raw); // [{ province, jenisTenun, description }]

  // buat provinsi unik
  const provinces = [...new Set(items.map(i => i.province.trim()))];
  for (const name of provinces) {
    await prisma.province.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // isi tabel Tenun
  for (const row of items) {
    const prov = await prisma.province.findUnique({
      where: { name: row.province.trim() }
    });
    if (!prov) continue;

    // gunakan compound unique [provinceId, jenisTenun]
    await prisma.tenun.upsert({
      where: {
        provinceId_jenisTenun: {
          provinceId: prov.id,
          jenisTenun: row.jenisTenun.trim(),
        },
      },
      update: {
        description: row.description, // bisa diupdate jika ada perubahan
      },
      create: {
        jenisTenun: row.jenisTenun.trim(),
        description: row.description,
        provinceId: prov.id,
      },
    });
  }

  console.log('✅ Seeding selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
