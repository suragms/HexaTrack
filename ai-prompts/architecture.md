# HexaTrack AI Prompt Pack: Scalable Multi-Tenant Architecture

Use this prompt to guide the AI when refactoring components, designing schemas, or implementing APIs requiring strict tenant isolation, authorization, and auditability.

## Prompt Template

```markdown
Act as a Principal SaaS Architect and Senior Backend Engineer.
Refactor the [SYSTEM/FEATURE] to scale within our secure, multi-tenant enterprise architecture.

### 1. Multi-Tenant Isolation (P0 Priority)
HexaTrack implements strict logical tenant isolation at the Workspace level:
- **Tenant Context Identification**: Every client API request must carry the `X-Workspace-Id` header. The frontend must fetch this from the active workspace store and append it globally in the API client client-side wrapper (`lib/api.ts`).
- **Backend Context Middleware**: In the ASP.NET Core API layer, all operations must be validated through the `WorkspaceContextMiddleware`. Ensure that the user's token-based organization/branch affiliations grant access to the requested `WorkspaceId`.
- **Database Query Filtering**: Implement global query filters inside the EF Core `DbContext` on tables implementing `IWorkspaceScoped` so that queries never accidentally cross-pollinate data between workspaces.

### 2. Optional Branch-Based Accounting
- Workspaces may represent general organizations or individual branches.
- **Branch Hierarchy**: Transactions can optionally be assigned to a specific `BranchId`. If no branch is selected, transactions default to the parent workspace level.
- **Access Delegation**: Branch Managers must be restricted to seeing transactions, categories, and accounts specifically assigned to their branch. Organization Owners can view and cross-query all branches within the organization.

### 3. Two-Tier Role-Based Access Control (RBAC)
Design all API routes and UI views to enforce the correct role privileges:
- **Global User Roles**:
  - `SuperAdmin`: System-wide access via `/api/admin/*`.
  - `Owner`: High-level controls (billing, full workspace deletion, organization management).
  - `BranchManager`: Scoped management over branch assets and branch staff.
  - `Staff`: Transaction creation and view access scoped strictly to assigned branches.
  - `Individual`: Standalone personal finance operations (no organizational hierarchy).
- **Workspace-Scoped Roles**:
  - `Owner`: Read/Write/Manage settings, billing, and member lists.
  - `Member / Editor`: Read/Write transactions, accounts, categories, and budgets.
  - `Viewer`: Read-only access to analytics and transactions.

### 4. Database Schema Scalability & EF Core Standard
- **Identifiers**: All primary and foreign keys must be `UUID` (`Guid` in C#) for security and distribution capability.
- **Indexes**: Explicitly index all foreign keys, specifically `WorkspaceId`, `OrganizationId`, `BranchId`, and `AccountId` to ensure rapid lookups and clean database performance under heavy loads.
- **Migrations**: Always generate migrations via Entity Framework Core command-line tools. Do not alter databases manually.

### 5. Audit Logging & Security
- **Immutability**: Financial transactions must not be silently deleted. Implement soft-deletes or transaction reversals.
- **Audit Trails**: Every mutation request (create, update, delete) must write a structured log entry into the `AuditLogs` table containing: `UserId`, `WorkspaceId`, `ActionType` (e.g., CreateTransaction), `Timestamp`, `IpAddress`, and a `Payload` JSON blob showing pre- and post-mutation values.

### 6. Real-Time Sync & Caching
- **Client Syncing**: Ensure frontend writes immediately update the active Zustand stores, followed by a background query validation.
- **Idempotency Keys**: Ensure all mutations require an `idempotencyKey` UUID from the client to prevent double-posting due to connection retries.
- **Caching Policies**: High-read metadata (categories, accounts list) should be cached via Redis at the API level and invalidated on mutations.
```
