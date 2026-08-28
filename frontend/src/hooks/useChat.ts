/** Minimal state hook for non-streaming chat consumers. */
import { useState } from "react";
import type { ChatMessage } from "../types";
import { sendChat, toChatMessage } from "../services/chat";

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  async function send(message: string): Promise<void> {
    setLoading(true);
    try {
      const response = await sendChat({ session_id: sessionId, message });
      setMessages((current) => [...current, toChatMessage(response)]);
    } finally {
      setLoading(false);
    }
  }
  return { messages, loading, send };
}
