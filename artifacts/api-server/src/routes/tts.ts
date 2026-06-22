import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import {
  ListVoicesResponse,
  GenerateSpeechBody,
  GenerateSpeechResponse,
  GetHistoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";

const VOICES = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    category: "premade",
    description: "Calm, young American female",
    labels: { accent: "american", age: "young", gender: "female", use_case: "narration" },
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    category: "premade",
    description: "Soft, young American female",
    labels: { accent: "american", age: "young", gender: "female", use_case: "news" },
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    category: "premade",
    description: "Articulate, young American male",
    labels: { accent: "american", age: "young", gender: "male", use_case: "narration" },
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    category: "premade",
    description: "Warm, young American female",
    labels: { accent: "american", age: "young", gender: "female", use_case: "audiobook" },
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    category: "premade",
    description: "Deep, middle-aged American male",
    labels: { accent: "american", age: "middle aged", gender: "male", use_case: "narration" },
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    category: "premade",
    description: "Deep, middle-aged British male",
    labels: { accent: "british", age: "middle aged", gender: "male", use_case: "news" },
  },
  {
    id: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    category: "premade",
    description: "Casual, middle-aged Australian male",
    labels: { accent: "australian", age: "middle aged", gender: "male", use_case: "conversational" },
  },
  {
    id: "XB0fDUnXU5powFXDhCwa",
    name: "Charlotte",
    category: "premade",
    description: "Seductive, young Swedish female",
    labels: { accent: "swedish", age: "young", gender: "female", use_case: "video games" },
  },
  {
    id: "GBv7mTt0atIp3Br8iCZE",
    name: "Thomas",
    category: "premade",
    description: "Calm, young American male",
    labels: { accent: "american", age: "young", gender: "male", use_case: "meditation" },
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    category: "premade",
    description: "Strong, young American female",
    labels: { accent: "american", age: "young", gender: "female", use_case: "narration" },
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    category: "premade",
    description: "Raspy, middle-aged British male",
    labels: { accent: "british", age: "middle aged", gender: "male", use_case: "narration" },
  },
  {
    id: "jsCqWAovK2LkecY7zXl4",
    name: "Freya",
    category: "premade",
    description: "Overly positive, young American female",
    labels: { accent: "american", age: "young", gender: "female", use_case: "video games" },
  },
  {
    id: "D38z5RcWu1voky8WS1ja",
    name: "Fin",
    category: "premade",
    description: "Sailor, old Irish male",
    labels: { accent: "irish", age: "old", gender: "male", use_case: "video games" },
  },
  {
    id: "flq6f7yd4MFEOuihkFlD",
    name: "Michael",
    category: "premade",
    description: "Orotund, old American male",
    labels: { accent: "american", age: "old", gender: "male", use_case: "audiobook" },
  },
  {
    id: "oWAxZDx7w5VEj9dCyTzz",
    name: "Grace",
    category: "premade",
    description: "Gentle, young American female",
    labels: { accent: "american-southern", age: "young", gender: "female", use_case: "audiobook" },
  },
  {
    id: "29vD33N1CtxCmqQRPOHJ",
    name: "Drew",
    category: "premade",
    description: "Well-rounded, middle-aged American male",
    labels: { accent: "american", age: "middle aged", gender: "male", use_case: "news" },
  },
  {
    id: "CYw3kZ28EB7dI0rQBVoT",
    name: "Dave",
    category: "premade",
    description: "Conversational, young British-Essex male",
    labels: { accent: "british-essex", age: "young", gender: "male", use_case: "conversational" },
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    category: "premade",
    description: "Emotional, young American female",
    labels: { accent: "american", age: "young", gender: "female", use_case: "narration" },
  },
];

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

router.get("/voices", (_req, res): void => {
  res.json(ListVoicesResponse.parse(VOICES));
});

router.post("/tts", async (req, res): Promise<void> => {
  const parsed = GenerateSpeechBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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

  if (!ELEVENLABS_API_KEY) {
    res.status(500).json({
      error:
        "ELEVENLABS_API_KEY environment variable is not set. Please connect your ElevenLabs account.",
    });
    return;
  }

  const elevenLabsUrl = `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${voice_id}`;

  const response = await fetch(elevenLabsUrl, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    req.log.error(
      { status: response.status, error: errorText },
      "ElevenLabs API error"
    );
    res.status(response.status).json({
      error: `ElevenLabs API error: ${response.statusText}`,
    });
    return;
  }

  const audioBuffer = await response.arrayBuffer();
  const audio_base64 = Buffer.from(audioBuffer).toString("base64");
  const content_type = response.headers.get("content-type") ?? "audio/mpeg";

  const voice = VOICES.find((v) => v.id === voice_id);
  const entry: HistoryEntry = {
    id: randomUUID(),
    text,
    voice_id,
    voice_name: voice?.name ?? voice_id,
    audio_base64,
    created_at: new Date().toISOString(),
    character_count: text.length,
  };

  historyStore.unshift(entry);
  if (historyStore.length > MAX_HISTORY) {
    historyStore.splice(MAX_HISTORY);
  }

  const result = GenerateSpeechResponse.parse({
    audio_base64,
    content_type,
    character_count: text.length,
  });

  res.json(result);
});

router.get("/history", (_req, res): void => {
  const history = historyStore.map((item) => ({
    ...item,
    audio_base64: item.audio_base64,
  }));
  res.json(GetHistoryResponse.parse(history));
});

export default router;
