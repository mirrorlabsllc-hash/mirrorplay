import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { requireOpenAI, handleOpenAIError } from "../../server/services/openaiClient";
import { getJsonBody, type ReqLike, type ResLike } from "../../server/apiUtils";

const SYSTEM_PROMPT = `You are Mirror AI, a warm and supportive emotional intelligence coach. Your role is to:
1. Listen with empathy and validate feelings
2. Help users navigate difficult emotions and situations
3. Provide practical communication strategies
4. Encourage self-reflection and growth
5. Celebrate progress and wins

Be conversational, warm, and supportive. Use "I" statements and ask thoughtful questions. Keep responses concise but meaningful (2-3 paragraphs max).`;

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const message = body?.message as string | undefined;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    let conversation = await storage.getConversation(user.id);
    if (!conversation) {
      conversation = await storage.createConversation({
        userId: user.id,
        messages: [],
        emotionState: "calm",
      });
    }

    const messages = (conversation.messages as any[]) || [];
    messages.push({ role: "user", content: message });

    const chatResponse = await requireOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
    });

    const assistantMessage =
      chatResponse.choices[0].message.content ||
      "I'm here to help. Could you tell me more?";
    messages.push({ role: "assistant", content: assistantMessage });

    await storage.updateConversation(conversation.id, {
      messages,
      emotionState: "supportive",
    });

    res.status(200).json({ message: assistantMessage });
  } catch (error: any) {
    if (error?.name === "OpenAIUnavailableError") {
      return handleOpenAIError(res, error);
    }

    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
}
