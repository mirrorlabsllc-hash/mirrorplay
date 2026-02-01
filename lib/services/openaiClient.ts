import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;
let initAttempted = false;

export function getOpenAI(): OpenAI | null {
  if (initAttempted) {
    return openaiInstance;
  }
  
  initAttempted = true;
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI: API key not configured. AI features will be unavailable.");
    return null;
  }
  
  try {
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("OpenAI: Client initialized successfully.");
  } catch (error) {
    console.error("OpenAI: Failed to initialize client:", error);
    openaiInstance = null;
  }
  
  return openaiInstance;
}

export function isOpenAIAvailable(): boolean {
  return getOpenAI() !== null;
}

export function requireOpenAI(): OpenAI {
  const client = getOpenAI();
  if (!client) {
    throw new OpenAIUnavailableError();
  }
  return client;
}

export class OpenAIUnavailableError extends Error {
  constructor() {
    super("AI features are temporarily unavailable. Please try again later.");
    this.name = "OpenAIUnavailableError";
  }
}

export function handleOpenAIError(res: any, error: unknown) {
  if (error instanceof OpenAIUnavailableError) {
    return res.status(503).json({ 
      message: "AI features are temporarily unavailable. Please try again later.",
      code: "AI_UNAVAILABLE"
    });
  }
  throw error;
}
