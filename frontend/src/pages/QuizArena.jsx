import { useState } from 'react';
import PropTypes from 'prop-types';
import { trackEvent } from '../utils/analytics';

const TOPICS = [
  'Voter Registration', 
  'Voting Rights', 
  'Election Commission', 
  'Election Ethics', 
  'EVM & VVPAT', 
  'Model Code of Conduct'
];

/**
 * QuizArena Component
 * Interactive educational quiz powered by Gemini AI for dynamic question generation.
 * @component
 */
export default function QuizArena() {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  /**
   * Fetches a new AI-generated question based on the current topic.
   * @param {string} [t] - Optional topic override
   */
  const fetchQuestion = async (t) => {
    setLoading(true);
    setSelected(null);
    setAnswered(false);
    try {
      const r = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t || topic || 'general' }),
      });
      const _data = await r.json();
      const data = _data.success !== undefined ? (_data.success ? _data.data : _data) : _data;
      setQuestion(data.question);
      if (total === 0) trackEvent('quiz_started', { topic: t || topic });
    } catch { 
      setQuestion(null); 
    }
    setLoading(false);
  };

  /**
   * Starts a new quiz session for a specific topic.
   * @param {string} t - The selected topic
   */
  const startQuiz = (t) => {
    setTopic(t);
    setScore(0);
    setTotal(0);
    setFinished(false);
    fetchQuestion(t);
  };

  /**
   * Evaluates the selected answer and updates scores/analytics.
   */
  const submitAnswer = () => {
    if (selected === null || !question) return;
    setAnswered(true);
    const newTotal = total + 1;
    const isCorrect = selected === question.correct_index;
    const newScore = isCorrect ? score + 1 : score;
    setTotal(newTotal);
    if (isCorrect) setScore(newScore);
    trackEvent('question_answered', { correct: isCorrect, topic });
  };

  /**
   * Progresses to the next question or completes the quiz.
   */
  const nextQuestion = () => {
    if (total >= 10) {
      setFinished(true);
      trackEvent('quiz_completed', { score, total, topic });
      return;
    }
    fetchQuestion();
  };

  /**
   * Determines the CSS class for an option based on its state.
   * @param {number} i - Option index
   * @returns 
 * @throws {Error} If component fails to render
   */
  const optionClass = (i) => {
    let cls = 'quiz-option';
    if (selected === i) cls += ' selected';
    if (answered && i === question?.correct_index) cls += ' correct';
    if (answered && selected === i && i !== question?.correct_index) cls += ' wrong';
    return cls;
  };

  if (!topic && !finished) {
    return (
      <div className="page-container">
        <section className="hero">
          <h1 id="quiz-title">🧠 Quiz Arena</h1>
          <p>Test your knowledge of the Indian election process</p>
        </section>
        <h2 style={{ marginBottom: 16, fontSize: '1.2rem' }}>Choose a Topic</h2>
        <div 
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}
          role="list"
          aria-labelledby="quiz-title"
        >
          {TOPICS.map(t => (
            <button key={t} className="glass-card" onClick={() => startQuiz(t)}
              style={{ cursor: 'pointer', textAlign: 'center', padding: 24 }}
              tabIndex={0} 
              onKeyDown={e => { if (e.key === 'Enter') startQuiz(t); }}
              role="listitem"
              aria-label={`Start quiz on ${t}`}
            >
              <div style={{ fontSize: '2rem', marginBottom: 8 }} aria-hidden="true">📚</div>
              <h4>{t}</h4>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / total) * 100);
    return (
      <div className="page-container">
        <section className="hero">
          <h1 id="quiz-complete">🏆 Quiz Complete!</h1>
          <p>Here are your results for "{topic}"</p>
        </section>
        <div className="glass-card" style={{ textAlign: 'center', padding: 40 }} role="status">
          <div className="quiz-score" aria-label={`Your score: ${score} out of ${total}`}>{score}/{total}</div>
          <p style={{ color: 'var(--text-muted)', margin: '12px 0', fontSize: '1.1rem' }}>
            {pct >= 80 ? '🎉 Excellent! You know your elections!' : pct >= 50 ? '👍 Good effort! Keep learning!' : '📖 Keep studying — democracy needs informed voters!'}
          </p>
          <div className="quiz-progress" style={{ maxWidth: 300, margin: '20px auto' }}>
            <div className="quiz-progress-bar" style={{ width: `${pct}%` }} aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" />
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => startQuiz(topic)}>🔄 Retry</button>
            <button className="btn btn-outline" onClick={() => { setTopic(''); setFinished(false); }}>📚 Pick Topic</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="hero">
        <h1>🧠 Quiz Arena</h1>
        <p>Topic: {topic} — Question {total + 1} of 10</p>
      </section>

      <div className="quiz-progress">
        <div 
          className="quiz-progress-bar" 
          style={{ width: `${(total / 10) * 100}%` }} 
          role="progressbar" 
          aria-valuenow={total} 
          aria-valuemin="0" 
          aria-valuemax="10" 
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="chip chip-accent">Score: {score}/{total}</span>
        <span className="chip chip-primary" aria-current="step">Q{total + 1}/10</span>
      </div>

      {loading ? (
        <div className="loading-pulse" aria-live="polite" role="status">AI is generating a question for you...</div>
      ) : question ? (
        <div className="glass-card">
          <h3 style={{ marginBottom: 20, lineHeight: 1.5 }} id="current-question">{question.question}</h3>
          <div role="radiogroup" aria-labelledby="current-question">
            {question.options?.map((opt, i) => (
              <label key={i} className={optionClass(i)}
                tabIndex={0} 
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!answered) setSelected(i); } }}
                role="radio"
                aria-checked={selected === i}
              >
                <input type="radio" name="quiz-opt" value={i} checked={selected === i}
                  onChange={() => { if (!answered) setSelected(i); }} disabled={answered} style={{ display: 'none' }} />
                <span className="quiz-radio" />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          {answered && question.explanation && (
            <div 
              style={{ marginTop: 16, padding: 16, background: 'var(--glass)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${selected === question.correct_index ? 'var(--accent)' : 'var(--danger)'}` }}
              aria-live="polite"
              role="alert"
            >
              <strong>{selected === question.correct_index ? '✅ Correct!' : '❌ Incorrect.'}</strong>
              <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>{question.explanation}</p>
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            {!answered ? (
              <button className="btn btn-primary" onClick={submitAnswer} disabled={selected === null} id="submit-answer" aria-label="Submit your answer">
                ✅ Submit Answer
              </button>
            ) : (
              <button className="btn btn-accent" onClick={nextQuestion} id="next-question" aria-label={total >= 9 ? 'Finish and see results' : 'Go to next question'}>
                {total >= 9 ? '🏆 See Results' : '➡️ Next Question'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card" role="alert">
          <p>Failed to load question. <button className="btn btn-outline btn-sm" onClick={() => fetchQuestion()}>Retry</button></p>
        </div>
      )}
    </div>
  );
}

