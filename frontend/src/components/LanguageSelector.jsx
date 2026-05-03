import { useState } from 'react';
import PropTypes from 'prop-types';
import { SUPPORTED_LANGUAGES } from '../utils/translation';

/**
 * LanguageSelector Component
 * Provides a UI to switch between regional languages.
 * @component
 */
export default function LanguageSelector({ onLanguageChange }) {
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem('vv-lang') || 'en');

  const handleLangChange = (code) => {
    setCurrentLang(code);
    localStorage.setItem('vv-lang', code);
    if (onLanguageChange) onLanguageChange(code);
  };

  return (
    <div className="language-selector" role="region" aria-label="Language selection">
      <div className="glass-card lang-pill">
        <span style={{ marginRight: 8, fontSize: '0.9rem', opacity: 0.8 }} aria-hidden="true">
          🌐
        </span>
        <select
          value={currentLang}
          onChange={(e) => handleLangChange(e.target.value)}
          className="lang-select"
          aria-label="Change regional language"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.native} ({lang.name})
            </option>
          ))}
        </select>
      </div>

      <style>{`
        .language-selector {
          position: fixed;
          bottom: 20px;
          right: 80px;
          z-index: 1000;
        }
        .lang-pill {
          padding: 8px 16px;
          border-radius: 30px;
          display: flex;
          align-items: center;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .lang-select {
          background: transparent;
          border: none;
          color: inherit;
          font-family: inherit;
          font-size: 0.9rem;
          cursor: pointer;
          outline: none;
        }
        .lang-select option {
          background: #1a1a1a;
          color: white;
        }
        @media (max-width: 768px) {
          .language-selector {
            bottom: 10px;
            right: 10px;
          }
        }
      `}</style>
    </div>
  );
}

LanguageSelector.propTypes = {
  /** Callback function triggered when the language is changed */
  onLanguageChange: PropTypes.func.isRequired,
};
