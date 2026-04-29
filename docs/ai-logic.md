# VoterVerse AI Logic Documentation

## Architecture Overview

VoterVerse uses **Google Gemini 1.5 Flash** with **Advanced Function Calling** to provide three core AI capabilities. The AI service (`backend/aiService.js`) is isolated from route logic.

## Function Declarations

### 1. `explain_election_document`
- **Purpose**: Analyze voter ID cards, election notices, or forms using Gemini Vision
- **Input**: Base64-encoded image + MIME type
- **Output**: `{ document_type, key_information, required_action, deadline?, warning? }`
- **Privacy**: Images processed in-memory only — NEVER stored or logged

### 2. `generate_quiz_question`
- **Purpose**: Generate educational quiz questions about election process
- **Input**: Topic string (e.g., "voter registration", "EVM machines")
- **Output**: `{ question, options[4], correct_index, explanation }`

### 3. `classify_fraud_report`
- **Purpose**: Classify reported suspicious election activity
- **Input**: Description string of the suspicious activity
- **Output**: `{ fraud_type, severity, recommended_action, eci_reference }`

## Fallback Strategy

When `GEMINI_API_KEY` is not set:
- All three functions return curated mock responses
- Mock responses are factually accurate and educational
- The `_mock: true` flag is included in responses

When Gemini API fails:
- Functions return mock data with `_fallback: true` and `_error` message
- No request is lost — user always gets a response

## Provider Pattern

The database (`backend/database.js`) uses the Provider Pattern:
- **Firebase mode**: When `FIREBASE_*` env vars are set
- **Memory mode**: In-memory Map with pre-seeded data
- Both providers expose identical async API
