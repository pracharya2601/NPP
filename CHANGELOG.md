# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- End-to-end tests against provider sandboxes and a real Vendure test server
- Fonepay dynamic QR support after official merchant API documentation is available
- Channel-specific provider credentials
- Admin Dashboard payment-attempt and reconciliation views

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
