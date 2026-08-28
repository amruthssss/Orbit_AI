/** Presentational chat panel for future page composition. */
import type { ChatMessage } from "../../types";

interface ChatPanelProps {
  messages: ChatMessage[];
}

export function ChatPanel({ messages }: ChatPanelProps) {
  return <div aria-label="Chat messages">{messages.map((message) => <p key={message.id}>{message.content}</p>)}</div>;
}
