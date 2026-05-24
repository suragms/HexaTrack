# HexaTrack AI Prompt Pack: Supabase & PostgreSQL Multi-Tenancy

Use this prompt to guide the AI in writing database migrations, Postgres functions, stored procedures, and Row Level Security (RLS) policies.

## Prompt Template

```markdown
Act as a Supabase Database Architect and Senior PostgreSQL Administrator.
Design the database schema, migration script, or RLS policies for [FEATURE] using standard Postgres SQL conventions.

### 1. Multi-Tenant Database Design
Every table created (with the exception of global system lookups) must have strict tenant isolation bound to the active Workspace:
- **Columns**: Include `workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE` on all transactional or data-entry tables.
- **Optional Branches**: If the feature spans branches, include `branch_id UUID REFERENCES branches(id) ON DELETE SET NULL` with validation check constraints.
- **Identifiers**: Primary keys must be defined as `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.

### 2. Indexes for Scale & Query Isolation
To guarantee fast query performance under heavy workspace multi-tenancy:
- **Foreign Key Indexes**: Explicitly index all tenant references:
  `CREATE INDEX idx_tablename_workspace_id ON table_name(workspace_id);`
- **Composite Indexes**: For transactional queries that sort or filter by timestamp or active states, create composite indexes:
  `CREATE INDEX idx_tablename_workspace_date ON table_name(workspace_id, created_at DESC);`

### 3. Row Level Security (RLS) Policies
Every table in Supabase must have Row Level Security enabled (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`). Do not write unrestricted policies.
- **Tenant Verification Function**: Access checks should utilize a helper function checking the authenticated user's workspace memberships:
  `CREATE OR REPLACE FUNCTION get_user_workspaces() RETURNS setof uuid AS $$ ... $$ LANGUAGE sql SECURITY DEFINER;`
- **RLS Policy Definitions**: Create explicit policies for each operation:
  - **Read**:
    `CREATE POLICY select_workspace_data ON table_name FOR SELECT TO authenticated USING (workspace_id IN (SELECT get_user_workspaces()));`
  - **Insert**:
    `CREATE POLICY insert_workspace_data ON table_name FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT get_user_workspaces()));`
  - **Update/Delete**:
    `CREATE POLICY mutate_workspace_data ON table_name FOR UPDATE TO authenticated USING (workspace_id IN (SELECT get_user_workspaces())) WITH CHECK (workspace_id IN (SELECT get_user_workspaces()));`

### 4. Database Functions & Triggers (Ledger Calculations & Audits)
- **Automatic Updated At**: Write a trigger function to auto-update modification timestamps:
  ```sql
  CREATE OR REPLACE FUNCTION update_modified_column() RETURNS trigger AS $$
  BEGIN
      NEW.updated_at = now();
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```
- **Auditing Trigger**: For high-risk financial tables, write a trigger to insert details into an `audit_logs` table on modification.
- **Accumulated Balance Functions**: When updating transactions, use PL/pgSQL database functions or transactional checks to update active `account_balances` automatically, preventing client-side drift or race conditions.

### 5. Real-Time Sync Configurations
- Enable replication on tables that require real-time client state hydration (e.g. active transactions, budget limits).
- Limit the published real-time streams to authorized connections only, filtering data matching the client's current authorized `workspace_id`.
```
