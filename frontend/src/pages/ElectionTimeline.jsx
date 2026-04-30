import { useState, useCallback } from 'react';
import { useFetch } from '../utils/useFetch';

export default function ElectionTimeline() {
  const [expanded, setExpanded] = useState(null);
  const [aiDetails, setAiDetails] = useState({});

  // useFetch handles loading, error, abort-on-unmount, and caching automatically
  const { data, loading, error } = useFetch('/api/timeline', { cacheKey: 'vv-timeline', cacheMs: 5 * 60_000 });
  const timeline = data?.timeline || [];

  const toggleStep = useCallback(async (step, item) => {
    if (expanded === step) { setExpanded(null); return; }
    setExpanded(step);
    if (aiDetails[step]) return; // already fetched

    setAiDetails(prev => ({ ...prev, [step]: { loading: true } }));
    try {
      const r = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: item?.title || 'election process' }),
      });
      if (!r.ok) throw new Error('API error');
      const d = await r.json();
      setAiDetails(prev => ({
        ...prev,
        [step]: { data: item?.details || d.question?.explanation || 'Learn more about this step.' },
      }));
    } catch {
      setAiDetails(prev => ({ ...prev, [step]: { data: item?.details || 'Details unavailable.' } }));
    }
  }, [expanded, aiDetails]);

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="glass-card loading-pulse" style={{ height: 80 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--danger)' }}>⚠️ Failed to load timeline. Please refresh.</p>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="hero">
        <h2>📅 Election Timeline</h2>
        <p>Follow the complete Indian election process step by step</p>
      </section>

      <div className="timeline" role="list" aria-label="Election process steps">
        {timeline.map(item => {
          const isExpanded = expanded === item.step;
          const detail = aiDetails[item.step];
          return (
            <div key={item.step} className="timeline-step" role="listitem">
              <div className="timeline-dot">{item.icon}</div>
              <div
                className="glass-card timeline-card"
                onClick={() => toggleStep(item.step, item)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleStep(item.step, item);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-expanded={isExpanded}
                aria-controls={`step-detail-${item.step}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <h3>Step {item.step}: {item.title}</h3>
                  <span className="chip chip-primary">{item.date}</span>
                </div>
                <p>{item.description}</p>
                {isExpanded && (
                  <div id={`step-detail-${item.step}`} className="timeline-details" aria-live="polite">
                    {detail?.loading
                      ? <span className="loading-pulse">AI is analyzing...</span>
                      : <span>{detail?.data || item.details}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
