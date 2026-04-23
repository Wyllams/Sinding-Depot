/**
 * ─── Schedule Assignment Pause Flag ────────────────────────────
 * 
 * Set to `true` to PAUSE all service_assignment creation across the app.
 * This prevents both automatic and manual scheduling.
 * 
 * ⚠️  DO NOT DELETE — just toggle the value:
 *   - true  = paused (no new assignments created)
 *   - false = active (normal behavior)
 * 
 * When paused, all insert operations on service_assignments will be
 * silently skipped. Existing assignments remain untouched.
 */
export const SCHEDULING_PAUSED = false;
