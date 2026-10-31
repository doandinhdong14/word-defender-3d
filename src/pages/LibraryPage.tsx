import React, { useEffect, useState } from 'react';
import { useApp } from '../app/appStore';
import { VocabularyEntry, VocabularySet } from '../types/vocabulary';
import { db } from '../data/db';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import { ArrowLeft, Plus, Upload, Trash2, Eye, Download, Check } from 'lucide-react';
import { generateCsvTemplate } from '../data/importExcel';
import { useAuth } from '../auth/AuthContext';
import { syncPublishedLessons } from '../data/publishedContent';
import { getBasicSets, getBasicWords } from '../config/access';

export const LibraryPage: React.FC = () => {
  const { isAdmin, account } = useAuth();
  const { navigateTo, selectedSetId, setSelectedSetId } = useApp();
  const [sets, setSets] = useState<VocabularySet[]>([]);
  const [search, setSearch] = useState('');
  const [previewSet, setPreviewSet] = useState<VocabularySet | null>(null);
  const [previewWords, setPreviewWords] = useState<VocabularyEntry[]>([]);
  const [previewSearch, setPreviewSearch] = useState('');

  const loadSets = async () => {
    if (!account) { setSets(getBasicSets()); return; }
    await syncPublishedLessons().catch(() => {});
    const allSets = await db.wordSets.toArray();
    setSets(allSets);
  };

  useEffect(() => {
    loadSets();
  }, []);

  const handleSelect = (setId: string) => {
    setSelectedSetId(setId);
    navigateTo('prepare');
  };

  const handlePreview = async (set: VocabularySet) => {
    const words = account ? await db.words.where('setId').equals(set.id).toArray() : getBasicWords(set.id);
    setPreviewSet(set);
    setPreviewWords(words);
  };

  const handleDelete = async (setId: string, title: string) => {
    if (!isAdmin) return;
    const set = await db.wordSets.get(setId);
    if (set?.owner === 'builtin') { navigateTo('admin'); return; }
    if (window.confirm(`Bạn có chắc chắn muốn xóa bộ từ "${title}"?`)) {
      await db.transaction('rw', [db.wordSets, db.words], async () => {
        await db.wordSets.delete(setId);
        await db.words.where('setId').equals(setId).delete();
      });
      if (selectedSetId === setId) {
        setSelectedSetId('set_oxford_a1');
      }
      loadSets();
    }
  };

  const handleDownloadTemplate = () => {
    if (!account) { navigateTo('account'); return; }
    const csvContent = generateCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'pempom_word_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredSets = sets.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="notebook-grid-bg app-page"
      style={{
        minHeight: '100vh',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '900px' }}>
        {/* Navigation Bar */}
        <div className="doodle-toolbar">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <StickerButton size="sm" onClick={handleDownloadTemplate} icon={<Download size={14} />}>
              Tải mẫu
            </StickerButton>
            <StickerButton
              variant="mint"
              size="sm"
              onClick={() => navigateTo(account ? 'editor' : 'account')}
              icon={<Upload size={14} />}
            >
              Tải tài liệu Excel / CSV
            </StickerButton>
          </div>
        </div>

        {/* Page Title & Search */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900 }}>
            Bài học
          </h1>
          <p style={{ color: 'var(--color-muted-ink)', marginTop: '4px' }}>
            {account ? 'Chọn hoặc nhập bộ từ.' : 'Hai bộ từ cơ bản miễn phí, không cần đăng nhập.'}
          </p>

          <input
            type="text"
            placeholder="Tìm kiếm bộ từ vựng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginTop: '12px',
              width: '100%',
              maxWidth: '400px',
              padding: '10px 16px',
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              border: 'var(--border-ink)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sticker-sm)',
              outline: 'none',
            }}
          />
        </div>

        {/* Word Sets Grid */}
        {!account && <div className="notice guest-notice"><button className="text-button" onClick={() => navigateTo('account')}>Đăng nhập Google để mở thêm bộ từ và nhập tài liệu riêng</button></div>}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredSets.map((set) => {
            const isSelected = set.id === selectedSetId;
            return (
              <PaperPanel
                key={set.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isSelected ? '3px solid var(--color-ponpi-pink)' : 'var(--border-ink)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-display)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: set.owner === 'builtin' ? '#E1F5FE' : '#FFF9C4',
                        color: set.owner === 'builtin' ? '#0288D1' : '#F57F17',
                        border: '1px solid var(--color-ink)',
                      }}
                    >
                      {set.owner === 'builtin' ? 'Sẵn Có' : 'Tự Tạo'}
                    </span>

                    {isSelected && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          color: '#E06C96',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                        }}
                      >
                        <Check size={14} /> Đang chọn
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      marginTop: '8px',
                    }}
                  >
                    {set.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--color-muted-ink)',
                      marginTop: '4px',
                      minHeight: '38px',
                    }}
                  >
                    {set.description || 'Bộ từ vựng tiếng Anh.'}
                  </p>

                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '8px', color: 'var(--color-ink)' }}>
                    {set.entryIds.length} từ vựng
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '16px',
                    alignItems: 'center',
                  }}
                >
                  <StickerButton
                    variant={isSelected ? 'primary' : 'default'}
                    size="sm"
                    onClick={() => handleSelect(set.id)}
                    style={{ flex: 1 }}
                  >
                    {isSelected ? 'Luyện Ngay' : 'Chọn Bộ Này'}
                  </StickerButton>

                  <StickerButton size="sm" onClick={() => handlePreview(set)} icon={<Eye size={14} />} />

                  {isAdmin && set.owner === 'local' && (
                    <StickerButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(set.id, set.title)}
                      icon={<Trash2 size={14} />}
                    />
                  )}
                </div>
              </PaperPanel>
            );
          })}
        </div>

        {/* Word Preview Modal */}
        {previewSet && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(37, 35, 43, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              zIndex: 100,
            }}
          >
            <PaperPanel
              style={{
                width: '100%',
                maxWidth: '600px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{previewSet.title}</h2>
                  <p style={{ color: 'var(--color-muted-ink)', fontSize: '0.9rem' }}>
                    Danh sách {previewWords.length} từ trong bộ
                  </p>
                </div>
                <StickerButton size="sm" onClick={() => { setPreviewSet(null); setPreviewSearch(''); }}>
                  Đóng
                </StickerButton>
              </div>

              {previewWords.length > 30 && (
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Tìm từ vựng trong bộ..."
                    className="doodle-input"
                    style={{ width: '100%', fontSize: '0.9rem', padding: '8px 12px' }}
                  />
                </div>
              )}

              <div
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '6px',
                }}
              >
                {(() => {
                  const filtered = previewWords.filter((w) =>
                    !previewSearch ||
                    w.english.toLowerCase().includes(previewSearch.toLowerCase()) ||
                    w.vietnamese.toLowerCase().includes(previewSearch.toLowerCase())
                  );
                  const displayList = filtered.slice(0, 100);
                  return (
                    <>
                      {displayList.map((word) => (
                        <div
                          key={word.id}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-paper)',
                            border: '1.5px solid var(--color-ink)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontFamily: 'var(--font-english)' }}>
                              {word.english} {word.ipa && <span style={{ fontWeight: 400, opacity: 0.7, fontFamily: 'var(--font-vietnamese)' }}>{word.ipa}</span>}
                            </div>
                            {word.exampleEn && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-ink)', marginTop: '2px', fontFamily: 'var(--font-english)' }}>
                                {word.exampleEn}
                              </div>
                            )}
                          </div>
                          <div style={{ fontWeight: 700, color: '#E06C96', textAlign: 'right', fontFamily: 'var(--font-vietnamese)' }}>
                            {word.vietnamese}
                          </div>
                        </div>
                      ))}
                      {filtered.length > 100 && (
                        <div style={{ textAlign: 'center', padding: '8px', color: 'var(--color-muted-ink)', fontSize: '0.85rem' }}>
                          Đang hiển thị 100/{filtered.length} từ. Dùng ô tìm kiếm để lọc từ cụ thể.
                        </div>
                      )}
                      {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-muted-ink)' }}>
                          Không tìm thấy từ nào phù hợp.
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </PaperPanel>
          </div>
        )}
      </div>
    </div>
  );
};
