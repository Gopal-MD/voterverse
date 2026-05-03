# Contributing to VoterVerse

Thank you for your interest in contributing to VoterVerse! We welcome contributions that improve the platform's reliability, educational value, and accessibility.

## 🚀 Getting Started

1. **Fork & Clone**: Fork the repository and clone it to your local machine.
2. **Environment Setup**:
   - Install dependencies: `npm run install:all`
   - Set up environment variables: Copy `.env.example` to `.env` and fill in the required Google Cloud and Firebase secrets.
3. **Run Locally**: `npm run dev` starts both the frontend (Vite) and backend (Express).

## 🛠️ Development Standards

To maintain high code quality and enterprise standards, please adhere to the following guidelines:

### 1. Code Style

- **Formatting**: We use Prettier for consistent formatting. Run `npm run format` before committing.
- **Linting**: We use ESLint to catch common errors. Run `npm run lint` to check your changes.
- **Rules**: Avoid `console.log` in production code. Use the centralized `auditLogger` in the backend.

### 2. Documentation

- **JSDoc**: Every exported function, utility, and React component must have a complete JSDoc block defining `@param`, `@returns`, and `@throws`.
- **Comments**: Write clear, concise comments for complex logic. Avoid "what" comments; focus on "why".

### 3. Testing

- **Coverage**: We aim for 95%+ test coverage. Add tests for all new features and edge cases.
- **Run Tests**: `npm test` runs the full suite (Backend, Frontend, and Mock integration).

### 4. Pull Request Process

1. Create a descriptive branch: `feature/amazing-new-logic` or `fix/critical-bug`.
2. Ensure CI passes locally: `npm run ci`.
3. Update the `README.md` if your change affects usage or adds new features.
4. Request a review from the core maintainers.

## 🤝 Code of Conduct

Please be respectful and professional in all interactions. We strive to maintain an inclusive environment for all contributors.

---

_VoterVerse — Empowering every citizen with election knowledge._
