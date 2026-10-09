# Publishing the reviewed Version 3 images

The owner approved the complete **Itzli V3 Final Image Review** folder on the Desktop. All 1,032 exact source-bound PNGs (1,090,531,172 bytes) were uploaded, publicly verified and activated on October 9, 2026; the pending ledger is now empty. The complete local gallery is at `http://127.0.0.1:8767/index.html`, with all 1,527 reviewed image files directly in that Desktop folder. Seventeen retained legacy images were also copied unchanged to new immutable URLs. All 1,524 currently selected image URLs have exact owner-approved byte and cache evidence.

The loopback local course also previews those images on lesson introductions, vocabulary cards and legacy flashcards. Its private `/api/local-review/images/<entry-id>?v=<image-sha256>` endpoint checks the current learner identity and meaning, original visual verdict, selected-sense source proof and exact PNG bytes. It returns no image outside local-review mode, including on Vercel. Local previews do not change publication decisions or the active manifest; the public site continues to use published assets.

`node scripts/publish-reviewed-word-images.cjs --write-plan --prepare-review` checks the current learner exclusions, original visual verdicts, exact source identities, selected bilingual meanings and local file hashes. It creates private `data/image-publication/upload-plan.json` and a human-review ledger template. It does not access AWS or publish images. The template starts with no publication approvals; rerunning preparation will not overwrite decisions.

After the owner approves the exact images, record their approval in `data/image-publication/human-review.json`: each approved entry needs its unchanged image hash and bilingual meanings, `publication_approved: true`, a reviewer and an ISO review time. A changed file or meaning invalidates that approval. Images held or excluded from the learner course cannot pass the upload guard.

Run the reviewed release with:

```powershell
node scripts/publish-reviewed-word-images.cjs --review-ledger data/image-publication/human-review.json --execute
```

The script uses the existing AWS CLI profile to upload to `nahuatl-language`, in `us-east-1`, beneath `itzli-app/images/v3/`. The owner confirmed credential rotation on October 9, 2026. All 1,032 uploads completed with exact checksums and cache verification. Future releases require read/write access to that image prefix and new approvals for their exact files.

Every URL includes the entry identity and full image SHA-256. Uploads use `image/png` and `Cache-Control: public,max-age=31536000,immutable`, SHA-256 integrity checking and a conditional write that never overwrites an existing object. Resumes verify existing checksums. Public downloads must match the exact local bytes and cache headers before the app manifest changes. Concurrency defaults to four, with a validated optional limit of 1–12. Earlier S3 objects and all original local files remain intact.

The release keeps upload receipts and private backups. The active manifest changes only after every approved upload has verified successfully; partial runs can resume without activating an incomplete release. Source identities, bilingual meanings, selected-sense proof, visual verdicts and exact hashes are preserved in the active manifest. Homographs remain distinct entries. The lesson resolver uses that exact identity and meaning rather than substituting artwork for another sense.

Existing one-image legacy publication remains available. The V3 publisher handles the newer private production folders and full review ledger. The image and content audits must pass after activation. Deploying the site is a separate release step.

AWS references: [PutObject](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html), [object metadata](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html).
