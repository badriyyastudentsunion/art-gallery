// scripts/update-version-file.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pkgPath = path.join(__dirname, '../package.json')
const verPath = path.join(__dirname, '../src/version.js')
const pubVerPath = path.join(__dirname, '../public/version.json')

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const version = `v${pkg.version}`
  const buildTime = Date.now()

  // 1. Sync src/version.js
  const versionStr = `export const APP_VERSION = '${version}'\nexport const BUILD_TIME = ${buildTime}\n`
  fs.writeFileSync(verPath, versionStr, 'utf8')

  // 2. Sync public/version.json for HTTP polling
  const jsonContent = JSON.stringify({ version, buildTime }, null, 2)
  fs.writeFileSync(pubVerPath, jsonContent, 'utf8')

  console.log(`Synced version to ${version} (${new Date(buildTime).toLocaleTimeString()})`)
} catch (err) {
  console.error('Failed to sync version file:', err)
}
