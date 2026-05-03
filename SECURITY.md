# Security Policy

## Supported Versions

The following versions of VoterVerse are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :x:                |
| < 1.1.0 | :x:                |

## Reporting a Vulnerability

We take the security of VoterVerse seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to **security@voterverse.io** with a detailed description of the vulnerability, including steps to reproduce it. We will acknowledge receipt of your report within 48 hours and provide a timeline for resolution.

### Our Commitment

- We will respond to your report promptly.
- We will keep you informed of our progress.
- We will give credit to the reporter in our changelog (unless you wish to remain anonymous).
- We will not take legal action against you as long as you follow our responsible disclosure policy.

## Security Features in VoterVerse

- **Environment Validation**: Fail-fast startup logic ensures all Google Cloud secrets are present.
- **Rate Limiting**: Centralized security throttling across all API endpoints.
- **Audit Logging**: Structured logging of all security-sensitive events.
- **In-Memory Image Processing**: Election documents are processed in-memory and never persisted to storage.
