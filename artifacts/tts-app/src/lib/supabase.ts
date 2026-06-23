import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserSettings = {
  id: string;
  user_id: string;
  elevenlabs_api_key: string | null;
  created_at: string;
  updated_at: string;
};

export type TtsHistoryEntry = {
  id: string;
  user_id: string;
  text: string;
  voice_id: string;
  voice_name: string;
  character_count: number;
  audio_base64: string | null;
  created_at: string;
};
