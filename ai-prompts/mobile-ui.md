# HexaTrack AI Prompt Pack: Mobile-First UI & Responsive Engineering

Use this prompt to guide the AI in designing, auditing, or refactoring mobile interfaces, bottom sheets, navigation bars, and touch interactions.

## Prompt Template

```markdown
Act as a Senior Mobile Frontend Specialist and UI/UX Developer.
Refactor or audit the mobile layout for [PAGE/VIEW] to guarantee premium, high-density responsiveness on all device sizes.

### 1. Viewport Overflow & Scroll Mechanics
- **Horizontal Scroll Prevention**: Inspect components for static pixel width definitions. Ensure containers use flex wrapping or responsive grids. Add `max-w-full overflow-x-hidden` on parent frames to eliminate unwanted horizontal scrolling.
- **Scroll Areas**: Separate scroll contexts. The page container should remain locked with `overflow-hidden` while list content areas (e.g. Transaction Lists) use `overflow-y-auto` with inertia scroll enabling smooth momentum scrolling on iOS.

### 2. Stacking Context & Z-Index Scales
Avoid chaotic z-index assignments that cause dropdowns or modals to display behind navbars or card containers. Adhere to the HexaTrack global z-index map:
- `z-0`: Base elements (page layout background, body grids).
- `z-10` to `z-20`: Foreground components (cards, table headers, list elements).
- `z-30`: Desktop sidebar header, sticky filters, or subheaders.
- `z-40`: Bottom Navigation panel (must sit above page content).
- `z-50`: Bottom Sheet, slide-over modals, and screen backdrops.
- `z-60`: Select menus, calendar dropdown overlays, options lists.
- `z-[9999]`: Tooltips, Toast warnings, loading overlays, and security PIN overlays.

### 3. Safe Area Inset Management
Mobile screens have distinct rounded corners, top camera notches, and bottom home indicator swipe zones.
- **Header Bars**: Offset top content using `pt-[env(safe-area-inset-top,16px)]` or include margin spacing to prevent notch overlaps.
- **Bottom Navigation / FABs / Sheets**: Apply bottom padding constraints `pb-[env(safe-area-inset-bottom,16px)]` on floating layouts, bottom sheets, and the main navigation bar. This ensures text and buttons do not collide with home bar elements.

### 4. Custom Bottom Sheet System
When developing drawer-like bottom sheets (using framer-motion dragging systems):
- **Styles**: Bottom sheets must use white surfaces (`bg-white`), rounded top corners (`rounded-t-[32px]`), and a backdrop blur. Avoid dark-colored panels or black indicators.
- **CSS Variable Hooks**: Use the adaptive CSS variables `.bottom-sheet-panel` (sets white background and subtle gray borders) and `.bottom-sheet-handle` (sets drag bar indicator color) to ensure sheets integrate with the white fintech design standard.
- **Interaction**: Enable dragging along the Y-axis, spring constraints, and clicking outside/swipe down to close.

### 5. Touch Target Standards
- **Minimum Size**: All buttons, FAB indicators, toggles, and navigation links must cover a minimum surface area of `44x44px` (`min-h-[44px] min-w-[44px]` or adequate padding `p-3`).
- **Interactive Feedback**: Apply spring transitions on button press states (`whileTap={{ scale: 0.96 }}`) so the application feels responsive and tactile.
```
