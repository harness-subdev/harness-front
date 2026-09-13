# Build and release implementation plan

Goal: version and distribute the existing dependency-free Codex skill harness.
Architecture: VERSION → git archive → existing Node tests → verified tar.gz + checksum
→ read-only CI artifact → tag-only GitHub CLI publisher with write permission.

- [x] Discover main, repository contents, existing tests, absent versions/workflows/releases.
- [x] Add VERSION=0.1.0 and scripts/build.sh using Git, Node and platform archive tools.
- [x] Add pinned Actions workflow for PR/main/manual builds and tag publication.
- [x] Document manual version PR, tag publication, provenance and fail-closed recovery.
- [ ] Validate shell, original tests, archive contents/checksum and malformed version rejection.
- [ ] Commit and prepare PR; verify actual PR CI and artifact provenance.
- [ ] Integrate and publish v0.1.0 only if requested; verify tag, release assets and checksum.

No new dependencies, automatic bumps, repository protection changes or deployment.
