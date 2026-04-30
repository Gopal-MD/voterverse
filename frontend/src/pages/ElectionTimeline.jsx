import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useFetch } from '../utils/useFetch';

/**
 * ElectionTimeline Component
 * Displays the 7-step Indian election process with AI-driven deep dives.
 * @component
 */
export default function ElectionTimeline() {
  const [expanded, setExpanded] = useState(null);
  const [aiDetails, setAiDetails] = useState({});

  // useFetch handles loading, error, abort-on-unmount, and caching automatically
  const { data, loading, error } = useFetch('/api/timeline', { cacheKey: 'vv-timeline', cacheMs: 5 * 60_000 });
  const timeline = data?.timeline || [];

  /**
   * Toggles the expansion of a timeline step and fetches AI details if needed.
   * @param {number} step - The step number
   * @param {object} item - The timeline item data
   */
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
      <div className="page-container" aria-busy="true" aria-label="Loading election timeline">
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
        <div className="glass-card" style={{ textAlign: 'center', padding: 40 }} role="alert">
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
        <h1 id="timeline-heading">📅 Election Timeline</h1>
        <p>Follow the complete Indian election process step by step</p>
      </section>

      <div className="timeline" role="list" aria-labelledby="timeline-heading">
        {timeline.map(item => {
          const isExpanded = expanded === item.step;
          const detail = aiDetails[item.step];
          return (
            <div key={item.step} className="timeline-step" role="listitem">
              <div className="timeline-dot" aria-hidden="true">{item.icon}</div>
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
                aria-label={`Step ${item.step}: ${item.title}. Click to expand details.`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <h3>Step {item.step}: {item.title}</h3>
                  <span className="chip chip-primary" aria-label={`Date: ${item.date}`}>{item.date}</span>
                </div>
                <p>{item.description}</p>
                {isExpanded && (
                  <div id={`step-detail-${item.step}`} className="timeline-details" aria-live="polite">
                    {detail?.loading
                      ? <span className="loading-pulse" aria-label="AI is analyzing, please wait">AI is analyzing...</span>
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

