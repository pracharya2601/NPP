# Roadmap

This roadmap expresses direction, not a delivery commitment.

## Before 1.0

- End-to-end Vendure tests with PostgreSQL
- Official sandbox contract tests for Khalti and eSewa
- Fonepay sandbox certification, current endpoint confirmation, and production-readiness review
- Per-channel provider credentials
- Admin API and Dashboard views for payment attempts
- Operational reconciliation commands and metrics
- Improved refund workflows, including provider-specific required data
- Stable public provider-extension API

## Candidate providers

- connectIPS or NEPALPAY based on contributor and merchant demand

## 1.0 criteria

- At least one production deployment validated by maintainers
- Documented database migration and upgrade guarantees
- Stable configuration and GraphQL API
- End-to-end tests covering callback races and reconciliation
- Security review of settlement, refunds, logging, and channel isolation
- Complete Vendure Hub submission materials

Feature proposals should begin in GitHub Discussions or an issue before implementation.
