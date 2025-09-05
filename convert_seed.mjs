import { readFileSync, writeFileSync, existsSync } from 'fs';

const t = (v) => (v ?? '').toString().trim();

// Baca dari tenun_seed.json kalau ada; kalau tidak, coba tenun_no_images.json
const srcPath = existsSync('./tenun_seed.json') ? './tenun_seed.json'
              : existsSync('./tenun_no_images.json') ? './tenun_no_images.json'
              : null;

if (!srcPath) {
  console.error('❌ Tidak menemukan tenun_seed.json atau tenun_no_images.json di root project.');
  process.exit(1);
}

const src = JSON.parse(readFileSync(srcPath, 'utf8'));
const arr = Array.isArray(src) ? src : [];

const out = arr.map(x => ({
  province:   t(x.provinsi ?? x.province),
  jenisTenun: t(x.namaTenun ?? x.jenisTenun),
  description: [
    t(x.penjelasanSingkat ?? x.description),
    t(x.motifCiriKhas) ? `Motif & Ciri Khas: ${t(x.motifCiriKhas)}` : '',
    t(x.funFact)       ? `Fakta Unik: ${t(x.funFact)}`             : '',
    t(x.kapanDipakai)  ? `Kapan dipakai: ${t(x.kapanDipakai)}`     : '',
  ].filter(Boolean).join('\n\n'),
})).filter(i => i.province && i.jenisTenun);

writeFileSync('./tenun_seed.json', JSON.stringify(out, null, 2));
console.log('✅ Converted rows =', out.length, '| Output -> tenun_seed.json');
