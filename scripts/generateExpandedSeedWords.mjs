import fs from 'fs';
import path from 'path';

// Helper to sanitize entry
function formatEntry(id, setId, english, vietnamese, pos, ipa, exEn, exVi, diff = 1, aliases = []) {
  const normEn = english.trim().toLowerCase();
  const accepted = [normEn, ...aliases.map(a => a.trim().toLowerCase()).filter(Boolean)];
  return {
    id,
    setId,
    english: normEn,
    vietnamese: vietnamese.trim(),
    acceptedAnswers: Array.from(new Set(accepted)),
    partOfSpeech: pos,
    ipa: ipa.trim(),
    exampleEn: exEn.trim(),
    exampleVi: exVi.trim(),
    difficulty: diff,
    createdAt: '2026-10-26T00:00:00Z',
    updatedAt: '2026-10-26T00:00:00Z',
  };
}

// 1. Read checkCounts to get rawEveryday or define them
import './checkCounts.mjs'; // ensures environment is clean

console.log("Generating 3 full sets with 310+ words each...");
