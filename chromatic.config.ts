import { defineConfig } from 'chromatic'

export default defineConfig({
  // Set CHROMATIC_PROJECT_TOKEN in CI environment variables
  projectToken: process.env.CHROMATIC_PROJECT_TOKEN,
  // Only count visual diffs above 0.01 (1%) as changes
  threshold: 0.01,
  // Don't fail CI on new story additions (only on visual regressions)
  exitOnceUploaded: false,
})
