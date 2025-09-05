import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const t = v => String(v ?? '').trim();

function readFromSeed(p) {
  const src = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return (src||[]).map(it => ({
    province: t(it.province),
    jenisTenun: t(it.jenisTenun),
    description: t(it.description),
  })).filter(it => it.province && it.jenisTenun);
}
function readFromNoImages(p) {
  const src = JSON.parse(fs.readFileSync(p, 'utf-8'));
  return (src||[]).map(x => {
    const parts = [];
    if (t(x.penjelasanSingkat)) parts.push(t(x.penjelasanSingkat));
    if (t(x.motifCiriKhas))     parts.push(`Motif & Ciri Khas: ${t(x.motifCiriKhas)}`);
    if (t(x.funFact))           parts.push(`Fakta Unik: ${t(x.funFact)}`);
    if (t(x.kapanDipakai))      parts.push(`Kapan dipakai: ${t(x.kapanDipakai)}`);
    return {
      province: t(x.provinsi),
      jenisTenun: t(x.namaTenun),
      description: parts.join('\n\n'),
    };
  }).filter(it => it.province && it.jenisTenun);
}
function loadItems() {
  const root = process.cwd();
  const seedPath = path.join(root, 'tenun_seed.json');
  const noImgPath = path.join(root, 'tenun_no_images.json');

  if (fs.existsSync(seedPath)) {
    const items = readFromSeed(seedPath);
    console.log(`📄 Menemukan tenun_seed.json (rows: ${items.length})`);
    if (items.length > 0) return items;
    console.warn('⚠️  tenun_seed.json kosong/format salah, fallback ke tenun_no_images.json');
  }
  if (fs.existsSync(noImgPath)) {
    const items = readFromNoImages(noImgPath);
    console.log(`📄 Menemukan tenun_no_images.json (rows: ${items.length})`);
    if (items.length > 0) return items;
  }
  throw new Error('Tidak ada data valid.');
}

async function main() {
  const raw = loadItems();

  // Dedupe
  const seen = new Set(); const items = [];
  for (const it of raw) {
    const k = `${it.province.toLowerCase()}|${it.jenisTenun.toLowerCase()}`;
    if (!seen.has(k)) { seen.add(k); items.push(it); }
  }
  if (items.length === 0) throw new Error('Data hasil parsing = 0. Abort.');

  // REPLACE mode
  await prisma.tenun.deleteMany({});
  const keepProvinces = [...new Set(items.map(i => i.province))];
  await prisma.province.deleteMany({ where: { name: { notIn: keepProvinces } } });
  for (const name of keepProvinces) {
    await prisma.province.upsert({ where: { name }, update: {}, create: { name } });
  }
  let inserted = 0;
  for (const row of items) {
    const prov = await prisma.province.findUnique({ where: { name: row.province } });
    if (!prov) continue;
    await prisma.tenun.create({
      data: { jenisTenun: row.jenisTenun, description: row.description || '', provinceId: prov.id },
    });
    inserted++;
  }
  console.log(`✅ Seeding selesai! Tenun terisi: ${inserted}`);
}

main().catch(e => (console.error('❌ Seed error:', e), process.exit(1)))
      .finally(() => prisma.$disconnect());
