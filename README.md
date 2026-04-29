# 🗳️ VoterVerse — AI Election Process Education Assistant

An AI-powered web application that helps citizens, first-time voters, and students understand the Indian election process through interactive timelines, document analysis, polling booth guidance, fraud reporting, and quizzes.

## 🚀 Quick Start

```bash
# Install all dependencies
npm run install:all

# Start development servers (frontend + backend)
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8080

## 🏗️ Architecture

```
voterverse/
├── backend/              # Node.js + Express API
│   ├── server.js         # Routes + security middleware
│   ├── aiService.js      # Gemini Function Calling (3 declarations)
│   ├── database.js       # Firebase / in-memory DAL
│   └── auditLogger.js    # Structured JSON logging
├── frontend/             # React + Vite SPA
│   └── src/pages/        # 5 interactive pages
├── tests/                # Standalone mock test runner
├── config/               # Google services manifest
├── docs/                 # AI logic documentation
└── Dockerfile            # Multi-stage Cloud Run deployment
```

## 🔧 Google Services (6 integrations)

| Service | Usage |
|---------|-------|
| **Gemini 1.5 Flash** | Document Vision + Quiz Generation + Fraud Classification |
| **Firebase RTDB** | Live fraud reports, quiz sessions, timeline data |
| **Google Maps JS API** | Polling booth locator with directions |
| **Google Cloud Storage** | Fraud report evidence archives |
| **Google Cloud Run** | Serverless production hosting |
| **Google Analytics 4** | Event tracking (quiz, document, fraud) |

## 🧪 Testing

```bash
# Standalone mock tests (no server needed)
npm run test:mock

# Full CI pipeline
npm run ci

# End-to-End Tests (Playwright)
npm run test:e2e
```

## 🔒 Security

- Helmet CSP whitelisted for Google APIs
- Rate limiting: 100 req/15min per IP
- Input sanitization on all user strings
- Zero persistence of uploaded images
- HMAC-style report IDs (non-sequential)
- **Google Secret Manager**: Integrated for production key injection, ensuring zero hardcoded secrets in build artifacts.

## ♿ Accessibility

Full WAI-ARIA compliance: live regions, keyboard navigation, skip links, high-contrast toggle, semantic HTML5, 4.5:1 contrast ratio.

## 📦 Environment Variables

Copy `.env.example` to `.env` and fill in your keys. The app works without any keys using in-memory fallbacks.

## 🐳 Docker Deployment

```bash
docker build -t voterverse .
docker run -p 8080:8080 voterverse
```
