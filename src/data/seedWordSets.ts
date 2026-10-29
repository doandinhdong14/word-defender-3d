import { VocabularyEntry, VocabularySet } from '../types/vocabulary';
import { EVERYDAY_WORDS } from './seedData/everydayWords';
import { SCHOOL_WORDS } from './seedData/schoolWords';
import { IELTS_WORDS } from './seedData/ieltsWords';

export const SEED_ENTRIES: VocabularyEntry[] = [
  ...EVERYDAY_WORDS,
  ...SCHOOL_WORDS,
  ...IELTS_WORDS,
];

export const SEED_WORD_SETS: VocabularySet[] = [
  {
    id: 'set_everyday',
    title: 'Everyday Communication',
    description: `Từ vựng giao tiếp hàng ngày thông dụng và dễ nhớ (${EVERYDAY_WORDS.length} từ).`,
    owner: 'builtin',
    entryIds: EVERYDAY_WORDS.map((e) => e.id),
    createdAt: '2026-10-26T00:00:00Z',
    updatedAt: '2026-10-26T00:00:00Z',
  },
  {
    id: 'set_school',
    title: 'School & Academic',
    description: `Từ vựng trường học, bài vở và môi trường học thuật (${SCHOOL_WORDS.length} từ).`,
    owner: 'builtin',
    entryIds: SCHOOL_WORDS.map((e) => e.id),
    createdAt: '2026-10-26T00:00:00Z',
    updatedAt: '2026-10-26T00:00:00Z',
  },
  {
    id: 'set_ielts',
    title: 'IELTS Core & Academic',
    description: `Các từ vựng cốt lõi nâng cao band điểm cho người luyện thi IELTS (${IELTS_WORDS.length} từ).`,
    owner: 'builtin',
    entryIds: IELTS_WORDS.map((e) => e.id),
    createdAt: '2026-10-26T00:00:00Z',
    updatedAt: '2026-10-26T00:00:00Z',
  },
];
