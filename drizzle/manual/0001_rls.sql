-- Row Level Security for every user-owned table.
--
-- This is the security boundary, not a nicety: the Supabase client connects as
-- the end user, so these policies are what stop one freelancer reading
-- another's contracts. Drizzle cannot express RLS, so this file is applied by
-- hand after `drizzle-kit migrate`.
--
-- Adding a user-owned table? Add its policy here in the same commit.
--
-- Every policy is dropped before it is created so this file can be re-applied
-- safely — `npm run db:setup` runs it on every deploy of the schema.

-- ---------------------------------------------------------------------------
-- Tables keyed directly by user_id
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON profiles;
CREATE POLICY "own rows" ON profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON clients;
CREATE POLICY "own rows" ON clients
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON projects;
CREATE POLICY "own rows" ON projects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON documents;
CREATE POLICY "own rows" ON documents
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON invoices;
CREATE POLICY "own rows" ON invoices
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON invoice_counters;
CREATE POLICY "own rows" ON invoice_counters
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON uploads;
CREATE POLICY "own rows" ON uploads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON subscriptions;
CREATE POLICY "own rows" ON subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows" ON events;
CREATE POLICY "own rows" ON events
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Append-only tables: readable and insertable by the owner, never mutable.
-- These two are the audit trail; allowing UPDATE or DELETE would defeat them.
-- ---------------------------------------------------------------------------

ALTER TABLE disclaimer_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows read" ON disclaimer_logs;
CREATE POLICY "own rows read" ON disclaimer_logs
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own rows insert" ON disclaimer_logs;
CREATE POLICY "own rows insert" ON disclaimer_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- document_versions has no user_id of its own; ownership is inherited from the
-- parent document, so the policy joins back to it.
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own rows read" ON document_versions;
CREATE POLICY "own rows read" ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id AND d.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "own rows insert" ON document_versions;
CREATE POLICY "own rows insert" ON document_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id AND d.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Public reference data: readable by everyone, writable by no one through the
-- client. Seeding and edits go through the service-role key.
-- ---------------------------------------------------------------------------

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read" ON templates;
CREATE POLICY "public read" ON templates FOR SELECT USING (is_active = true);

ALTER TABLE guidance_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read" ON guidance_rules;
CREATE POLICY "public read" ON guidance_rules FOR SELECT USING (active = true);

-- ---------------------------------------------------------------------------
-- webhook_events is server-only. RLS is on with no policy at all, which denies
-- every client request; the service-role key bypasses RLS and can still write.
-- ---------------------------------------------------------------------------

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
