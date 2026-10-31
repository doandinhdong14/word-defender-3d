import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsxModule from 'xlsx';

const XLSX = xlsxModule.default || xlsxModule;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localExcel = path.resolve(__dirname, '../3000_tu_vung_co_ban_Pempom.xlsx');
const parentExcel = path.resolve(__dirname, '../../3000_tu_vung_co_ban_Pempom.xlsx');
const excelPath = fs.existsSync(localExcel) ? localExcel : parentExcel;
if (!fs.existsSync(excelPath)) {
  console.error('File not found:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawRows = XLSX.utils.sheet_to_json(sheet);

console.log(`Loaded ${rawRows.length} rows from sheet "${sheetName}".`);

const b1 = 0;
const b2 = rawRows.findIndex(r => (r.english || '').trim().toLowerCase() === 'ability');
const b3 = rawRows.findIndex((r, i) => i > b2 && (r.english || '').trim().toLowerCase() === 'absolutely');
const b4 = rawRows.findIndex((r, i) => i > b3 && (r.english || '').trim().toLowerCase() === 'abandon');

const levelDefs = [
  {
    setId: 'set_oxford_a1',
    varName: 'OXFORD_A1_WORDS',
    fileName: 'oxfordA1Words.ts',
    prefix: 'word_a1',
    title: 'Oxford 3000 - Căn Bản (A1)',
    description: 'Từ vựng tiếng Anh trình độ A1 cơ bản nhất giúp bắt đầu làm quen và giao tiếp hàng ngày.',
    start: b1,
    end: b2,
    difficultyDefault: 1,
  },
  {
    setId: 'set_oxford_a2',
    varName: 'OXFORD_A2_WORDS',
    fileName: 'oxfordA2Words.ts',
    prefix: 'word_a2',
    title: 'Oxford 3000 - Sơ Cấp (A2)',
    description: 'Từ vựng tiếng Anh trình độ A2 mở rộng cho các chủ đề gia đình, mua sắm và công việc.',
    start: b2,
    end: b3,
    difficultyDefault: 1,
  },
  {
    setId: 'set_oxford_b1',
    varName: 'OXFORD_B1_WORDS',
    fileName: 'oxfordB1Words.ts',
    prefix: 'word_b1',
    title: 'Oxford 3000 - Trung Cấp (B1)',
    description: 'Từ vựng tiếng Anh trình độ B1 giúp diễn đạt ý kiến, kế hoạch và giao tiếp tự tin.',
    start: b3,
    end: b4,
    difficultyDefault: 2,
  },
  {
    setId: 'set_oxford_b2',
    varName: 'OXFORD_B2_WORDS',
    fileName: 'oxfordB2Words.ts',
    prefix: 'word_b2',
    title: 'Oxford 3000 - Nâng Cao (B2)',
    description: 'Từ vựng tiếng Anh trình độ B2 nâng cao cho học thuật, công việc chuyên môn và thảo luận sâu.',
    start: b4,
    end: rawRows.length,
    difficultyDefault: 3,
  },
];

const tsOutDir = path.resolve(__dirname, '../src/data/seedData');
if (!fs.existsSync(tsOutDir)) {
  fs.mkdirSync(tsOutDir, { recursive: true });
}

const seedContentLessons = [];
const allSets = [];
const allEntriesList = [];

for (const def of levelDefs) {
  const rowsSlice = rawRows.slice(def.start, def.end);
  const entries = [];
  const seen = new Set();
  let index = 1;

  for (const row of rowsSlice) {
    const en = (row.english || '').trim().toLowerCase();
    const vi = (row.vietnamese || '').trim();
    if (!en || !vi) continue;
    if (seen.has(en)) continue;
    seen.add(en);

    const id = `${def.prefix}_${index++}`;
    const pos = (row.partOfSpeech || '').trim();
    const ipa = (row.ipa || '').trim();
    const exEn = (row.exampleEn || '').trim();
    const exVi = (row.exampleVi || '').trim();
    const rawAliases = (row.acceptedAnswers || '').toString().split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const acceptedAnswers = Array.from(new Set([en, ...rawAliases]));

    // Difficulty based on level & word length
    const len = en.length;
    let diff = def.difficultyDefault;
    if (len <= 4) diff = Math.min(diff, 1);
    else if (len >= 8) diff = Math.max(diff, 3);

    entries.push({
      id,
      setId: def.setId,
      english: en,
      vietnamese: vi,
      acceptedAnswers,
      partOfSpeech: pos || undefined,
      ipa: ipa || undefined,
      exampleEn: exEn,
      exampleVi: exVi,
      difficulty: diff,
      createdAt: '2026-10-31T00:00:00Z',
      updatedAt: '2026-10-31T00:00:00Z',
    });
  }

  console.log(`Generated ${def.title}: ${entries.length} entries`);
  allEntriesList.push(...entries);

  // Write TypeScript file
  const tsContent = `import { VocabularyEntry } from '../../types/vocabulary';\n\nexport const ${def.varName}: VocabularyEntry[] = ${JSON.stringify(entries, null, 2)};\n`;
  fs.writeFileSync(path.join(tsOutDir, def.fileName), tsContent, 'utf8');

  // Push to seedContentLessons
  seedContentLessons.push({
    id: def.setId,
    type: 'lesson',
    title: def.title,
    description: `${def.description} (${entries.length} từ)`,
    status: 'published',
    words: entries,
  });

  allSets.push({
    id: def.setId,
    title: def.title,
    description: `${def.description} (${entries.length} từ)`,
    owner: 'builtin',
    entryIds: entries.map(e => e.id),
    createdAt: '2026-10-31T00:00:00Z',
    updatedAt: '2026-10-31T00:00:00Z',
  });
}

// Write server/seed-content.json
const serverSeedPath = path.resolve(__dirname, '../server/seed-content.json');
fs.writeFileSync(serverSeedPath, JSON.stringify(seedContentLessons, null, 2), 'utf8');
console.log(`Written server seed content with ${seedContentLessons.length} lessons: ${serverSeedPath}`);

// Write src/data/seedWordSets.ts
const seedWordSetsContent = `import { VocabularyEntry, VocabularySet } from '../types/vocabulary';
import { OXFORD_A1_WORDS } from './seedData/oxfordA1Words';
import { OXFORD_A2_WORDS } from './seedData/oxfordA2Words';
import { OXFORD_B1_WORDS } from './seedData/oxfordB1Words';
import { OXFORD_B2_WORDS } from './seedData/oxfordB2Words';

export const SEED_ENTRIES: VocabularyEntry[] = [
  ...OXFORD_A1_WORDS,
  ...OXFORD_A2_WORDS,
  ...OXFORD_B1_WORDS,
  ...OXFORD_B2_WORDS,
];

export const SEED_WORD_SETS: VocabularySet[] = ${JSON.stringify(allSets, null, 2)};
`;

const seedWordSetsPath = path.resolve(__dirname, '../src/data/seedWordSets.ts');
fs.writeFileSync(seedWordSetsPath, seedWordSetsContent, 'utf8');
console.log(`Written: ${seedWordSetsPath}`);

// Clean up any old single-file oxford3000Words.ts if present
const singleOld = path.join(tsOutDir, 'oxford3000Words.ts');
if (fs.existsSync(singleOld)) {
  fs.unlinkSync(singleOld);
}

console.log(`Total vocabulary entries: ${allEntriesList.length} across ${levelDefs.length} sets.`);
