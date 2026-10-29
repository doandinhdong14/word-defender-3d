import fs from 'fs';
import path from 'path';

// Helper to convert array of tuples to TypeScript file
function generateTsFile(varName, list, setId, prefix) {
  const seen = new Set();
  const entries = [];
  let index = 1;

  for (const item of list) {
    const [en, vi, pos, ipa, exEn, exVi, diff, aliases] = item;
    const cleanEn = en.trim().toLowerCase();
    if (seen.has(cleanEn)) continue;
    seen.add(cleanEn);

    const id = `${prefix}_${index}`;
    index++;
    const acceptedAnswers = [cleanEn, ...(aliases || []).map(a => a.trim().toLowerCase())];

    entries.push({
      id,
      setId,
      english: cleanEn,
      vietnamese: vi.trim(),
      acceptedAnswers: Array.from(new Set(acceptedAnswers)),
      partOfSpeech: pos,
      ipa: ipa.trim(),
      exampleEn: exEn.trim(),
      exampleVi: exVi.trim(),
      difficulty: diff || 1,
      createdAt: '2026-10-26T00:00:00Z',
      updatedAt: '2026-10-26T00:00:00Z',
    });
  }

  const content = `import { VocabularyEntry } from '../../types/vocabulary';\n\nexport const ${varName}: VocabularyEntry[] = ${JSON.stringify(entries, null, 2)};\n`;
  return { content, count: entries.length };
}

const outDir = path.join(process.cwd(), 'src', 'data', 'seedData');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. EVERYDAY (320+ words)
import { rawEveryday } from './rawEverydayData.mjs';
const evRes = generateTsFile('EVERYDAY_WORDS', rawEveryday, 'set_everyday', 'word_ev');
fs.writeFileSync(path.join(outDir, 'everydayWords.ts'), evRes.content, 'utf8');
console.log(`Generated Everyday Words: ${evRes.count} entries`);

// 2. SCHOOL (320+ words)
import { rawSchool } from './rawSchoolData.mjs';
const schRes = generateTsFile('SCHOOL_WORDS', rawSchool, 'set_school', 'word_sch');
fs.writeFileSync(path.join(outDir, 'schoolWords.ts'), schRes.content, 'utf8');
console.log(`Generated School Words: ${schRes.count} entries`);

// 3. IELTS (320+ words)
import { rawIelts } from './rawIeltsData.mjs';
const ieltsRes = generateTsFile('IELTS_WORDS', rawIelts, 'set_ielts', 'word_ielts');
fs.writeFileSync(path.join(outDir, 'ieltsWords.ts'), ieltsRes.content, 'utf8');
console.log(`Generated IELTS Words: ${ieltsRes.count} entries`);

console.log("All vocabulary sets successfully generated!");
