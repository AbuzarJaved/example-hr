// Chromatic CLI config — options passed to the chromatic binary
// projectToken is set via CHROMATIC_PROJECT_TOKEN env var in CI
const config = {
  projectToken: process.env.CHROMATIC_PROJECT_TOKEN,
  threshold: 0.01,
  exitOnceUploaded: false,
}

export default config
