import { Router, type IRouter } from "express";
import {
  ListVoicesResponse,
  GenerateSpeechBody,
  GenerateSpeechResponse,
  GetHistoryResponse,
} from "@workspace/api-zod";
import { supabase, getUserFromToken, getUserApiKey } from "../lib/supabase";

const router: IRouter = Router();

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";
const MODEL_ID = "eleven_multilingual_v2";
const voiceNameCache = new Map<string, string>();

router.get("/voices", async (req, res): Promise<void> => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized. Please sign in." });
    return;
  }

  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    res.status(400).json({ error: "ElevenLabs API key not configured. Please add it in Settings." });
    return;
  }

  const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/voices`, {
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) {
    req.log.error({ status: response.status }, "Failed to fetch voices from ElevenLabs");
    res.status(502).json({ error: "Failed to fetch voices from ElevenLabs" });
    return;
  }

  const data = (await response.json()) as {
    voices: Array<{
      voice_id: string;
      name: string;
      category: string;
      description?: string;
      labels?: Record<string, string>;
    }>;
  };

  const voices = data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    category: v.category ?? "premade",
    description: v.description ?? null,
    labels: v.labels ?? {},
  }));

  for (const v of voices) {
    voiceNameCache.set(v.id, v.name);
  }

  res.json(ListVoicesResponse.parse(voices));
});

router.post("/tts", async (req, res): Promise<void> => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized. Please sign in." });
    return;
  }

  const parsed = GenerateSpeechBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    res.status(400).json({ error: "ElevenLabs API key not configured. Please add it in Settings." });
    return;
  }

  const {
    text,
    voice_id,
    stability = 0.5,
    similarity_boost = 0.75,
    style = 0,
    use_speaker_boost = true,
  } = parsed.data;

  const elevenLabsUrl = `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${voice_id}`;

  const response = await fetch(elevenLabsUrl, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost,
      },
    }),
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errBody = (await response.json()) as { detail?: { message?: string } };
      if (errBody?.detail?.message) errorMessage = errBody.detail.message;
    } catch {
      // ignore parse error
    }
    req.log.error({ status: response.status, error: errorMessage }, "ElevenLabs TTS error");
    res.status(response.status).json({ error: errorMessage });
    return;
  }

  const audioBuffer = await response.arrayBuffer();
  const audio_base64 = Buffer.from(audioBuffer).toString("base64");
  const content_type = response.headers.get("content-type") ?? "audio/mpeg";
  const character_count = text.length;

  const voice_name = voiceNameCache.get(voice_id) ?? voice_id;

  const { data: historyEntry, error: insertError } = await supabase
    .from("tts_history")
    .insert({
      user_id: user.id,
      text,
      voice_id,
      voice_name,
      character_count,
      audio_base64,
    })
    .select("id, created_at")
    .single();

  if (insertError) {
    req.log.error({ error: insertError }, "Failed to save TTS history");
  }

  res.json(
    GenerateSpeechResponse.parse({
      audio_base64,
      content_type,
      character_count,
    })
  );
});

router.get("/history", async (req, res): Promise<void> => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Unauthorized. Please sign in." });
    return;
  }

  const { data, error } = await supabase
    .from("tts_history")
    .select("id, text, voice_id, voice_name, audio_base64, created_at, character_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    req.log.error({ error }, "Failed to fetch history");
    res.status(500).json({ error: "Failed to fetch history" });
    return;
  }

  const history = data.map((item) => ({
    id: item.id,
    text: item.text,
    voice_id: item.voice_id,
    voice_name: item.voice_name,
    audio_base64: item.audio_base64,
    created_at: item.created_at,
    character_count: item.character_count,
  }));

  res.json(GetHistoryResponse.parse(history));
});

export default router;
