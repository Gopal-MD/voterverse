import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const TOPICS = [
  {
    id: 'registration',
    title: 'Voter Registration',
    icon: '📝',
    description: 'Ask about Form 6, eligibility, or correcting details.',
  },
  {
    id: 'voting',
    title: 'Voting Procedure',
    icon: '🗳️',
    description: 'Learn about EVMs, VVPAT, and polling booth rules.',
  },
  {
    id: 'fraud',
    title: 'Report Fraud',
    icon: '🚨',
    description: 'Ask how to use cVIGIL or report election offences.',
  },
];

/**
 * ElectionChatbot Component
 * Provides a real-time, streaming AI chat interface powered by Gemini 2.0 Flash.
 * Handles conversation history, auto-scrolling, and contextual suggestions.
 *
 * @component
 * @param {object} props - Component props
 * @returns
 * @throws {Error} If component fails to render
 */
export default function ElectionChatbot() {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'How do I register to vote?',
    'What ID do I need at the polling booth?',
    'How can I report election fraud?',
  ]);
  const messagesEndRef = useRef(null);

  // Initialize session and load history
  useEffect(() => {
    let sid = localStorage.getItem('vv-chat-session');
    if (!sid) {
      sid = 'session-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('vv-chat-session', sid);
    }
    setSessionId(sid);

    fetch(`/api/chat/history/${sid}`)
      .then(async (res) => {
        const _d = await res.json();
        return _d.success !== undefined ? (_d.success ? _d.data : _d) : _d;
      })
      .then((data) => {
        if (data.history && data.history.length > 0) {
          setMessages(data.history);
        } else {
          // Welcome message
          setMessages([
            {
              role: 'model',
              content:
                "Hi! I'm VoterBot. Ask me anything about the Indian election process, voter registration, or voting rights.",
            },
          ]);
        }
      });
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function handleSend(text, topic = '') {
    if (!text.trim() || isLoading) return;

    const userMessage = { role: 'user', content: text };

    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: 'model', content: '', isStreaming: true },
    ]);

    setInput('');
    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text, topic }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let fullContent = '';
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const dataStr = trimmedLine.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'text') {
              fullContent += data.content;
              setMessages((prev) => {
                const newMsgs = [...prev];
                const lastIdx = newMsgs.length - 1;
                if (lastIdx >= 0 && newMsgs[lastIdx].isStreaming) {
                  newMsgs[lastIdx] = {
                    ...newMsgs[lastIdx],
                    content: fullContent,
                  };
                }
                return newMsgs;
              });
            } else if (data.type === 'suggestions') {
              // Translate suggestions if needed
              const currentLang = localStorage.getItem('vv-lang') || 'en';
              if (currentLang !== 'en') {
                const { translateText } = await import('../utils/translation');
                const translatedSugs = await Promise.all(
                  data.content.map((s) => translateText(s, currentLang))
                );
                setSuggestions(translatedSugs);
              } else {
                setSuggestions(data.content);
              }
            }
          } catch (e) {}
        }
      }

      // Final Translation for non-English users
      const currentLang = localStorage.getItem('vv-lang') || 'en';
      if (currentLang !== 'en' && fullContent) {
        const { translateText } = await import('../utils/translation');
        const translatedText = await translateText(fullContent, currentLang);
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = translatedText;
          return newMsgs;
        });
      }
    } catch (error) {
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        lastMsg.content = 'Sorry, I encountered an error. Please try again.';
        lastMsg.isError = true;
        return newMsgs;
      });
      setSuggestions(['How do I register to vote?', 'What ID do I need at the polling booth?']);
    } finally {
      setIsLoading(false);
      setMessages((prev) => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg.isStreaming) delete lastMsg.isStreaming;
        return newMsgs;
      });
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear the chat history?')) return;

    try {
      await fetch(`/api/chat/${sessionId}`, { method: 'DELETE' });
      setMessages([{ role: 'model', content: 'Chat history cleared. How can I help you today?' }]);
      setSuggestions([
        'How do I register to vote?',
        'What ID do I need at the polling booth?',
        'How can I report election fraud?',
      ]);
    } catch (err) {}
  };

  return (
    <div
      className="page-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <header className="page-header" style={{ marginBottom: '1rem' }}>
        <h2>🤖 AI Election Assistant</h2>
        <p>Get instant answers about the election process, voting rules, and more.</p>
        <button
          onClick={handleClear}
          className="btn btn-secondary"
          style={{ position: 'absolute', top: '2rem', right: '2rem' }}
        >
          Clear Chat
        </button>
      </header>

      {messages.length <= 1 && (
        <div
          className="topics-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {TOPICS.map((t) => (
            <div
              key={t.id}
              className="card topic-card"
              onClick={() => handleSend(`Tell me about ${t.title}`, t.id)}
              style={{ cursor: 'pointer' }}
            >
              <h3>
                {t.icon} {t.title}
              </h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>{t.description}</p>
            </div>
          ))}
        </div>
      )}

      <div
        className="chat-container card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '0',
          background: 'var(--bg-card)',
        }}
      >
        <div
          className="chat-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'model-bubble'} ${msg.isError ? 'error-bubble' : ''}`}
              style={{
                maxWidth: '80%',
                padding: '1rem',
                borderRadius: '12px',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--primary-color)' : 'var(--bg-surface)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="chat-content" style={{ lineHeight: '1.5' }}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.isStreaming && <span className="typing-indicator">...</span>}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {suggestions.length > 0 && !isLoading && (
          <div
            className="chat-suggestions"
            style={{
              padding: '0.5rem 1.5rem',
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            {suggestions.map((sug, i) => (
              <button
                key={i}
                className="btn btn-secondary btn-small"
                onClick={() => handleSend(sug)}
                style={{ fontSize: '0.85rem', borderRadius: '16px' }}
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        <div
          className="chat-input-area"
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
          }}
        >
          <input
            type="text"
            className="input-field"
            placeholder="Ask a question about the elections..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            disabled={isLoading}
            style={{ flex: 1, margin: 0 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSend(input)}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? 'Wait...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
