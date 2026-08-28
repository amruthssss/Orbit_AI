/** Chat API operations; streaming UI remains in the existing application. */
import type { ChatMessage } from "../types";
import { request } from "./api";

export interface ChatRequest {
  session_id: string;
  message: string;
}

export interface ChatResponse {
  session_id: string;
  response: string;
}

export function sendChat(payload: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function toChatMessage(response: ChatResponse): ChatMessage {
  return { id: response.session_id, role: "assistant", content: response.response };
}
