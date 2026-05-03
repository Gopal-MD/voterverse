# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-05-03
### Added
- Enterprise-grade TypeScript definitions (`backend/types/voterverse.js`).
- `SECURITY.md` with Threat Model and OWASP compliance checklist.
- Performance metrics documented in `README.md`.
- SonarQube and OWASP compliance badges.
- Standardized `CONTRIBUTING.md`.

### Changed
- Refactored monolithic `server.js` into modular route controllers.
- Migrated to ESLint 9 Flat Config for modern enterprise standards.
- Optimized frontend rendering to resolve cascading render warnings in `useEffect`.

### Fixed
- Variable hoisting issues in Google Maps initialization.
- Unused error variables in catch blocks globally.
- Race conditions in simulation result exports.

## [1.1.0] - 2026-04-30
### Added
- Gemini 2.0 Flash integration for real-time election chat.
- Gemini Vision API for voter ID analysis.
- Firebase Realtime Database for state management.
- Unit and Integration test suite using Vitest.

## [1.0.0] - 2026-04-15
### Added
- Initial MVP release of VoterVerse.
- Basic election timeline and quiz features.
- Basic Express server and React frontend.
