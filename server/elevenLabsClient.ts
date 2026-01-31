const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export const DEFAULT_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm female" },
  { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew", description: "Warm male" },
  { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde", description: "Friendly male" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Confident female" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Soft female" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", description: "Caring male" },
] as const;

export const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export function isElevenLabsAvailable(): boolean {
  return !!ELEVENLABS_API_KEY;
}

export interface VoiceCloneResult {
  success: boolean;
  voiceId?: string;
  error?: string;
}

export async function createVoiceClone(
  name: string,
  description: string,
  audioSamples: { buffer: Buffer; filename: string }[]
): Promise<VoiceCloneResult> {
  if (!ELEVENLABS_API_KEY) {
    return { success: false, error: "ElevenLabs API key not available" };
  }

  if (audioSamples.length === 0) {
    return { success: false, error: "At least one audio sample is required" };
  }

  try {
    console.log(`Creating voice clone "${name}" with ${audioSamples.length} samples`);
    
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description || "Custom voice clone");
    
    for (const sample of audioSamples) {
      const blob = new Blob([sample.buffer], { type: "audio/mpeg" });
      formData.append("files", blob, sample.filename);
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs voice clone error:", response.status, errorText);
      return { success: false, error: `Failed to create voice clone: ${errorText}` };
    }

    const result = await response.json();
    console.log("Voice clone created successfully:", result.voice_id);
    return { success: true, voiceId: result.voice_id };
  } catch (error) {
    console.error("Error creating voice clone:", error);
    return { success: false, error: String(error) };
  }
}

export async function deleteVoiceClone(voiceId: string): Promise<boolean> {
  if (!ELEVENLABS_API_KEY) {
    return false;
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      method: "DELETE",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting voice clone:", error);
    return false;
  }
}

export async function getVoiceDetails(voiceId: string): Promise<any | null> {
  if (!ELEVENLABS_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting voice details:", error);
    return null;
  }
}

export type TtsSection = "general" | "scenario" | "analysis-what" | "analysis-how" | "analysis-reframe";

export interface TtsOptions {
  section?: TtsSection;
  difficulty?: "beginner" | "intermediate" | "advanced";
}

function sanitizeForSsml(text: string): string {
  const withoutEmoji = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
  const withoutExclaim = withoutEmoji.replace(/[!]+/g, ".");
  const withoutQuestions = withoutExclaim.replace(/[?]+/g, ".");
  const collapsed = withoutQuestions.replace(/\s+/g, " ").trim();
  return collapsed;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text: string, options: TtsOptions = {}): string {
  const section = options.section || "general";
  const difficulty = options.difficulty || "intermediate";

  const cleaned = escapeXml(sanitizeForSsml(text));
  const baseRate = section === "scenario"
    ? "88%"
    : difficulty === "advanced"
      ? "92%"
      : difficulty === "beginner"
        ? "88%"
        : "90%";

  const sentenceBreak = section === "scenario" ? " <break time=\"400ms\"/> " : " <break time=\"350ms\"/> ";
  const paragraphBreak = section === "scenario" ? "<break time=\"700ms\"/>" : "<break time=\"600ms\"/>";

  const sentences = cleaned
    .split(/(?<=[.])\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  const sentenceBody = sentences.length > 0 ? sentences.join(sentenceBreak) : cleaned;
  const withParagraphs = sentenceBody.replace(/\n\s*\n/g, paragraphBreak);
  const trailingPause = section === "scenario" ? " <break time=\"700ms\"/>" : "";

  return `<speak><prosody rate="${baseRate}" pitch="-2%">${withParagraphs}${trailingPause}</prosody></speak>`;
}

export async function textToSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID,
  options: TtsOptions = {}
): Promise<Buffer | null> {
  if (!ELEVENLABS_API_KEY) {
    console.log("ElevenLabs API key not available");
    return null;
  }

  try {
    const shaped = buildSsml(text.slice(0, 800), options);

    console.log("Calling ElevenLabs TTS for voice:", voiceId, "text:", shaped.substring(0, 80));
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: shaped,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.72,
            similarity_boost: 0.7,
            style: 0.2,
            use_speaker_boost: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("ElevenLabs TTS success, audio buffer size:", buffer.length);
    return buffer;
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    return null;
  }
}

export async function getVoiceSample(voiceId: string): Promise<Buffer | null> {
  return textToSpeech("Hello, I'm your AI companion. How can I help you today?", voiceId);
}
