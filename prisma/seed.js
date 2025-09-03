import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const raw = fs.readFileSync('./outfits_seed.json', 'utf-8');
  const items = JSON.parse(raw); // [{ province, outfit }]

  // Pastikan provinsi ada dulu
  const provinces = [...new Set(items.map(i => i.province))];
  for (const name of provinces) {
    await prisma.province.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Isi outfit per provinsi
  for (const row of items) {
    const province = await prisma.province.findUnique({
      where: { name: row.province }
    });
    if (!province) continue;

    // insert outfit unik per provinsi
    await prisma.outfit.upsert({
      where: {
        name_provinceId: {
          name: row.outfit,
          provinceId: province.id,
        }
      },
      update: {},
      create: {
        name: row.outfit,
        provinceId: province.id,
      }
    });
  }

  console.log('✅ Seeding selesai!');
}

main().finally(async () => await prisma.$disconnect());
