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

export async function textToSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer | null> {
  if (!ELEVENLABS_API_KEY) {
    console.log("ElevenLabs API key not available");
    return null;
  }

  try {
    console.log("Calling ElevenLabs TTS for voice:", voiceId, "text:", text.substring(0, 50));
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
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
