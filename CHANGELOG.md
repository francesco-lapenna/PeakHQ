# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- New entries go at the top, below this comment -->

## [0.1.3] - 2026-06-23

### Added

- Styled 404 page rendered for any unmatched authenticated route, preserving the nav shell
- Global error boundary page for unexpected runtime errors, showing the error message and a dashboard link
- `@testing-library/jest-dom` matchers (`toBeInTheDocument`, `toHaveAttribute`, etc.) now available in all frontend tests via `test-setup.ts`

## [0.1.2] - 2026-06-22

### Fixed

- Added production CloudFront domain to Cognito User Pool Client callback and logout URLs so the Hosted UI redirects back to the live SPA after login

## [0.1.1] - 2026-06-22

### Fixed

- CloudFront distribution creation failed because `api.apiEndpoint` is a CDK token at synth time — JS `.replace()` had no effect, passing the full `https://` URL as the CloudFront origin domain name. Fixed with `Fn.select(2, Fn.split('/'))` to strip the protocol at CloudFormation evaluation time

## [0.1.0] - 2026-06-22

### Added

- React 19 SPA on S3 + CloudFront: Cognito PKCE auth, weekly dashboard (BW entry, trend chart, weekly log table), training (exercise library, program builder, session logger), nutrition (meal plans with macro tracking, Open Food Facts food search, favourites), settings (weight unit, active program/plan, JSON export)
- CI/CD: CDK deploy → parse outputs → build frontend with live `VITE_*` env vars → S3 sync → CloudFront invalidation
- Frontend build verification step in CI with stub env vars
- Backend Lambda handlers for all API routes: profile, exercises (with GSI progression), programs, sessions, tracking (body weight + weekly logs), nutrition, export
- AWS infrastructure: Cognito User Pool + Hosted UI, API Gateway HTTP API v2 with JWT authorizer, DynamoDB single-table on-demand, CloudFront (SPA + `/api/*` proxy), S3 private bucket, GitHub Actions OIDC deploy role
- Monorepo tooling: npm workspaces, ESLint + Prettier + TypeScript strict, Vitest (jsdom + node projects), CDK snapshot tests (Jest)
