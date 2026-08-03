// scripts/update-version-file.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pkgPath = path.join(__dirname, '../package.json')
const verPath = path.join(__dirname, '../src/version.js')

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const versionStr = `export const APP_VERSION = 'v${pkg.version}'\n`
  fs.writeFileSync(verPath, versionStr, 'utf8')
  console.log(`Synced src/version.js to v${pkg.version}`)
} catch (err) {
  console.error('Failed to sync version file:', err)
}
