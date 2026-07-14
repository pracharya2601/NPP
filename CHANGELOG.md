# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- End-to-end tests against provider sandboxes and a real Vendure test server
- Fonepay acquiring-bank sandbox certification and current endpoint/TLS confirmation
- Channel-specific provider credentials
- Admin Dashboard payment-attempt and reconciliation views

## [0.2.0] - 2026-07-14

### Added

- Experimental Fonepay Dynamic QR initiation and authenticated PRN status verification
- Fonepay HMAC-SHA512 hexadecimal signing, compact PRN generation, response validation, and contract tests
- Fonepay Vendure payment handler, configuration, storefront QR guidance, and reconciliation documentation
- Dedicated Fonepay protocol, security, test-status, and sandbox-certification guide
- Security and support guidance for QR payloads and provider WebSocket capability URLs

## [0.1.0] - 2026-07-13

### Added

- Vendure 3.7 plugin package with MIT licensing
- Khalti KPG-2 payment initiation, lookup verification, and wallet refunds, with bank-refund limitations documented
- eSewa ePay v2 signed form generation, callback validation, and status verification
- Persistent and idempotent payment-attempt records
- Authenticated settlement proofs bound to a Vendure order
- GET and POST provider callback routes
- Scheduled reconciliation for pending payments
- NPR-safe integer amount conversion
- Storefront GraphQL API and integration documentation
- Unit tests for configuration, signing, amount conversion, Khalti, and eSewa

[Unreleased]: https://github.com/pracharya2601/NPP/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/pracharya2601/NPP/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pracharya2601/NPP/releases/tag/v0.1.0
