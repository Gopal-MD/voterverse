import { useState, useRef } from 'react';
import { trackEvent } from '../utils/analytics';
import { fileToBase64 } from '../utils/fileHelpers';

/**
 * DocumentAnalyzer Component
 * Allows users to upload an election-related document (e.g., Voter ID) for analysis using Gemini Vision AI.
 * Handles drag-and-drop file upload, file validation, and displays structured AI feedback.
 *
 * @component
 * @param {object} props - Component props
 * @returns
 * @throws {Error} If component fails to render
 */
export default function DocumentAnalyzer() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(f.type)) {
      setError('Unsupported file type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    setError('');
    setFile(f);
    setAnalysis(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/document/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      const _data = await res.json();
      const data = _data.success !== undefined ? (_data.success ? _data.data : _data) : _data;
      if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data.analysis);
        trackEvent('document_analyzed', { document_type: data.analysis?.document_type });
      }
    } catch (err) {
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'document_type', label: 'Document Type' },
    { key: 'key_information', label: 'Key Information' },
    { key: 'required_action', label: 'Required Action' },
    { key: 'deadline', label: 'Deadline' },
    { key: 'warning', label: 'Warning' },
  ];

  return (
    <div className="page-container">
      <section className="hero">
        <h2>📄 Document Analyzer</h2>
        <p>Upload your voter card or election notice for AI-powered analysis</p>
      </section>

      <div className="privacy-notice" role="note">
        <span>🔒</span>
        <span>
          Your document is analyzed in-memory only and is <strong>never stored</strong>. The image
          exists only for the duration of the API call.
        </span>
      </div>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload document for analysis"
        onKeyDown={(e) => {
          if (e.key === 'Enter') inputRef.current?.click();
        }}
      >
        <div className="upload-zone-icon">📤</div>
        <p>{file ? file.name : 'Drag & drop your document here, or click to browse'}</p>
        <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Supports JPEG, PNG, WebP, GIF (max 5MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
          id="document-upload"
          aria-label="Choose document file"
        />
      </div>

      {preview && (
        <div style={{ margin: '20px 0', textAlign: 'center' }}>
          <img
            src={preview}
            alt="Document preview"
            style={{
              maxWidth: '100%',
              maxHeight: 300,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}
          />
        </div>
      )}

      {error && (
        <div role="alert" style={{ color: 'var(--danger)', marginBottom: 16, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ margin: '20px 0' }}>
        <button
          className="btn btn-primary"
          onClick={analyze}
          disabled={!file || loading}
          id="analyze-btn"
        >
          {loading ? '⏳ Analyzing...' : '🔍 Analyze Document'}
        </button>
      </div>

      {loading && (
        <div className="loading-pulse" aria-live="polite">
          AI is analyzing your document...
        </div>
      )}

      {analysis && (
        <div className="glass-card analysis-result" aria-live="polite">
          <h3 style={{ marginBottom: 16 }}>Analysis Results</h3>
          {fields.map((f) =>
            analysis[f.key] ? (
              <div key={f.key} className="analysis-row">
                <span className="analysis-label">{f.label}</span>
                <span className="analysis-value">{analysis[f.key]}</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
