import { describe, it, expect } from 'vitest';
import {
  generateCsvTemplate,
  parseAndImportFile,
  previewVocabularyFile,
  normalizeHeader,
} from '../../data/importExcel';
import { db } from '../../data/db';

describe('Vocabulary Import and Parsing', () => {
  it('generates a valid CSV template containing standard headers and sample words', () => {
    const csv = generateCsvTemplate();
    expect(csv).toContain('english');
    expect(csv).toContain('vietnamese');
    expect(csv).toContain('dũng cảm');
  });

  it('normalizes Vietnamese headers without diacritics', () => {
    expect(normalizeHeader('Từ vựng')).toBe('tuvung');
    expect(normalizeHeader('Nghĩa tiếng Việt')).toBe('nghiatiengviet');
    expect(normalizeHeader('Từ loại (Part of Speech)')).toBe('tuloaipartofspeech');
  });

  it('imports valid CSV with Vietnamese column headers (Từ vựng, Nghĩa)', async () => {
    const csvContent = `"Từ vựng","Nghĩa tiếng Việt","Từ loại"
"resilient","kiên cường bền bỉ","adj"
"biodiversity","đa dạng sinh học","noun"`;

    const file = new File([csvContent], 'vietnamese_headers.csv', { type: 'text/csv' });
    const summary = await parseAndImportFile(file, 'Vietnamese Headers Set');

    expect(summary.validRows).toBe(2);
    expect(summary.entries[0].english).toBe('resilient');
    expect(summary.entries[0].vietnamese).toBe('kiên cường bền bỉ');
    expect(summary.entries[1].english).toBe('biodiversity');
  });

  it('previews file before importing', async () => {
    const csvContent = `english,vietnamese,acceptedAnswers
courageous,can đảm,brave;bold
knowledge,kiến thức,wisdom`;

    const file = new File([csvContent], 'preview_test.csv', { type: 'text/csv' });
    const preview = await previewVocabularyFile(file);

    expect(preview.totalRows).toBe(2);
    expect(preview.validCount).toBe(2);
    expect(preview.previewRows.length).toBe(2);
    expect(preview.previewRows[0].english).toBe('courageous');
    expect(preview.previewRows[0].acceptedAnswers).toContain('brave');
  });

  it('imports valid CSV with Vietnamese Unicode accents preserved', async () => {
    const csvContent = `english,vietnamese,partOfSpeech
brave,dũng cảm,adj
curiosity,sự tò mò,noun`;

    const file = new File([csvContent], 'test_words.csv', { type: 'text/csv' });
    const summary = await parseAndImportFile(file, 'Test Unicode Set');

    expect(summary.validRows).toBe(2);
    expect(summary.entries[0].english).toBe('brave');
    expect(summary.entries[0].vietnamese).toBe('dũng cảm');
    expect(summary.entries[1].vietnamese).toBe('sự tò mò');

    // Verify written to database
    const saved = await db.words.where('setId').equals(summary.importedSetId!).toArray();
    expect(saved.length).toBe(2);
    expect(saved[0].vietnamese).toBe('dũng cảm');
  });

  it('skips duplicate rows in the same file', async () => {
    const csvContent = `english,vietnamese
brave,dũng cảm
brave,dũng cảm
brave,dũng cảm`;

    const file = new File([csvContent], 'duplicates.csv', { type: 'text/csv' });
    const summary = await parseAndImportFile(file, 'Dedupe Set');

    expect(summary.validRows).toBe(1);
    expect(summary.duplicateRows).toBe(2);
  });

  it('rejects files with no valid vocabulary entries', async () => {
    const csvContent = `foo,bar
123,456`;

    const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' });
    await expect(parseAndImportFile(file, 'Bad Set')).rejects.toThrow();
  });
});
