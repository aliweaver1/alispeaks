import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import {
  ListVoicesResponse,
  GenerateSpeechBody,
  GenerateSpeechResponse,
  GetHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";
const MODEL_ID = "eleven_multilingual_v2";

function getApiKey(): string | undefined {
  return process.env.ELEVENLABS_API_KEY;
}

interface HistoryEntry {
  id: string;
  text: string;
  voice_id: string;
  voice_name: string;
  audio_base64: string | null;
  created_at: string;
  character_count: number;
}

const historyStore: HistoryEntry[] = [];
const MAX_HISTORY = 20;
const voiceNameCache = new Map<string, string>();

router.get("/voices", async (req, res): Promise<void> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(500).json({ error: "ELEVENLABS_API_KEY is not configured." });
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
  const parsed = GenerateSpeechBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(500).json({ error: "ELEVENLABS_API_KEY is not configured." });
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

  const entry: HistoryEntry = {
    id: randomUUID(),
    text,
    voice_id,
    voice_name: voiceNameCache.get(voice_id) ?? voice_id,
    audio_base64,
    created_at: new Date().toISOString(),
    character_count: text.length,
  };

  historyStore.unshift(entry);
  if (historyStore.length > MAX_HISTORY) {
    historyStore.splice(MAX_HISTORY);
  }

  res.json(
    GenerateSpeechResponse.parse({
      audio_base64,
      content_type,
      character_count: text.length,
    })
  );
});

router.get("/history", (_req, res): void => {
  res.json(GetHistoryResponse.parse(historyStore));
});

export default router;
