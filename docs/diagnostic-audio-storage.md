# Private diagnostic audio

Experimental MMS, Google and OpenAI candidates belong in ignored local storage:

```text
data/audio-v3/diagnostics/{mms,google,openai}/candidates/
```

The MMS candidate index also stays under `data/audio-v3/diagnostics/mms/`; newly generated diagnostic metadata has a private filesystem path and no learner audio URL. Provider scripts reject an output directory under `public/`, including a private-looking directory that resolves into `public/` through a link. This does not approve an experiment as learner audio.

Before a build, `node scripts/prepare-release-media.cjs --archive` moves old diagnostic files from these three prefixes only:

- `public/audio-v3/candidates/`
- `public/audio-v3/google-candidates/`
- `public/audio-v3/openai-candidates/`

Every move retains the original filename and SHA-256 in a private rollback manifest under `data/audio-v3/release-archives/`. No file is deleted or overwritten. The guard checks workspace boundaries and refuses linked paths, unfamiliar names, learner-referenced files, non-diagnostic MMS provenance, or bytes differing from the MMS sidecar. Learner recordings in other directories and existing images are outside its scope.

`node scripts/prepare-release-media.cjs --check` verifies that no files remain in those public diagnostic prefixes. A backend tracing exclusion alone cannot achieve this: Next.js serves files under `public/` directly.

To reverse a particular archive, use its reported manifest path:

```text
node scripts/prepare-release-media.cjs --restore data/audio-v3/release-archives/<run>/rollback-manifest.json
```

Rollback checks every original and archived path and hash before moving anything. A conflicting file causes it to stop without overwriting it. The guard will archive restored diagnostics again before the next build. Reports and archived files retain their earlier model and license notices; archiving grants no new rights or pronunciation approval.
