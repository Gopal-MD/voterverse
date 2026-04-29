# VoterVerse Test Cases

## Mock Tests (tests/mock-test-runner.js)
| # | Test | Expected |
|---|------|----------|
| 1 | Timeline is array of 7 | ✅ |
| 2 | Each step has title, description, icon, date, details | ✅ |
| 3 | Quiz mocks have question, 4 options, correct_index, explanation | ✅ |
| 4 | Fraud mock has valid type, severity, action | ✅ |
| 5 | Document mock has type, info, action | ✅ |
| 6 | Cloud function validators work | ✅ |
| 7 | Data files load correctly | ✅ |

## API Integration Tests (backend/tests/api.test.js)
| # | Endpoint | Test |
|---|----------|------|
| 1 | GET /api/health | Returns ok + mode |
| 2 | GET /api/config | Returns mapsApiKey |
| 3 | GET /api/metadata | Returns service info |
| 4 | GET /api/timeline | Returns 7 steps |
| 5 | POST /api/document/analyze | Structured AI response |
| 6 | POST /api/quiz/generate | Valid question shape |
| 7 | POST /api/fraud/report | Classification + reportId |
| 8 | GET /api/fraud/reports | Array of reports |
| 9 | POST /api/simulate | Seeds 3 reports |
| 10 | POST /api/report/export | Export result |

## Security Tests (backend/tests/security.test.js)
| # | Test |
|---|------|
| 1 | x-frame-options header set |
| 2 | x-content-type-options: nosniff |
| 3 | x-powered-by not exposed |
| 4 | CSP header present |
| 5 | Description truncated at 1000 chars |
| 6 | Image >5MB rejected |
| 7 | Empty body rejected |
| 8 | HMAC-style report IDs |

## Frontend Tests (frontend/src/__tests__/)
| # | Component | Test |
|---|-----------|------|
| 1 | ElectionTimeline | Renders all 7 steps |
| 2 | DocumentAnalyzer | Shows privacy notice |
| 3 | FraudReportCenter | Disables submit on empty |
| 4 | QuizArena | Shows topics, starts quiz |
