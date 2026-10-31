-- ============================================================
-- Add global_settings table to Master Router Supabase project
-- ============================================================

CREATE TABLE IF NOT EXISTS global_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default configuration parameters
INSERT INTO global_settings (key, value) VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('allow_new_signups', 'true'::jsonb),
  ('default_trial_days', '14'::jsonb),
  ('branding_name', '"VyaraHR"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_settings_select" ON global_settings
  FOR SELECT USING (true);
CREATE POLICY "global_settings_update" ON global_settings
  FOR UPDATE USING (true);
CREATE POLICY "global_settings_insert" ON global_settings
  FOR INSERT WITH CHECK (true);
