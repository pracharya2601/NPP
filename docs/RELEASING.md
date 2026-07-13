# Maintainer release process

## One-time repository setup

Before the first public release:

1. Create the public GitHub repository.
2. Add `repository`, `homepage`, and `bugs` URLs to `package.json`.
3. Replace the repository link placeholders in `CHANGELOG.md`.
4. Confirm that the `@tiat` npm organization exists and maintainers have publish access. Otherwise choose another scoped package name before `1.0.0`.
5. Enable GitHub private vulnerability reporting.
6. Configure npm Trusted Publishing for the GitHub release workflow and repository.
7. Enable branch protection requiring the CI workflow.
8. Add an npm README/profile link to the public repository.

`npm publish` intentionally runs `npm run check:release-metadata` and refuses to publish until these real public URLs are configured.

Vendure recommends scoped plugin package names, a current changelog included in the npm package, full installation and storefront documentation, compatibility metadata, and tests before submission to Vendure Hub.

## Release checklist

1. Ensure CI passes on the default branch.
2. Update `CHANGELOG.md`, moving relevant Unreleased entries into a dated version.
3. Update the version without creating an automatic Git tag:

   ```bash
   npm version <patch|minor|major> --no-git-tag-version
   ```

4. Run:

   ```bash
   npm ci
   npm run check
   npm pack --dry-run
   npm audit --omit=dev
   ```

5. Inspect the tarball file list. It must include `dist`, README, docs, changelog, license, and notices, and must exclude tests, credentials, local environment files, and private documentation.
6. Commit the version and changelog.
7. Create a signed tag `v<version>`.
8. Push the commit and tag.
9. Create a GitHub Release from the tag. The release workflow verifies that tag and package versions match, then publishes to npm with provenance.
10. Verify installation in a clean Vendure project.
11. For a stable, documented release, submit the npm and GitHub URLs to Vendure Hub.

## Versioning

The package uses Semantic Versioning.

- Patch: backwards-compatible fixes and documentation.
- Minor: backwards-compatible provider/features after 1.0.
- Major: public API, configuration, GraphQL, database, or behavioral breaking changes.

Before 1.0, a minor version may be breaking. Such changes must be clearly labeled in the changelog and migration notes.

Provider-side API changes can require urgent plugin releases even when this project's TypeScript API is unchanged.
