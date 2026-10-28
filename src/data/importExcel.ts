import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { VocabularyEntry, VocabularySet } from '../types/vocabulary';
import { db } from './db';

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  skippedRows: number;
  duplicateRows: number;
  errors: string[];
  importedSetId?: string;
  entries: VocabularyEntry[];
}

export function generateCsvTemplate(): string {
  const headers = ['english', 'vietnamese', 'partOfSpeech', 'ipa', 'exampleEn', 'exampleVi', 'acceptedAnswers'];
  const sample1 = ['brave', 'dũng cảm', 'adj', '/breɪv/', 'The brave little pempom fought the alien.', 'Chú pempom dũng cảm đã chiến đấu với quái vật.', 'courageous'];
  const sample2 = ['knowledge', 'kiến thức', 'noun', '/ˈnɒlɪdʒ/', 'Knowledge is our greatest weapon.', 'Kiến thức là vũ khí mạnh nhất của chúng ta.', 'wisdom'];
  return Papa.unparse([headers, sample1, sample2]);
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_-]+/g, '');
}

function findColumnValue(row: Record<string, any>, candidates: string[]): string | undefined {
  for (const key of Object.keys(row)) {
    const norm = normalizeHeader(key);
    for (const cand of candidates) {
      if (norm === cand || norm.includes(cand)) {
        const val = row[key];
        return val != null ? String(val).trim() : undefined;
      }
    }
  }
  return undefined;
}

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return await file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as ArrayBuffer) || new ArrayBuffer(0));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function parseAndImportFile(
  file: File,
  customTitle?: string
): Promise<ImportSummary> {
  // Max size limit: 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File vượt quá giới hạn 5MB cho phép. Vui lòng chọn file nhỏ hơn.');
  }

  const rawRows: Record<string, any>[] = [];

  if (file.name.endsWith('.csv') || file.type.includes('csv')) {
    const text = await readFileAsText(file);
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
    });
    rawRows.push(...(result.data as Record<string, any>[]));
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const buffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('File Excel rỗng không có bảng tính.');
    }
    const sheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    rawRows.push(...data);
  } else {
    throw new Error('Định dạng không được hỗ trợ. Vui lòng dùng file .xlsx hoặc .csv.');
  }

  if (rawRows.length > 5000) {
    throw new Error('File có hơn 5.000 hàng. Vui lòng tách file nhỏ hơn để đảm bảo tốc độ.');
  }

  const enCandidates = ['english', 'word', 'en', 'tu', 'vocab', 'target'];
  const viCandidates = ['vietnamese', 'meaning', 'nghia', 'vi', 'prompt', 'dich'];

  const now = new Date().toISOString();
  const setId = `custom_set_${Date.now()}`;
  const setTitle = customTitle?.trim() || file.name.replace(/\.[^/.]+$/, '').trim() || 'My Vocabulary Set';

  const validEntries: VocabularyEntry[] = [];
  const errors: string[] = [];
  let skippedRows = 0;
  let duplicateRows = 0;

  const seenKeys = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const en = findColumnValue(row, enCandidates);
    const vi = findColumnValue(row, viCandidates);

    if (!en || !vi) {
      skippedRows++;
      errors.push(`Hàng ${i + 2}: Thiếu cột từ tiếng Anh hoặc nghĩa tiếng Việt.`);
      continue;
    }

    const normEn = en.trim().toLowerCase().normalize('NFC');
    const normVi = vi.trim().normalize('NFC');

    const dedupeKey = `${normEn}__${normVi}`;
    if (seenKeys.has(dedupeKey)) {
      duplicateRows++;
      continue;
    }
    seenKeys.add(dedupeKey);

    const partOfSpeech = findColumnValue(row, ['partofspeech', 'pos', 'loaitu', 'type']);
    const ipa = findColumnValue(row, ['ipa', 'pronunciation', 'phienam']);
    const exampleEn = findColumnValue(row, ['exampleen', 'example', 'vidu', 'sentence']);
    const exampleVi = findColumnValue(row, ['examplevi', 'meaningexample', 'dichvidu']);
    const rawAliases = findColumnValue(row, ['acceptedanswers', 'aliases', 'dongnghia', 'synonyms']);

    const acceptedAnswers = [normEn];
    if (rawAliases) {
      rawAliases
        .split(/[,;|]/)
        .map((a) => a.trim().toLowerCase().normalize('NFC'))
        .filter((a) => a.length > 0)
        .forEach((alias) => {
          if (!acceptedAnswers.includes(alias)) {
            acceptedAnswers.push(alias);
          }
        });
    }

    const entry: VocabularyEntry = {
      id: `entry_${setId}_${validEntries.length + 1}`,
      setId,
      english: en.trim().normalize('NFC'),
      vietnamese: normVi,
      acceptedAnswers,
      partOfSpeech,
      ipa,
      exampleEn,
      exampleVi,
      createdAt: now,
      updatedAt: now,
    };

    validEntries.push(entry);
  }

  if (validEntries.length === 0) {
    throw new Error('Không tìm thấy từ vựng hợp lệ nào trong file.');
  }

  const newSet: VocabularySet = {
    id: setId,
    title: setTitle,
    description: `Bộ từ tự tạo gồm ${validEntries.length} từ.`,
    owner: 'local',
    entryIds: validEntries.map((e) => e.id),
    createdAt: now,
    updatedAt: now,
  };

  // Atomic database save
  await db.transaction('rw', [db.wordSets, db.words], async () => {
    await db.wordSets.add(newSet);
    await db.words.bulkAdd(validEntries);
  });

  return {
    totalRows: rawRows.length,
    validRows: validEntries.length,
    skippedRows,
    duplicateRows,
    errors: errors.slice(0, 10), // first 10 errors
    importedSetId: setId,
    entries: validEntries,
  };
}
