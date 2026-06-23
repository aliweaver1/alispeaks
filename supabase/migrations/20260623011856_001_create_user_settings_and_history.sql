/*
# Create user_settings and tts_history tables

1. New Tables
- `user_settings`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users, unique, NOT NULL, defaults to auth.uid())
  - `elevenlabs_api_key` (text, nullable - user provides their own API key)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
- `tts_history`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users, NOT NULL, defaults to auth.uid())
  - `text` (text, NOT NULL - the text that was converted to speech)
  - `voice_id` (text, NOT NULL)
  - `voice_name` (text, NOT NULL)
  - `character_count` (integer, NOT NULL - for credits tracking)
  - `audio_base64` (text, nullable - base64 encoded audio)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on both tables
- Owner-scoped CRUD: each authenticated user can only access their own rows
- user_settings: one row per user (owner-scoped)
- tts_history: many rows per user (owner-scoped)

3. Important Notes
- `user_id` columns have DEFAULT auth.uid() so inserts work when client omits the owner
- API keys are stored as plain text - user is responsible for their own key security
- Character count enables credits/usage tracking per user
*/

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  elevenlabs_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS tts_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  voice_id text NOT NULL,
  voice_name text NOT NULL,
  character_count integer NOT NULL,
  audio_base64 text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tts_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_history" ON tts_history;
CREATE POLICY "select_own_history" ON tts_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_history" ON tts_history;
CREATE POLICY "insert_own_history" ON tts_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_history" ON tts_history;
CREATE POLICY "update_own_history" ON tts_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_history" ON tts_history;
CREATE POLICY "delete_own_history" ON tts_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_history_user_id ON tts_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_history_created_at ON tts_history(created_at DESC);