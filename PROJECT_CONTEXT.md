# HexaTrack Context

Multi-tenant, premium, mobile-first finance workspace platform for founders, freelancers, business owners, and families to separate their finances cleanly.

---

## 👥 Roles & Access Model

HexaTrack operates on a two-tier identity and authorization model:

### 1. Global User Roles (`organizationRole` / `targetRole`)
*   **SuperAdmin:** Global administrative role. Manages organizations, user lockouts, subscription overrides, and global features via scoped `/api/admin/*` controllers.
*   **Owner:** Organization Admin / Owner. Has billing controls and full administrative capabilities over their organization.
*   **BranchManager:** Controls specific branches, manages accounting data, and supervises staff within their branch scope.
*   **Staff:** Entry-level operational role scoped to transactions and basic entries within assigned branches.
*   **Individual:** Personal finance users operating outside of any formal organization hierarchy.

### 2. Workspace-Scoped Roles (`WorkspaceRoleName`)
Every user must belong to a Workspace. Permissions inside a specific workspace are governed by:
*   **Owner:** Full control over workspace settings, members, and deletion.
*   **Member / Editor:** Can view and add/edit transactions, accounts, categories, and budgets.
*   **Viewer:** Read-only access to workspace analytics, transactions, and settings.

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand (state management), Framer Motion, Zod (validation), Lucide React (icons only)
*   **Backend:** ASP.NET Core, Entity Framework Core (PostgreSQL migrations as canonical database schema standard), Npgsql, Hangfire (background jobs), Redis (caching/sessions), JWT (auth)
*   **Database:** PostgreSQL (Hosted on Render)
*   **Hosting:** Vercel (Frontend), Render (Backend API at `https://hexatrack.onrender.com`)

---

## 🎨 Design System & Visual Lock

HexaTrack uses a premium, light-mode-first fintech visual language resembling Stripe, Mercury, and Brex. **Theme accent is Emerald `#10B981`** (never violet `#8B5CF6` or blue `#4F8CFF` by default).

| Token | CSS Variable Value | Purpose |
| :--- | :--- | :--- |
| `background` | `#F9FAFB` | Main app and page background |
| `surface` | `#FFFFFF` | Cards, panels, bottom navigation sheets |
| `primary` | `#10B981` | Primary CTA, links, and selected states |
| `secondary` | `#059669` | Secondary interactive states |
| `success` | `#10B981` | Positive balances, credits, and income |
| `expense` | `#FF5C75` / `#EF4444` | Destructive actions, negative balances, and expenses |
| `border` | `#E5E7EB` | Borders, dividers, and card outlines |
| `textPrimary` | `#111827` | Primary reading text |
| `textMuted` | `#6B7280` | Subtext, labels, and secondary reading text |

---

## ✨ Features

*   **Income & Expense Tracking:** High-accuracy calculations, transfer processing, and multi-currency separations.
*   **Subcategories:** Support for nested category structuring under parent groups.
*   **Recurring Transactions:** Background-scheduled transactions via Hangfire.
*   **Branch-Based Accounting:** Scoped transaction entries for organizations split across multiple branches.
*   **Workspace System (P0 Priority):** Complete workspace-level isolation on every query, write, and API route (`X-Workspace-Id` header).
*   **Reports & Analytics:** Calm, high-density visualization surfaces.
*   **Mobile-First Responsive UI:** Bottom navigation menu, zero-layout-collision screens, and PWA packaging support.

---

## 📂 Core Folder Architecture

```text
HexaTrack/
├── app/                      # Next.js 15 App Router pages & page layouts
├── components/               # React UI components (ui/, layout/, admin/, workspace/, staff/)
├── lib/                      # API client instance (api.ts), types, & frontend utils
├── store/                    # Zustand stores (auth-store.ts, workspace-store.ts, etc.)
├── public/                   # Static files, favicons, PWA manifest
├── docs/                     # Canonical engineering, API, & design guardrails
├── features/                 # Markdown specs detailing discrete features
└── backend/
    └── HexaTrack.Api/        # ASP.NET Core API endpoints, migrations, and DbContext
```

---

## 📖 Canonical Engineering Rules

1.  **Finance Trust:** Zero silent balance corruptions, strict validation checks on numbers, EF Core transactions for mutating queries, and API-level idempotency checks.
2.  **No AI Slop:** Ensure all UIs are clean, fast, high-contrast, fully typed, responsive, and follow layout rules.
3.  **Scoped Requests:** Every API client request passes `X-Workspace-Id` header; backend filters resource queries against workspace membership.
