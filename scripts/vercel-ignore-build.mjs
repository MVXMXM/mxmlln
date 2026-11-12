// Vercel treats exit 0 as "skip this build" and exit 1 as "build".
// Keep the prefix in sync with .github/workflows/bump-folio-version.yml.

const message = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? '';
const isBump = message.startsWith('Folio: bump version');
const isProduction = process.env.VERCEL_ENV === 'production';

// A missing message is a manual redeploy or a hook, so let it build.
let shouldBuild = true;
if (message !== '') {
  // Production waits for the version bump, which already contains the merged code.
  // Previews stay on for pull requests, and a bump commit does not get one.
  shouldBuild = isProduction ? isBump : !isBump;
}

process.exit(shouldBuild ? 1 : 0);
