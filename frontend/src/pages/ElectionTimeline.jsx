import { useState, useEffect } from 'react';

export default function ElectionTimeline() {
  const [timeline, setTimeline] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [aiDetails, setAiDetails] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/timeline')
      .then(r => r.json())
      .then(data => { setTimeline(data.timeline || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleStep = async (step) => {
    if (expanded === step) { setExpanded(null); return; }
    setExpanded(step);
    if (!aiDetails[step]) {
      setAiDetails(prev => ({ ...prev, [step]: { loading: true } }));
      try {
        const item = timeline.find(t => t.step === step);
        const r = await fetch('/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: item?.title || 'election process' }),
        });
        const data = await r.json();
        setAiDetails(prev => ({ ...prev, [step]: { data: item?.details || data.question?.explanation || 'Learn more about this step.' } }));
      } catch {
        setAiDetails(prev => ({ ...prev, [step]: { data: timeline.find(t => t.step === step)?.details || 'Details unavailable.' } }));
      }
    }
  };

  if (loading) return <div className="page-container"><p className="loading-pulse">Loading timeline...</p></div>;

  return (
    <div className="page-container">
      <section className="hero">
        <h2>📅 Election Timeline</h2>
        <p>Follow the complete Indian election process step by step</p>
      </section>

      <div className="timeline" role="list" aria-label="Election process steps">
        {timeline.map(item => (
          <div key={item.step} className="timeline-step" role="listitem">
            <div className="timeline-dot">{item.icon}</div>
            <div className="glass-card timeline-card"
              onClick={() => toggleStep(item.step)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStep(item.step); } }}
              tabIndex={0}
              role="button"
              aria-expanded={expanded === item.step}
              aria-controls={`step-detail-${item.step}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3>Step {item.step}: {item.title}</h3>
                <span className="chip chip-primary">{item.date}</span>
              </div>
              <p>{item.description}</p>
              {expanded === item.step && (
                <div id={`step-detail-${item.step}`} className="timeline-details" aria-live="polite">
                  {aiDetails[item.step]?.loading
                    ? <span className="loading-pulse">AI is analyzing...</span>
                    : aiDetails[item.step]?.data || item.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
