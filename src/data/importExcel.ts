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

export interface FilePreviewRow {
  english: string;
  vietnamese: string;
  partOfSpeech?: string;
  ipa?: string;
  exampleEn?: string;
  exampleVi?: string;
  acceptedAnswers: string[];
  isValid: boolean;
  error?: string;
}

export interface FilePreviewResult {
  fileName: string;
  fileSize: number;
  totalRows: number;
  detectedColumns: {
    english: string | null;
    vietnamese: string | null;
    partOfSpeech: string | null;
    ipa: string | null;
    exampleEn: string | null;
    exampleVi: string | null;
    acceptedAnswers: string | null;
  };
  previewRows: FilePreviewRow[];
  validCount: number;
  invalidCount: number;
}

// Sample rows used for templates
export const TEMPLATE_SAMPLE_ROWS = [
  {
    english: 'brave',
    vietnamese: 'dũng cảm',
    partOfSpeech: 'adj',
    ipa: '/breɪv/',
    exampleEn: 'The brave little pempom fought the alien.',
    exampleVi: 'Chú pempom dũng cảm đã chiến đấu với quái vật.',
    acceptedAnswers: 'courageous, bold',
  },
  {
    english: 'knowledge',
    vietnamese: 'kiến thức',
    partOfSpeech: 'noun',
    ipa: '/ˈnɒlɪdʒ/',
    exampleEn: 'Knowledge is our greatest weapon.',
    exampleVi: 'Kiến thức là vũ khí mạnh nhất của chúng ta.',
    acceptedAnswers: 'wisdom, insight',
  },
  {
    english: 'improve',
    vietnamese: 'cải thiện',
    partOfSpeech: 'verb',
    ipa: '/ɪmˈpruːv/',
    exampleEn: 'Daily typing practice will improve your speed.',
    exampleVi: 'Luyện gõ phím hàng ngày sẽ cải thiện tốc độ của bạn.',
    acceptedAnswers: 'better, upgrade',
  },
  {
    english: 'efficiently',
    vietnamese: 'một cách hiệu quả',
    partOfSpeech: 'adv',
    ipa: '/ɪˈfɪʃntli/',
    exampleEn: 'She organizes her schedule very efficiently.',
    exampleVi: 'Cô ấy sắp xếp lịch trình của mình rất hiệu quả.',
    acceptedAnswers: 'effectively',
  },
  {
    english: 'curious',
    vietnamese: 'tò mò',
    partOfSpeech: 'adj',
    ipa: '/ˈkjʊəriəs/',
    exampleEn: 'Children are curious about nature.',
    exampleVi: 'Trẻ em rất tò mò về thiên nhiên.',
    acceptedAnswers: 'inquisitive',
  },
  {
    english: 'atmosphere',
    vietnamese: 'bầu không khí',
    partOfSpeech: 'noun',
    ipa: '/ˈætməsfɪə(r)/',
    exampleEn: 'The cafe has a warm and relaxing atmosphere.',
    exampleVi: 'Quán cà phê có bầu không khí ấm áp và thư thái.',
    acceptedAnswers: 'ambiance',
  },
];

export function generateCsvTemplate(): string {
  const headers = ['english', 'vietnamese', 'partOfSpeech', 'ipa', 'exampleEn', 'exampleVi', 'acceptedAnswers'];
  const rows = TEMPLATE_SAMPLE_ROWS.map((r) => [
    r.english,
    r.vietnamese,
    r.partOfSpeech,
    r.ipa,
    r.exampleEn,
    r.exampleVi,
    r.acceptedAnswers,
  ]);
  return Papa.unparse([headers, ...rows]);
}

/**
 * Triggers a download of a sample CSV file with UTF-8 BOM so Microsoft Excel
 * on Windows opens Vietnamese diacritics cleanly without broken fonts.
 */
export function downloadCsvTemplate(): void {
  const csvContent = generateCsvTemplate();
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'mau_tu_vung_pempom.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a clean, multi-sheet Excel (.xlsx) file with
 * column widths and instructions sheet.
 */
export function downloadExcelTemplate(): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Sample Vocabulary
  const sheet1Data = [
    [
      'english',
      'vietnamese',
      'partOfSpeech',
      'ipa',
      'exampleEn',
      'exampleVi',
      'acceptedAnswers',
    ],
    ...TEMPLATE_SAMPLE_ROWS.map((r) => [
      r.english,
      r.vietnamese,
      r.partOfSpeech,
      r.ipa,
      r.exampleEn,
      r.exampleVi,
      r.acceptedAnswers,
    ]),
  ];

  const vocabSheet = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Set nice column widths (characters)
  vocabSheet['!cols'] = [
    { wch: 18 }, // english
    { wch: 22 }, // vietnamese
    { wch: 14 }, // partOfSpeech
    { wch: 16 }, // ipa
    { wch: 42 }, // exampleEn
    { wch: 45 }, // exampleVi
    { wch: 25 }, // acceptedAnswers
  ];

  // Sheet 2: Detailed Instructions
  const instructionsData = [
    ['HƯỚNG DẪN CẤU TRÚC FILE EXCEL TẢI LÊN PEMPOM WORD DEFENDER'],
    [''],
    ['Tên Cột (Header)', 'Bắt Buộc?', 'Mô Tả & Ví Dụ'],
    ['english', 'BẮT BUỘC', 'Từ vựng tiếng Anh người chơi sẽ gõ trong game (Ví dụ: brave, knowledge)'],
    ['vietnamese', 'BẮT BUỘC', 'Nghĩa tiếng Việt hiển thị để người chơi liên tưởng (Ví dụ: dũng cảm, kiến thức)'],
    ['partOfSpeech', 'Không bắt buộc', 'Loại từ: noun, verb, adj, adv... (Ví dụ: adj)'],
    ['ipa', 'Không bắt buộc', 'Phiên âm quốc tế IPA giúp luyện phát âm (Ví dụ: /breɪv/)'],
    ['exampleEn', 'Không bắt buộc', 'Câu ví dụ tiếng Anh chứa từ vựng (Ví dụ: The brave dog barked.)'],
    ['exampleVi', 'Không bắt buộc', 'Dịch câu ví dụ sang tiếng Việt (Ví dụ: Chú chó dũng cảm sủa vang.)'],
    ['acceptedAnswers', 'Không bắt buộc', 'Các từ đồng nghĩa hoặc cách gõ phụ được chấp nhận, phân cách bởi dấu phẩy (Ví dụ: courageous, bold)'],
    [''],
    ['LƯU Ý QUAN TRỌNG:'],
    ['1. File hỗ trợ: .xlsx, .xls, .csv. Dung lượng tối đa: 5MB, tối đa 5.000 từ.'],
    ['2. Hệ thống hỗ trợ cả tên cột tiếng Việt (ví dụ: "Từ tiếng Anh", "Nghĩa", "Từ loại", "Phiên âm", "Ví dụ", "Đồng nghĩa").'],
    ['3. Các dòng bị trùng lặp từ trong cùng một file sẽ tự động được gộp lại để tránh lãng phí.'],
  ];

  const guideSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  guideSheet['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 75 }];

  XLSX.utils.book_append_sheet(workbook, vocabSheet, 'MauTuVung');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'HuongDanSuDung');

  // Trigger download
  XLSX.writeFile(workbook, 'mau_tu_vung_pempom.xlsx');
}

/**
 * Strip Vietnamese diacritics to make column header matching resilient
 * against any input style ("Từ vựng", "từ vựng", "tuvung", "Tu Vung").
 */
export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeHeader(h: string): string {
  const clean = removeVietnameseDiacritics(String(h || ''));
  return clean.toLowerCase().trim().replace(/[\s_\-()[\]{}]+/g, '');
}

export function findColumnKey(row: Record<string, any>, candidates: string[]): string | undefined {
  for (const key of Object.keys(row)) {
    const norm = normalizeHeader(key);
    for (const cand of candidates) {
      if (norm === cand || norm.includes(cand)) {
        return key;
      }
    }
  }
  return undefined;
}

export function findColumnValue(row: Record<string, any>, candidates: string[]): string | undefined {
  const key = findColumnKey(row, candidates);
  if (!key) return undefined;
  const val = row[key];
  return val != null ? String(val).trim() : undefined;
}

export const EN_CANDIDATES = ['english', 'word', 'tu', 'tuvung', 'tutienganh', 'tienganh', 'en', 'vocab', 'target', 'vocabulary'];
export const VI_CANDIDATES = ['vietnamese', 'meaning', 'nghia', 'nghiatiengviet', 'tiengviet', 'vi', 'prompt', 'dich', 'giainghia', 'ynghia', 'translation'];
export const POS_CANDIDATES = ['partofspeech', 'pos', 'loaitu', 'tuloai', 'type', 'category'];
export const IPA_CANDIDATES = ['ipa', 'pronunciation', 'phienam', 'phatam', 'transcription', 'am'];
export const EX_EN_CANDIDATES = ['exampleen', 'example', 'vidu', 'vidutienganh', 'sentence', 'cauvidu', 'cautienganh'];
export const EX_VI_CANDIDATES = ['examplevi', 'meaningexample', 'dichvidu', 'nghiavidu', 'dichcau', 'dichcauvidu', 'examplesentencevi'];
export const ALIAS_CANDIDATES = ['acceptedanswers', 'aliases', 'dongnghia', 'tudongnghia', 'synonyms', 'dapanphu', 'otheranswers', 'dapan'];

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

async function extractRawRows(file: File): Promise<Record<string, any>[]> {
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
    throw new Error('Định dạng không được hỗ trợ. Vui lòng dùng file .xlsx, .xls hoặc .csv.');
  }

  return rawRows;
}

/**
 * Previews a vocabulary file before committing to DB, detecting columns,
 * validating initial rows, and reporting friendly diagnostics.
 */
export async function previewVocabularyFile(file: File): Promise<FilePreviewResult> {
  const rawRows = await extractRawRows(file);

  if (rawRows.length === 0) {
    throw new Error('File không chứa dữ liệu hoặc các hàng đều trống.');
  }

  const firstRow = rawRows[0] || {};
  const detectedColumns = {
    english: findColumnKey(firstRow, EN_CANDIDATES) || null,
    vietnamese: findColumnKey(firstRow, VI_CANDIDATES) || null,
    partOfSpeech: findColumnKey(firstRow, POS_CANDIDATES) || null,
    ipa: findColumnKey(firstRow, IPA_CANDIDATES) || null,
    exampleEn: findColumnKey(firstRow, EX_EN_CANDIDATES) || null,
    exampleVi: findColumnKey(firstRow, EX_VI_CANDIDATES) || null,
    acceptedAnswers: findColumnKey(firstRow, ALIAS_CANDIDATES) || null,
  };

  const previewRows: FilePreviewRow[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const en = findColumnValue(row, EN_CANDIDATES);
    const vi = findColumnValue(row, VI_CANDIDATES);
    const isValid = Boolean(en && vi && en.trim().length > 0 && vi.trim().length > 0);

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    if (previewRows.length < 5) {
      const pos = findColumnValue(row, POS_CANDIDATES);
      const ipa = findColumnValue(row, IPA_CANDIDATES);
      const exEn = findColumnValue(row, EX_EN_CANDIDATES);
      const exVi = findColumnValue(row, EX_VI_CANDIDATES);
      const rawAliases = findColumnValue(row, ALIAS_CANDIDATES);

      const aliases = rawAliases
        ? rawAliases.split(/[,;|]/).map((a) => a.trim().toLowerCase()).filter(Boolean)
        : [];

      previewRows.push({
        english: en?.trim() || '',
        vietnamese: vi?.trim() || '',
        partOfSpeech: pos,
        ipa,
        exampleEn: exEn,
        exampleVi: exVi,
        acceptedAnswers: aliases,
        isValid,
        error: !isValid ? 'Thiếu từ tiếng Anh hoặc nghĩa tiếng Việt' : undefined,
      });
    }
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    totalRows: rawRows.length,
    detectedColumns,
    previewRows,
    validCount,
    invalidCount,
  };
}

export async function parseAndImportFile(
  file: File,
  customTitle?: string
): Promise<ImportSummary> {
  const rawRows = await extractRawRows(file);

  if (rawRows.length > 5000) {
    throw new Error('File có hơn 5.000 hàng. Vui lòng tách file nhỏ hơn để đảm bảo tốc độ.');
  }

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
    const en = findColumnValue(row, EN_CANDIDATES);
    const vi = findColumnValue(row, VI_CANDIDATES);

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

    const partOfSpeech = findColumnValue(row, POS_CANDIDATES);
    const ipa = findColumnValue(row, IPA_CANDIDATES);
    const exampleEn = findColumnValue(row, EX_EN_CANDIDATES);
    const exampleVi = findColumnValue(row, EX_VI_CANDIDATES);
    const rawAliases = findColumnValue(row, ALIAS_CANDIDATES);

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
    throw new Error('Không tìm thấy từ vựng hợp lệ nào trong file. Vui lòng kiểm tra lại cấu trúc cột theo file mẫu.');
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
    errors: errors.slice(0, 10),
    importedSetId: setId,
    entries: validEntries,
  };
}
