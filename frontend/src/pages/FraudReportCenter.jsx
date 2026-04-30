import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { trackEvent } from '../utils/analytics';

const FRAUD_TYPES = [
  { value: '', label: 'Select type...' },
  { value: 'booth_capturing', label: 'Booth Capturing' },
  { value: 'vote_buying', label: 'Vote Buying' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'EVM_tampering', label: 'EVM Tampering' },
  { value: 'intimidation', label: 'Voter Intimidation' },
  { value: 'misinformation', label: 'Misinformation / Fake News' },
  { value: 'other', label: 'Other' },
];

/**
 * FraudReportCenter Component
 * Allows voters to anonymously report suspicious activities and view a transparency dashboard.
 * @component
 */
export default function FraudReportCenter() {
  const [form, setForm] = useState({ description: '', location: '', fraudType: '', evidence: null });
  const [result, setResult] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('report');

  useEffect(() => {
    if (tab === 'dashboard') fetchReports();
  }, [tab]);

  /**
   * Fetches public anonymized reports from the backend.
   */
  const fetchReports = async () => {
    try {
      const r = await fetch('/api/fraud/reports');
      const data = await r.json();
      setReports(data.reports || []);
    } catch { setReports([]); }
  };

  /**
   * Submits the fraud report for AI classification and storage.
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || form.description.trim().length < 10) {
      setError('Description must be at least 10 characters.'); return;
    }
    if (!form.location.trim()) { setError('Location is required.'); return; }
    
    setLoading(true);
    setError('');

    try {
      const body = { description: form.description, location: form.location, fraudType: form.fraudType };
      if (form.evidence) {
        const reader = new FileReader();
        const b64 = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result.split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(form.evidence);
        });
        body.evidence = b64;
      }
      const r = await fetch('/api/fraud/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.error) { setError(data.error); }
      else {
        setResult(data);
        trackEvent('fraud_reported', { fraud_type: data.fraud_type, severity: data.severity });
      }
    } catch { setError('Submission failed. Please try again.'); }
    setLoading(false);
  };

  const severityClass = (s) => `chip severity-${s || 'low'}`;

  return (
    <div className="page-container">
      <section className="hero">
        <h1 id="fraud-title">🚨 Fraud Report Center</h1>
        <p>Report suspicious election activity — your identity stays anonymous</p>
      </section>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }} role="tablist" aria-label="Fraud center sections">
        <button 
          className={`btn ${tab === 'report' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('report')} 
          id="tab-report"
          role="tab"
          aria-selected={tab === 'report'}
          aria-controls="panel-report"
        >
          📝 File Report
        </button>
        <button 
          className={`btn ${tab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('dashboard')} 
          id="tab-dashboard"
          role="tab"
          aria-selected={tab === 'dashboard'}
          aria-controls="panel-dashboard"
        >
          📊 Dashboard
        </button>
      </div>

      {tab === 'report' && (
        <div id="panel-report" role="tabpanel" aria-labelledby="tab-report">
          <div className="privacy-notice" role="note">
            <span aria-hidden="true">🔒</span>
            <span>Reports are anonymized. Evidence images are <strong>never stored</strong>. Only AI classification summaries are saved.</span>
          </div>

          {result ? (
            <div className="glass-card analysis-result" aria-live="polite" role="status">
              <h3 style={{ marginBottom: 16, color: 'var(--accent)' }}>✅ Report Submitted</h3>
              <div className="analysis-row">
                <span className="analysis-label">Report ID</span>
                <span className="analysis-value" style={{ fontFamily: 'monospace' }}>{result.reportId}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Fraud Type</span>
                <span className="analysis-value">{result.fraud_type}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Severity</span>
                <span className={severityClass(result.severity)}>{result.severity}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Action</span>
                <span className="analysis-value">{result.recommended_action}</span>
              </div>
              <div style={{ marginTop: 20 }}>
                <button className="btn btn-outline btn-block" onClick={() => setResult(null)}>
                  File Another Report
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass-card">
              <div className="form-group">
                <label htmlFor="fraud-desc" className="form-label">Description *</label>
                <textarea id="fraud-desc" className="form-textarea" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the suspicious activity you witnessed..."
                  aria-describedby="fraud-desc-help" maxLength={1000} required />
                <small id="fraud-desc-help" style={{ color: 'var(--text-muted)' }}>{form.description.length}/1000 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="fraud-loc" className="form-label">Location *</label>
                <input id="fraud-loc" type="text" className="form-input" value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g., Booth #45, Sector 12, Noida" required />
              </div>

              <div className="form-group">
                <label htmlFor="fraud-type" className="form-label">Fraud Type</label>
                <select id="fraud-type" className="form-select" value={form.fraudType}
                  onChange={e => setForm(f => ({ ...f, fraudType: e.target.value }))}>
                  {FRAUD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="fraud-evidence" className="form-label">Evidence Image (optional)</label>
                <input id="fraud-evidence" type="file" accept="image/*" className="form-input"
                  onChange={e => setForm(f => ({ ...f, evidence: e.target.files[0] || null }))} />
              </div>

              {error && <div role="alert" style={{ color: 'var(--danger)', marginBottom: 16, fontWeight: 600 }}>{error}</div>}

              <button type="submit" className="btn btn-danger" disabled={loading || !form.description.trim() || !form.location.trim()} id="submit-fraud">
                {loading ? '⏳ Submitting...' : '🚨 Submit Report'}
              </button>
            </form>
          )}
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="glass-card">
          <h3 style={{ marginBottom: 16 }}>Transparency Dashboard</h3>
          {reports.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No reports yet. <button className="btn btn-outline btn-sm" style={{ marginLeft: 8 }}
              onClick={async () => { await fetch('/api/simulate', { method: 'POST' }); fetchReports(); }}>Seed Demo Data</button></p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="reports-table">
                <thead><tr><th>ID</th><th>Type</th><th>Severity</th><th>Location</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.reportId}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.reportId?.slice(0, 16)}...</td>
                      <td>{r.fraud_type}</td>
                      <td><span className={severityClass(r.severity)}>{r.severity}</span></td>
                      <td>{r.location}</td>
                      <td><span className="chip chip-primary">{r.status}</span></td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
