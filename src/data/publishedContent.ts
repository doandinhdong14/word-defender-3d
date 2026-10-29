import { db } from './db';
import type { VocabularyEntry, VocabularySet } from '../types/vocabulary';
import type { ManagedContent } from '../admin/api';

export type PublicContent = Pick<ManagedContent, 'id' | 'type' | 'title' | 'description' | 'body' | 'words' | 'updatedAt'>;
export async function getPublishedContent(): Promise<{ items: PublicContent[]; authoritativeLessons: boolean }> {
  const response = await fetch('/api/content', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Chưa tải được nội dung mới.');
  const data = await response.json();
  if (!Array.isArray(data.items) || data.authoritativeLessons !== true) throw new Error('Phản hồi nội dung không hợp lệ.');
  return data;
}
export async function syncPublishedLessons(): Promise<void> {
  const { items } = await getPublishedContent();
  const lessons = items.filter(item => item.type === 'lesson');
  const ids = new Set(lessons.map(item => item.id));
  await db.transaction('rw', [db.wordSets, db.words], async () => {
    const existing = await db.wordSets.where('owner').equals('builtin').toArray();
    for (const set of existing) if (!ids.has(set.id)) { await db.wordSets.delete(set.id); await db.words.where('setId').equals(set.id).delete(); }
    for (const lesson of lessons) {
      const stored = await db.wordSets.get(lesson.id);
      if (stored?.updatedAt === lesson.updatedAt) continue;
      const words: VocabularyEntry[] = lesson.words.map(word => ({ ...word, id: word.id ?? `${lesson.id}:${word.english}`, setId: lesson.id, acceptedAnswers: word.acceptedAnswers ?? [], createdAt: lesson.updatedAt, updatedAt: lesson.updatedAt }));
      const set: VocabularySet = { id: lesson.id, title: lesson.title, description: lesson.description, owner: 'builtin', entryIds: words.map(w => w.id), createdAt: stored?.createdAt ?? lesson.updatedAt, updatedAt: lesson.updatedAt };
      await db.wordSets.put(set);
      await db.words.where('setId').equals(lesson.id).delete();
      await db.words.bulkPut(words);
    }
  });
}
