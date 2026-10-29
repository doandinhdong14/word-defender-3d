import React, { useState } from 'react';
import { useApp } from '../app/appStore';
import { PaperPanel } from '../components/PaperPanel';
import { StickerButton } from '../components/StickerButton';
import {
  ImportSummary,
  FilePreviewResult,
  parseAndImportFile,
  previewVocabularyFile,
  downloadExcelTemplate,
  downloadCsvTemplate,
} from '../data/importExcel';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  Check,
  X,
  FileText,
} from 'lucide-react';

export const WordSetEditorPage: React.FC = () => {
  const { navigateTo, setSelectedSetId } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FilePreviewResult | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
      setSummary(null);
      if (!customTitle) {
        setCustomTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }

      try {
        const previewResult = await previewVocabularyFile(selected);
        setPreview(previewResult);
      } catch (err: any) {
        setPreview(null);
        setError(err?.message || 'Không thể đọc nội dung file.');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Vui lòng chọn một file .xlsx, .xls hoặc .csv.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await parseAndImportFile(file, customTitle);
      setSummary(res);
      if (res.importedSetId) {
        setSelectedSetId(res.importedSetId);
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi nhập file. Vui lòng kiểm tra lại cấu trúc.');
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{ width: '100%', maxWidth: '800px' }}>
        <div style={{ marginBottom: '20px' }}>
          <StickerButton onClick={() => navigateTo('library')} icon={<ArrowLeft size={18} />}>
            Quay Lại Thư Viện
          </StickerButton>
        </div>

        <PaperPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <FileSpreadsheet size={32} color="#0288D1" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 900 }}>
              Nhập Bộ Từ Vựng Của Bạn
            </h1>
          </div>
          <p style={{ color: 'var(--color-muted-ink)', marginBottom: '20px', lineHeight: 1.5 }}>
            Tải lên bảng từ vựng dạng <strong>Excel (.xlsx, .xls)</strong> hoặc <strong>CSV (.csv)</strong>.
            Hệ thống hỗ trợ cả tên cột tiếng Anh lẫn tiếng Việt, tự động nhận diện từ đồng nghĩa và câu ví dụ.
          </p>

          {/* Template Download Section */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#F0F9FF',
              border: '2px dashed #0288D1',
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#01579B' }}>
                  📥 Tải Bảng Tính Mẫu Chuẩn Định Dạng
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#0288D1' }}>
                  Có sẵn dữ liệu mẫu, hướng dẫn chi tiết và độ rộng cột chuẩn.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#2E7D32',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  <Download size={16} /> Mẫu Excel (.xlsx)
                </button>

                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#E65100',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }}
                >
                  <FileText size={16} /> Mẫu CSV (.csv)
                </button>

                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: '#FFF',
                    color: '#0288D1',
                    border: '1.5px solid #0288D1',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <Info size={16} /> {showGuide ? 'Ẩn Hướng Dẫn Cột' : 'Xem Cột Chuẩn'}
                </button>
              </div>
            </div>

            {/* Collapsible Column Guide */}
            {showGuide && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #B3E5FC' }}>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #0288D1' }}>
                      <th style={{ padding: '6px 8px' }}>Tên Cột (Header)</th>
                      <th style={{ padding: '6px 8px' }}>Bắt Buộc?</th>
                      <th style={{ padding: '6px 8px' }}>Chấp Nhận Các Tên Cột</th>
                      <th style={{ padding: '6px 8px' }}>Mô Tả & Ví Dụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E1F5FE' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 800 }}>english</td>
                      <td style={{ padding: '6px 8px', color: '#D32F2F', fontWeight: 700 }}>Bắt Buộc</td>
                      <td style={{ padding: '6px 8px', color: '#0288D1' }}>English, Word, Từ vựng, Tiếng Anh</td>
                      <td style={{ padding: '6px 8px' }}>Từ tiếng Anh người chơi sẽ gõ trong trận đấu (VD: brave)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E1F5FE' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 800 }}>vietnamese</td>
                      <td style={{ padding: '6px 8px', color: '#D32F2F', fontWeight: 700 }}>Bắt Buộc</td>
                      <td style={{ padding: '6px 8px', color: '#0288D1' }}>Vietnamese, Meaning, Nghĩa, Dịch</td>
                      <td style={{ padding: '6px 8px' }}>Nghĩa tiếng Việt gợi ý người chơi nhớ từ (VD: dũng cảm)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E1F5FE' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 800 }}>partOfSpeech</td>
                      <td style={{ padding: '6px 8px', color: '#757575' }}>Tùy chọn</td>
                      <td style={{ padding: '6px 8px', color: '#0288D1' }}>POS, Loại từ, Từ loại</td>
                      <td style={{ padding: '6px 8px' }}>noun, verb, adj, adv... (VD: adj)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E1F5FE' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 800 }}>ipa</td>
                      <td style={{ padding: '6px 8px', color: '#757575' }}>Tùy chọn</td>
                      <td style={{ padding: '6px 8px', color: '#0288D1' }}>IPA, Phiên âm, Phát âm</td>
                      <td style={{ padding: '6px 8px' }}>Ký hiệu phiên âm quốc tế (VD: /breɪv/)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E1F5FE' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 800 }}>exampleEn</td>
                      <td style={{ padding: '6px 8px', color: '#757575' }}>Tùy chọn</td>
                      <td style={{ padding: '6px 8px', color: '#0288D1' }}>Example, Ví dụ, Câu ví dụ</td>
                      <td style={{ padding: '6px 8px' }}>Câu tiếng Anh ứng dụng (VD: The brave warrior.)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E1F5FE' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 800 }}>exampleVi</td>
                      <td style={{ padding: '6px 8px', color: '#757575' }}>Tùy chọn</td>
                      <td style={{ padding: '6px 8px', color: '#0288D1' }}>Dịch ví dụ, Nghĩa ví dụ</td>
                      <td style={{ padding: '6px 8px' }}>Dịch nghĩa câu ví dụ (VD: Chiến binh dũng cảm.)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 8px', fontWeight: 800 }}>acceptedAnswers</td>
                      <td style={{ padding: '6px 8px', color: '#757575' }}>Tùy chọn</td>
                      <td style={{ padding: '6px 8px', color: '#0288D1' }}>Aliases, Đồng nghĩa, Từ đồng nghĩa</td>
                      <td style={{ padding: '6px 8px' }}>Các từ đồng nghĩa, phân cách bằng dấu phẩy (VD: courageous, bold)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '6px' }}>
                Tên Bộ Từ Vựng:
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ví dụ: 300 Từ Vựng Giao Tiếp Chuyên Ngành IT"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  border: 'var(--border-ink)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 800, marginBottom: '6px' }}>
                Chọn File Bảng Tính (.xlsx, .xls, .csv):
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#FAFAFA',
                  border: '2px dashed var(--color-ink)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Real-time File Preview */}
            {preview && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#FFFDE7',
                  border: '2px solid #FBC02D',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#F57F17' }}>
                    🔍 Kết Quả Phân Tích File: {preview.fileName} ({preview.totalRows} dòng)
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: preview.detectedColumns.english && preview.detectedColumns.vietnamese ? '#E8F5E9' : '#FFEBEE',
                      color: preview.detectedColumns.english && preview.detectedColumns.vietnamese ? '#2E7D32' : '#C62828',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                    }}
                  >
                    {preview.detectedColumns.english && preview.detectedColumns.vietnamese ? '✓ Cấu trúc hợp lệ' : '⚠️ Thiếu cột bắt buộc'}
                  </span>
                </div>

                {/* Column Match Chips */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '0.8rem' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: preview.detectedColumns.english ? '#C8E6C9' : '#FFCDD2', color: '#1B5E20' }}>
                    {preview.detectedColumns.english ? `✓ Cột Anh: "${preview.detectedColumns.english}"` : '✕ Thiếu cột tiếng Anh'}
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: preview.detectedColumns.vietnamese ? '#C8E6C9' : '#FFCDD2', color: '#1B5E20' }}>
                    {preview.detectedColumns.vietnamese ? `✓ Cột Việt: "${preview.detectedColumns.vietnamese}"` : '✕ Thiếu cột tiếng Việt'}
                  </span>
                  {preview.detectedColumns.partOfSpeech && (
                    <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#E1F5FE', color: '#01579B' }}>
                      Cột Từ loại: "{preview.detectedColumns.partOfSpeech}"
                    </span>
                  )}
                  {preview.detectedColumns.ipa && (
                    <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#E1F5FE', color: '#01579B' }}>
                      Cột IPA: "{preview.detectedColumns.ipa}"
                    </span>
                  )}
                  {preview.detectedColumns.acceptedAnswers && (
                    <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#E1F5FE', color: '#01579B' }}>
                      Cột Đồng nghĩa: "{preview.detectedColumns.acceptedAnswers}"
                    </span>
                  )}
                </div>

                {/* Preview Table of First 5 Rows */}
                <div style={{ overflowX: 'auto', backgroundColor: '#FFF', borderRadius: '6px', border: '1px solid #FFE082' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FFF9C4', borderBottom: '1px solid #FFE082' }}>
                        <th style={{ padding: '6px 8px' }}>#</th>
                        <th style={{ padding: '6px 8px' }}>Tiếng Anh</th>
                        <th style={{ padding: '6px 8px' }}>Nghĩa Tiếng Việt</th>
                        <th style={{ padding: '6px 8px' }}>Từ loại</th>
                        <th style={{ padding: '6px 8px' }}>Phiên âm</th>
                        <th style={{ padding: '6px 8px' }}>Đồng nghĩa</th>
                        <th style={{ padding: '6px 8px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.previewRows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #FFFDE7' }}>
                          <td style={{ padding: '6px 8px', color: '#757575' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 700 }}>{row.english || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{row.vietnamese || '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#616161' }}>{row.partOfSpeech || '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#616161' }}>{row.ipa || '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#616161' }}>{row.acceptedAnswers.join(', ') || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>
                            {row.isValid ? (
                              <span style={{ color: '#2E7D32', fontWeight: 700 }}>✓ Hợp lệ</span>
                            ) : (
                              <span style={{ color: '#D32F2F', fontWeight: 700 }}>⚠️ {row.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FFE8E8',
                  color: 'var(--color-danger)',
                  border: '1.5px solid var(--color-danger)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginTop: '10px' }}>
              <StickerButton
                variant="primary"
                size="lg"
                onClick={handleImport}
                disabled={loading || !file || (preview ? !preview.detectedColumns.english || !preview.detectedColumns.vietnamese : false)}
                icon={<Upload size={20} />}
                style={{ width: '100%' }}
              >
                {loading ? 'Đang Xử Lý & Lưu Bộ Từ...' : 'Lưu Bộ Từ Vào Game'}
              </StickerButton>
            </div>
          </div>

          {/* Summary / Success result */}
          {summary && (
            <div
              style={{
                marginTop: '24px',
                padding: '20px',
                backgroundColor: '#E8F5E9',
                border: '2px solid #2E7D32',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2E7D32', fontWeight: 900 }}>
                <CheckCircle2 size={26} />
                <span style={{ fontSize: '1.2rem' }}>Đã nhập thành công bộ từ vựng!</span>
              </div>
              <ul style={{ marginTop: '12px', marginLeft: '24px', color: '#1B5E20', fontSize: '1rem', lineHeight: 1.6 }}>
                <li>Tổng số dòng trong file: <strong>{summary.totalRows}</strong></li>
                <li>Số từ vựng hợp lệ đã lưu vào bộ nhớ: <strong>{summary.validRows} từ</strong></li>
                {summary.duplicateRows > 0 && <li>Số từ bị trùng lặp đã gộp: {summary.duplicateRows} từ</li>}
                {summary.skippedRows > 0 && <li>Số dòng thiếu thông tin: {summary.skippedRows} dòng</li>}
              </ul>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                <StickerButton
                  variant="primary"
                  onClick={() => navigateTo('prepare')}
                >
                  🚀 Vào Trận Luyện Tập Ngay
                </StickerButton>
                <StickerButton onClick={() => navigateTo('library')}>
                  📚 Về Thư Viện Bộ Từ
                </StickerButton>
              </div>
            </div>
          )}
        </PaperPanel>
      </div>
    </div>
  );
};
