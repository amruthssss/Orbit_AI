/** Chat page composition seam; feature behavior remains in App.tsx. */
import { ChatPanel } from "../components/chat";

export function ChatPage() {
  return <ChatPanel messages={[]} />;
}
