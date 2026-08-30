# Strict Architecture & Project Rules for Art Gallery (Inspico)

## 1. NEVER DUMP BINARY, BASE64, OR MASSIVE TEXT INTO `app_settings`
- `app_settings` is strictly for **lightweight scalar configurations** (booleans, thresholds, timestamps, short JSON settings like team colors or maintenance status).
- **CRITICAL**: NEVER store Base64 images, raw file blobs, huge rulebooks (>10KB), or gallery media arrays inside `app_settings`.
- Supabase warning `Value is larger than 10,240 characters` is an immediate violation of this rule.

## 2. STRICT STORAGE & MEDIA ARCHITECTURE
- All images, posters, photos, and media assets MUST be stored in dedicated **Supabase Storage Buckets** (e.g. `event-media/thumbs/`, `event-media/hd/`).
- The database tables (e.g., `gallery_media`) MUST ONLY store the lightweight public CDN URL strings (`https://...`), never raw base64 data.
- **Preview vs HD**: Always generate and query lightweight compressed thumbnails (`thumbs/`, <20KB) for all listings, feeds, and dashboards. High-definition files (`hd/`) must ONLY be fetched on-demand when a user clicks 'Download' or opens full-screen Lightbox.

## 3. PROPER SCHEMA DESIGN OVER LAZY ROW-DUMPING
- If structured data is needed (e.g., media items, competition rules, reports, logs), create dedicated SQL tables with proper columns, data types, indexes, and foreign keys.
- Do NOT serialize complex application models into single JSON columns in `app_settings` just to avoid creating tables.

## 4. TRANSPARENT COMMUNICATION REGARDING SUPABASE ACCESS
- If Supabase schema changes (new tables, storage buckets, RLS policies, RPC functions) are required, execute them directly via Supabase MCP `execute_sql` or explicitly state the requirement to the user immediately. Never cut corners or dump data into improper columns due to hesitation or uncommunicated constraints.

## 5. NO `SELECT * FROM app_settings` ON DASHBOARDS
- Dashboards (Announcer, Admin, Teams, Invigilators, Public Landing Page) must NEVER execute unconstrained `SELECT * FROM app_settings`. Always filter by specific keys with `.select('key, value').in('key', [...])` or dedicated RPC functions.

## 6. STRICT GIT VERSION CONTROL & PUSH POLICY
- **CRITICAL**: Never execute `git push` or push code to remote repositories without explicit user instruction and permission.
- **CRITICAL**: Never run destructive Git commands (e.g., `git checkout .`, `git restore .`, `git reset --hard`) without explicit user permission.
- If you need to revert or discard changes, document the reasoning clearly in a markdown file or discuss it with the user beforehand.

## 7. LANDING PAGE & UI COMPONENT STABILITY
- **3D Poster Slider:** The horizontal 3D Carousel on the landing page (centering active item with drag/swipe and transform physics) must be maintained and verified during edits.
- **Hero & Side Layouts:** The "What the Next?" typewriting effect and the side column (`theme2.png`) are core design elements and must not be stripped or overwritten.
- **Build Verification:** Always verify changes with `npm run build` to catch duplicate identifier declarations, syntax issues, or broken template literals before completing a task.

## 8. CODE MODIFICATION BEST PRACTICES
- Be cautious of file locking on Windows when the Vite dev server is running.
- Ensure proper escaping for multi-line strings and template literals (` ` `).
