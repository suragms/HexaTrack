# HexaTrack AI Prompt Pack: Premium FinTech Design & Financial UX

Use this prompt to guide the AI in designing high-density financial layouts, dashboards, analytics charts, transaction logs, and ledger representations.

## Prompt Template

```markdown
Act as a Lead FinTech UI/UX Designer and Frontend Specialist.
Design and implement the financial visual dashboard or ledger view for [FINTECH FEATURE] ensuring supreme visual clarity, high accessibility, and absolute calculation trustworthiness.

### 1. Zero Silent Balance Corruption (Financial Integrity)
Fintech applications must represent values with absolute accuracy:
- **Client Rounding**: All display calculations, aggregations, and currency representations must avoid floating-point rounding errors. Always utilize the EPSILON-safe `round()` helper from `@/lib/format` which calculates:
  `Math.round((value + Number.EPSILON) * 100) / 100`
- **Ledger Verification**: Never update database balances from client-computed totals. The UI must only reflect database values or locally queued sync events with explicit status indicators.

### 2. High-Density Typography & Currencies
- **Numeric Alignment**: For columns of transaction amounts, budgets, or balances, apply tabular numbers (`font-mono tabular-nums` or `font-sans tabular-nums`). This guarantees that digits align vertically for scanning.
- **Visual Color Coding**:
  - **Income / Credit / Cash Inflow**: Vibrant Emerald (`text-[#1FD18B]`). Always prefix positive entries with a plus sign (e.g. `+ $1,250.00`).
  - **Expense / Debit / Cash Outflow**: Rose Crimson (`text-[#FF5C75]`). Always prefix negative entries with a minus sign (e.g. `- $340.50`).
  - **Transfers / Neutral**: Soft Muted Slate (`text-[#8B9BB4]`) with a transfer icon.
- **Currency Isolation**: If a user manages multi-currency accounts, always display the appropriate ISO currency glyph next to the amount (e.g. `USD`, `INR`, `EUR`) and group them separately.

### 3. Glassmorphic Charting & Analytics Aesthetics
- **Card Surfaces**: Charts must reside inside sleek, high-contrast containers using clean white surfaces (`bg-white border border-gray-200 rounded-2xl shadow-[0_10px_30px_rgba(16,42,67,0.04)]`).
- **Graph Aesthetics**: Keep charts simple and clean. Use thin lines, soft gradients (e.g., fill under active lines matching the emerald accent color `#10B981` fading to transparent), and custom interactive hover tooltips (utilizing `bg-white/95 border-gray-200` card styling with thin borders).
- **KPI Trends**: Use clean chevron indicators showing comparison metrics. E.g., `▲ +4.2% vs last month` in emerald or `▼ -1.8% vs last month` in crimson.

### 4. Sync, Offline, & Error Status Visibility
Because HexaTrack supports offline operations:
- **Offline States**: Locally saved transactions in the sync queue must be visually marked (e.g. with a subtle dotted border or a sync-pending icon `lucide-loader` or `lucide-cloud-drizzle` in muted gray).
- **Online Sync Success**: Once synced successfully, smoothly transition the element to fully opaque and display a brief checkmark or notification state.
- **Failed Sync Warning**: Highlight any transaction queue item that failed verification with a soft crimson outline and a retry CTA icon.
```
