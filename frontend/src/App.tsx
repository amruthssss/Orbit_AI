import { Component, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Page = "chat" | "knowledge" | "resume" | "content" | "research" | "agents" | "evaluation" | "analytics" | "settings";
type Message = { id: number; role: "user" | "assistant"; content: string; error?: boolean };
type DocumentItem = { id: string; name: string; collection: string; chunks: number; characters: number; created_at: string };
type LoadState = "idle" | "loading" | "success" | "error";
type Health = { status: string; environment: string; database: string; redis: string; gemini_model: string };
type ApiErrorPayload = { detail?: string | { msg?: string }[] };

class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function clearSession() {
  localStorage.removeItem("orbit-token");
  localStorage.removeItem("orbit-name");
  localStorage.removeItem("orbit-session");
  window.dispatchEvent(new Event("orbit:session-expired"));
}

function requestHeaders(options?: RequestInit): Headers {
  const headers = new Headers(options?.headers);
  const token = localStorage.getItem("orbit-token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}
const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL || ""
).replace(/\/+$/, "");

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

const modules: { id: Page; label: string; icon: string; group: string }[] = [
  { id: "chat", label: "Chat", icon: "✦", group: "Workspace" },
  { id: "knowledge", label: "Knowledge base", icon: "▤", group: "Workspace" },
  { id: "resume", label: "Resume lab", icon: "▧", group: "Create" },
  { id: "content", label: "Content studio", icon: "✎", group: "Create" },
  { id: "research", label: "Research", icon: "⌕", group: "Automate" },
  { id: "agents", label: "Agents & workflows", icon: "◈", group: "Automate" },
  { id: "evaluation", label: "Evaluations", icon: "✓", group: "Operate" },
  { id: "analytics", label: "Analytics", icon: "↗", group: "Operate" },
  { id: "settings", label: "Settings", icon: "⚙", group: "System" },
];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = requestHeaders(options);
  const response = await fetch(apiUrl(path), { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
    const detail = Array.isArray(payload.detail)
      ? payload.detail.map((item) => item.msg).filter(Boolean).join(" · ")
      : payload.detail;
    if (response.status === 401 && !path.startsWith("/api/auth/")) clearSession();
    throw new ApiRequestError(detail || `Request failed (${response.status}).`, response.status);
  }
  return response.json();
}

function LoginView({ onAuthenticated, notice }: { onAuthenticated: (name: string) => void; notice?: string }) {
  const [registering, setRegistering] = useState(false); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit() { setLoading(true); setError(""); try { const data = await api<{ token: string; user?: { name?: string; email?: string } }>(registering ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registering ? { email, password, name } : { email, password, name: "Local user" }) }); localStorage.setItem("orbit-token", data.token); const displayName = data.user?.name || email.split("@")[0] || "Orbit user"; localStorage.setItem("orbit-name", displayName); onAuthenticated(displayName); } catch (caught) { setError(caught instanceof Error ? caught.message : "Authentication failed."); } finally { setLoading(false); } }
  return <main className="auth-shell"><section className="auth-story"><div className="brand auth-brand"><span className="brand-mark">✦</span><div>orbit<span>AI ENGINEERING</span></div></div><div className="auth-story-copy"><p className="eyebrow">YOUR AI WORKSPACE</p><h1>Make room for<br /><span>better thinking.</span></h1><p>One place to explore ideas, work with your knowledge, and turn research into action.</p><div className="auth-feature-list"><span><i>✦</i> Grounded conversations</span><span><i>◈</i> Practical AI workflows</span><span><i>↗</i> Clear, measurable results</span></div></div><div className="auth-story-foot"><span className="online" /> Private workspace <span>·</span> Built for focused work</div></section><section className="auth-form-wrap"><form className="card auth-card" onSubmit={(event) => { event.preventDefault(); void submit(); }}><p className="eyebrow">{registering ? "GET STARTED" : "WELCOME BACK"}</p><h2>{registering ? "Create your account" : "Sign in to Orbit"}</h2><p className="auth-intro">{registering ? "Set up your AI engineering workspace." : "Continue to your AI engineering workspace."}</p>{notice && <p className="auth-notice" role="status">{notice}</p>}{registering && <label htmlFor="auth-name">Full name<input id="auth-name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}<label htmlFor="auth-email">Email address<input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label htmlFor="auth-password">Password<input id="auth-password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={4} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label><button className="button primary full auth-submit" type="submit" disabled={!email.trim() || password.length < 4 || (registering && !name.trim()) || loading}>{loading ? <><span className="spinner" />{registering ? "Creating account…" : "Signing in…"}</> : registering ? "Create account" : "Sign in"}<span aria-hidden="true">→</span></button>{error && <StatusMessage state="error" error={error} />}<p className="auth-toggle">{registering ? "Already have an account?" : "New to Orbit?"}<button type="button" className="text-button" onClick={() => { setRegistering(!registering); setError(""); }}>{registering ? "Sign in" : "Create an account"}</button></p></form><p className="auth-legal">Your credentials are securely handled by the Orbit API.</p></section></main>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return <>{parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  })}</>;
}

function FormattedResponse({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] = [];
  let inCode = false;
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={`list-${blocks.length}`}>{list.items.map((item, index) => <li key={index}><InlineMarkdown text={item} /></li>)}</Tag>);
    list = null;
  };
  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
        code = [];
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (heading) {
      flushList();
      const Tag = heading[1].length === 1 ? "h3" : "h4";
      blocks.push(<Tag key={index}><InlineMarkdown text={heading[2]} /></Tag>);
    } else if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((bullet || ordered)![1]);
    } else if (line.trim()) {
      flushList();
      blocks.push(<p key={index}><InlineMarkdown text={line} /></p>);
    } else {
      flushList();
    }
  });
  if (inCode) blocks.push(<pre key="code-final"><code>{code.join("\n")}</code></pre>);
  flushList();
  return <div className="formatted-response">{blocks}</div>;
}

class ResponseErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    return this.state.hasError
      ? <p className="message-error">Unable to get a response. Please try again.</p>
      : this.props.children;
  }
}

function StatusMessage({ state, error, success }: { state: LoadState; error?: string; success?: string }) {
  if (state === "loading") return <p className="status loading" role="status"><span className="spinner" />Working…</p>;
  if (state === "error") return <p className="status error" role="alert">⚠ {error || "Something went wrong. Please try again."}</p>;
  if (state === "success" && success) return <p className="status success" role="status">✓ {success}</p>;
  return null;
}

function ChatView({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const streamController = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    localStorage.setItem("orbit-session", sessionId);
    setMessages([]); setInput(""); setBusy(false); setError(""); nextId.current = 0;
    if (composerRef.current) composerRef.current.style.height = "auto";
    void api<{ messages: { role: string; content: string }[] }>(`/chat/${sessionId}`)
      .then((data) => { if (!active) return; nextId.current = data.messages.length; setMessages(data.messages.map((item, index) => ({
        id: index + 1,
        role: item.role === "model" ? "assistant" : "user",
        content: item.content,
      }))); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load conversation history."); });
    return () => { active = false; streamController.current?.abort(); };
  }, [sessionId]);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (typeof element.scrollTo === "function") {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    } else {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    const userId = ++nextId.current;
    const assistantId = ++nextId.current;
    const controller = new AbortController(); streamController.current = controller;
    setInput(""); setBusy(true); setError("");
    if (composerRef.current) composerRef.current.style.height = "auto";
    setMessages((old) => [...old, { id: userId, role: "user", content: text }, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const response = await fetch(apiUrl("/chat/stream"), { method: "POST", headers: requestHeaders({ headers: { "Content-Type": "application/json" } }), body: JSON.stringify({ session_id: sessionId, message: text }), signal: controller.signal });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
        const detail = Array.isArray(payload.detail) ? payload.detail.map((item) => item.msg).filter(Boolean).join(" · ") : payload.detail;
        if (response.status === 401) clearSession();
        throw new ApiRequestError(detail || `Unable to get a response (${response.status}).`, response.status);
      }
      if (!response.body) throw new Error("Streaming is unavailable for this response.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let answer = "";
      while (true) {
        let timeoutId = 0;
        const chunk = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => { timeoutId = window.setTimeout(() => { void reader.cancel(); reject(new Error("Orbit response timed out. Please try again.")); }, 30000); }),
        ]).finally(() => window.clearTimeout(timeoutId));
        if (chunk.done) break;
        answer += decoder.decode(chunk.value, { stream: true });
        setMessages((old) => old.map((item) => item.id === assistantId ? { ...item, content: answer } : item));
      }
      answer += decoder.decode();
      if (!answer.trim()) throw new Error("Unable to get a response. Please try again.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      const message = caught instanceof ApiRequestError
        ? caught.message
        : caught instanceof Error && caught.message !== "Failed to fetch"
          ? caught.message
          : "Orbit could not connect. Check your connection and try again.";
      setError(message);
      setMessages((old) => old.map((item) => item.id === assistantId ? { ...item, content: message, error: true } : item));
    } finally { if (streamController.current === controller) streamController.current = null; setBusy(false); }
  }

  return <div className="chat-view">
    <header className="chat-header">
      <div><p className="eyebrow">CONVERSATION</p><h1>Think with Orbit</h1><p className="chat-subtitle">Your private AI workspace for research, writing, and decisions.</p></div>
      <div className="model-pill"><span className="pulse" /> Orbit AI <span className="chevron">⌄</span></div>
    </header>
    {!messages.length ? <div className="chat-empty">
      <section className="chat-landing">
        <div className="landing-hero">
          <div className="landing-copy"><p className="kicker">YOUR AI WORKSPACE</p><h2>Ideas move<br /><span>faster here.</span></h2><p className="empty-copy">Ask a question, bring in your own knowledge, or turn a rough thought into a clear next step.</p><div className="landing-trust"><span><i>✓</i> Answers can use your files</span><span><i>↗</i> Responses stream live</span></div></div>
          <div className="orbit-art" aria-hidden="true"><div className="orbit-glow" /><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" /><div className="orbit-core">✦</div><span className="orbit-node node-one">✧</span><span className="orbit-node node-two">◈</span><span className="orbit-node node-three">●</span><span className="orbit-caption">THINK · CONNECT · CREATE</span></div>
        </div>
        <div className="prompt-section"><div className="prompt-heading"><div><p className="eyebrow">GET STARTED</p><h3>Pick a starting point</h3></div><span>Or ask anything below</span></div><div className="prompt-grid">{[{ icon: "⌕", title: "Explore an idea", text: "Explain retrieval augmented generation" }, { icon: "⌘", title: "Solve a problem", text: "Help me design a clean API" }, { icon: "✎", title: "Shape a draft", text: "Review a product brief" }].map((item) => <button key={item.title} onClick={() => void send(item.text)}><span className="prompt-icon">{item.icon}</span><span className="prompt-text"><strong>{item.title}</strong><small>{item.text}</small></span><b aria-hidden="true">↗</b></button>)}</div></div>
      </section>
    </div> : <div ref={scrollRef} className="message-list">{messages.map((message) => <div className={`message ${message.role}`} key={message.id}><div className="message-avatar">{message.role === "assistant" ? "✦" : (localStorage.getItem("orbit-name") || "Y").slice(0, 1).toUpperCase()}</div><div className="message-body"><div className="message-label">{message.role === "assistant" ? "Orbit" : (localStorage.getItem("orbit-name") || "You")} <span>{message.role === "assistant" ? "AI assistant" : "Just now"}</span></div><div className={`message-content ${message.error ? "message-error" : ""}`}>{message.content ? (message.role === "assistant" ? <ResponseErrorBoundary><FormattedResponse content={message.content} /></ResponseErrorBoundary> : message.content) : <><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></>}</div></div></div>)}</div>}
    {error && <StatusMessage state="error" error={error} />}
    <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(input); }}><textarea ref={composerRef} aria-label="Message Orbit" value={input} onChange={(event) => { setInput(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }} placeholder="Ask Orbit anything…" rows={1} disabled={busy} /><button aria-label="Send message" type="submit" disabled={busy || !input.trim()}>↑</button></form>
    <p className="fine-print">Enter to send · Shift + Enter for a new line · AI output should be reviewed</p>
  </div>;
}

function KnowledgeView() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState(""); const [results, setResults] = useState<{ name: string; text: string; score: number }[]>([]);
  const [state, setState] = useState<LoadState>("loading"); const [error, setError] = useState(""); const [uploading, setUploading] = useState(false);
  async function refresh() { setState("loading"); try { const data = await api<{ documents: DocumentItem[] }>("/api/knowledge/documents"); setDocs(data.documents); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load documents."); setState("error"); } }
  useEffect(() => { void refresh(); }, []);
  async function upload(file: File) { setUploading(true); setError(""); try { const form = new FormData(); form.append("file", file); await api("/api/knowledge/documents/upload", { method: "POST", body: form }); await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to upload document."); } finally { setUploading(false); } }
  async function remove(documentId: string) { setError(""); try { await api(`/api/knowledge/documents/${documentId}`, { method: "DELETE" }); await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to delete document."); } }
  async function search() { if (!query.trim()) return; setState("loading"); setError(""); try { const data = await api<{ results: typeof results }>("/api/knowledge/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) }); setResults(data.results); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Search failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Knowledge base" subtitle="Ground answers in your own documents with lightweight local retrieval." action={<label className={`button primary ${uploading ? "is-loading" : ""}`}>＋ {uploading ? "Uploading…" : "Add document"}<input type="file" hidden accept=".pdf,.docx,.txt,.md,.json,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,application/json,text/csv" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} /></label>} /><Card><div className="search-row"><div className="input-with-icon">⌕<input aria-label="Search indexed knowledge" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void search()} placeholder="Search indexed knowledge…" /></div><button className="button" onClick={() => void search()} disabled={!query.trim() || state === "loading"}>Search</button></div><StatusMessage state={state === "error" ? "error" : results.length ? "success" : "idle"} error={error} success={results.length ? `Retrieved ${results.length} matching source${results.length === 1 ? "" : "s"}.` : undefined} />{results.length > 0 && <div className="result-list"><div className="result-heading">Retrieved context <span>{results.length} matches</span></div>{results.map((result) => <div className="result" key={result.name + result.text}><div><strong>{result.name}</strong><small>match {Math.round(result.score * 100)}%</small></div><p>{result.text}</p><span className="source-chip">Source · indexed document</span></div>)}</div>}</Card><div className="section-title">Indexed documents <span>{docs.length}</span></div><Card className="table-card">{state === "loading" && !docs.length ? <StatusMessage state="loading" /> : docs.length ? docs.map((doc) => <div className="table-row" key={doc.id}><span className="file-icon">▤</span><div><strong>{doc.name}</strong><small>{doc.collection} · {doc.chunks} chunks</small></div><span className="muted">{doc.characters.toLocaleString()} chars</span><button className="button subtle" onClick={() => void remove(doc.id)}>Delete</button></div>) : <Empty text="No documents yet. Upload a PDF, DOCX, or text file to create your first collection." />}</Card></div>;
}

function ResumeView() {
  const [resume, setResume] = useState(""); const [job, setJob] = useState(""); const [result, setResult] = useState<{ score: number; matched_skills: string[]; missing_skills: string[]; recommendations: string[] }>(); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function analyze() { setState("loading"); setError(""); try { const data = await api<NonNullable<typeof result>>("/api/resume/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume, job_description: job }) }); setResult(data); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Analysis failed."); setState("error"); } }
  async function analyzeFile(file: File) { setState("loading"); setError(""); try { const form = new FormData(); form.append("file", file); form.append("job_description", job); const data = await api<NonNullable<typeof result>>("/api/resume/analyze-file", { method: "POST", body: form }); setResult(data); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Analysis failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Resume lab" subtitle="Turn a resume and job description into a focused, actionable review." /><div className="two-col"><Card><label>Upload PDF resume<input type="file" accept=".pdf,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void analyzeFile(file); event.currentTarget.value = ""; }} /></label><label>Resume text<textarea className="large-input" value={resume} onChange={(event) => setResume(event.target.value)} placeholder="Paste resume text here…" /></label><label>Job description <span className="muted">(optional)</span><textarea className="large-input short" value={job} onChange={(event) => setJob(event.target.value)} placeholder="Paste the role requirements…" /></label><button className="button primary full" disabled={!resume.trim() || state === "loading"} onClick={() => void analyze()}>{state === "loading" ? "Analyzing…" : "Analyze resume"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success="Analysis complete." /></Card>{result ? <Card className="result-panel"><div className="score-ring"><b>{result.score}%</b><span>match score</span></div><h3>Strengths</h3><div className="tag-list">{result.matched_skills.map((skill) => <span className="tag green" key={skill}>{skill}</span>)}</div><h3>Opportunities</h3><div className="tag-list">{result.missing_skills.length ? result.missing_skills.map((skill) => <span className="tag amber" key={skill}>{skill}</span>) : <span className="muted">No obvious skill gaps.</span>}</div><h3>Recommendations</h3><ul className="clean-list">{result.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></Card> : <Card className="empty-panel"><div className="hero-icon small">▧</div><h3>Your review will appear here</h3><p>We’ll identify signals, gaps and next steps.</p></Card>}</div></div>;
}

function ContentView() {
  const [kind, setKind] = useState("custom"); const [tone, setTone] = useState("professional"); const [prompt, setPrompt] = useState(""); const [output, setOutput] = useState(""); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function generate() { setState("loading"); setError(""); try { const data = await api<{ content: string }>("/api/content/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, prompt, tone }) }); setOutput(data.content); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Generation failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Content studio" subtitle="Draft polished content with reusable, reviewable generation." /><Card><div className="form-grid"><label>Format<select value={kind} onChange={(event) => setKind(event.target.value)}>{["custom", "email", "blog", "social", "outline"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Tone<select value={tone} onChange={(event) => setTone(event.target.value)}><option>professional</option><option>friendly</option><option>direct</option></select></label></div><label>Brief<textarea className="large-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="What would you like to create?" /></label><button className="button primary" disabled={!prompt.trim() || state === "loading"} onClick={() => void generate()}>{state === "loading" ? "Generating…" : "Generate draft"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success="Draft generated." /></Card>{output && <Card className="output-card"><div className="card-heading"><div><span className="eyebrow">GENERATED OUTPUT</span><h3>Draft</h3></div><button className="button subtle" onClick={() => navigator.clipboard?.writeText(output)}>Copy</button></div><pre>{output}</pre></Card>}</div>;
}

function ResearchView() {
  const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState<{ answer: string; depth: string; status?: string; sources: { title?: string; url?: string; content?: string }[] }>(); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function research() { setState("loading"); setError(""); try { const data = await api<NonNullable<typeof answer>>("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, depth: "standard" }) }); setAnswer(data); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Research failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Research" subtitle="Search the web and review the source material behind every brief." /><Card><label>Research question<input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && !event.shiftKey && void research()} placeholder="What do you want to understand?" /></label><button className="button primary" disabled={!question.trim() || state === "loading"} onClick={() => void research()}>{state === "loading" ? "Researching…" : "Start research"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success={answer?.status === "ready" ? "Research complete." : undefined} /></Card>{answer && <Card className="output-card"><div className="card-heading"><div><span className="eyebrow">{(answer.depth || "standard").toUpperCase()} BRIEF</span><h3>Research summary</h3></div><span className={`research-status ${answer.status === "ready" ? "ready" : "unavailable"}`}>{answer.status === "ready" ? "Sources found" : "Research unavailable"}</span></div><p className="research-answer">{answer.answer}</p>{answer.sources.length ? <div className="source-list"><h3>Sources <span className="muted">· {answer.sources.length}</span></h3><div className="research-sources">{answer.sources.map((source) => <article className="research-source" key={source.url || source.title}>{source.url && /^https?:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}<span>Open source ↗</span></a> : <strong>{source.title || "Source"}</strong>}<p>{source.content || source.url}</p></article>)}</div></div> : <div className="notice">This brief has no linked sources. Check the research service status and verify claims independently.</div>}</Card>}</div>;
}

function AgentsView() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [steps, setSteps] = useState<{ name: string; status: string }[]>([]); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function run() { setState("loading"); setError(""); try { const data = await api<{ output: string; steps: { name: string; status: string }[] }>("/api/workflows/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Writing workflow", steps: ["Understand", "Draft", "Review"], input }) }); setOutput(data.output); setSteps(data.steps); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Workflow failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Agents & workflows" subtitle="Compose explicit steps and inspect each result instead of running opaque automation." /><Card><label>Workflow input<textarea className="large-input short" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Describe the task for your workflow…" /></label><div className="workflow-steps">{["Understand", "Draft", "Review"].map((step, index) => <span key={step}><b>0{index + 1}</b> {step}</span>)}</div><button className="button primary" disabled={!input.trim() || state === "loading"} onClick={() => void run()}>{state === "loading" ? "Running workflow…" : "Run workflow"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success="Workflow complete." /></Card>{output && <Card className="output-card"><h3>Workflow output</h3>{steps.length > 0 && <div className="tag-list">{steps.map((step) => <span className="tag green" key={step.name}>{step.name}: {step.status}</span>)}</div>}<pre>{output}</pre></Card>}</div>;
}

function EvaluationView() {
  const [expected, setExpected] = useState(""); const [actual, setActual] = useState(""); const [score, setScore] = useState<number>(); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function evaluate() { setState("loading"); setError(""); try { const data = await api<{ score: number }>("/api/evaluations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "manual evaluation", expected, actual }) }); setScore(data.score); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Evaluation failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Evaluations" subtitle="Measure an output against an expected answer with a transparent lexical baseline." /><Card><label>Expected answer<textarea className="large-input short" value={expected} onChange={(event) => setExpected(event.target.value)} placeholder="Optional reference answer…" /></label><label>Actual answer<textarea className="large-input short" value={actual} onChange={(event) => setActual(event.target.value)} placeholder="Paste model output…" /></label><button className="button primary" disabled={!actual.trim() || state === "loading"} onClick={() => void evaluate()}>{state === "loading" ? "Evaluating…" : "Evaluate"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success="Evaluation complete." />{score !== undefined && <div className="metric-banner">Evaluation score <strong>{Math.round(score * 100)}%</strong><span>Lexical baseline · completed</span></div>}</Card></div>;
}

function AnalyticsView() {
  const [metrics, setMetrics] = useState<{ usage: { requests: number; avg_latency_ms: number; tokens: number } }>(); const [state, setState] = useState<LoadState>("loading"); const [error, setError] = useState("");
  useEffect(() => { void api<typeof metrics>("/api/observability/metrics").then((data) => { setMetrics(data); setState("success"); }).catch((caught) => { setError(caught instanceof Error ? caught.message : "Unable to load metrics."); setState("error"); }); }, []);
  return <div className="view"><ViewHeading title="Analytics" subtitle="A lightweight view of platform health and usage." /><StatusMessage state={state} error={error} success="Metrics refreshed." /><div className="metric-grid"><Metric label="Requests" value={metrics?.usage.requests} detail="recorded interactions" icon="⌁" /><Metric label="Avg latency" value={metrics ? `${Math.round(metrics.usage.avg_latency_ms)} ms` : undefined} detail="across tracked calls" icon="◷" /><Metric label="Tokens" value={metrics?.usage.tokens} detail="provider-reported usage" icon="✦" /></div><Card className="empty-panel"><div className="hero-icon small">↗</div><h3>Observability is intentionally honest</h3><p>Connect your tracing provider for time-series dashboards. The API exposes a stable metrics endpoint for that integration.</p></Card></div>;
}

function Metric({ label, value, detail, icon }: { label: string; value?: number | string; detail: string; icon: string }) { return <Card className="metric-card"><span className="metric-icon">{icon}</span><span className="muted">{label}</span><strong>{value ?? "—"}</strong><small>{detail}</small></Card>; }
function SettingsView() {
  const [health, setHealth] = useState<Health>();
  const [state, setState] = useState<LoadState>("loading");
  const refresh = () => { setState("loading"); void api<Health>("/health").then((data) => { setHealth(data); setState("success"); }).catch(() => { setHealth(undefined); setState("error"); }); };
  useEffect(refresh, []);
  const cacheUnavailable = health?.redis === "unavailable";
  const cacheLabel = health?.redis === "disabled" ? "Local fallback" : health?.redis || (state === "loading" ? "Checking" : "Unavailable");
  return <div className="view">
    <ViewHeading title="System status" subtitle="See which parts of the Orbit service are responding." action={<button className="button subtle" onClick={refresh} disabled={state === "loading"}>{state === "loading" ? "Checking…" : "Refresh status"}</button>} />
    <div className="service-grid">
      <Card className="service-card"><span className={`service-indicator ${health?.status === "ok" ? "good" : health ? "warn" : "bad"}`} /><div><small>API</small><strong>{health?.status === "ok" ? "Healthy" : health ? "Degraded" : state === "loading" ? "Checking" : "Unavailable"}</strong><p>{health ? health.status === "ok" ? "The backend and its required services are ready." : "The backend responded, but a required service needs attention." : "The frontend could not reach the backend."}</p></div></Card>
      <Card className="service-card"><span className={`service-indicator ${health?.database === "ready" ? "good" : "warn"}`} /><div><small>DATABASE</small><strong>{health?.database || (state === "loading" ? "Checking" : "Unavailable")}</strong><p>{health?.database === "ready" ? "Persistent storage is ready." : "Storage may limit sign-in and saved data."}</p></div></Card>
      <Card className="service-card"><span className={`service-indicator ${cacheUnavailable ? "warn" : health ? "good" : "bad"}`} /><div><small>CACHE</small><strong>{cacheLabel}</strong><p>{health?.redis === "disabled" ? "Local rate limiting is active; Redis is optional." : cacheUnavailable ? "Redis is unavailable; the backend uses local fallback." : "Cache state reported by the backend."}</p></div></Card>
    </div>
    <Card className="settings-list"><div><strong>Environment</strong><span>{health?.environment || "—"}</span></div><div><strong>Model</strong><span>{health?.gemini_model || "—"}</span></div></Card>
    <p className="settings-note">Credentials and model keys stay on the server. A database warning does not necessarily mean the API is offline.</p>
  </div>;
}
function ViewHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) { return <header className="view-heading"><div><p className="eyebrow">ORBIT WORKSPACE</p><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>; }
function Empty({ text }: { text: string }) { return <div className="empty"><span>◇</span><p>{text}</p></div>; }

export default function App() {
  const [page, setPage] = useState<Page>("chat"); const [mobileOpen, setMobileOpen] = useState(false); const [chatSessionId, setChatSessionId] = useState(() => localStorage.getItem("orbit-session") || `session-${crypto.randomUUID()}`); const [authState, setAuthState] = useState<"checking" | "signed-in" | "signed-out">(() => localStorage.getItem("orbit-token") ? "checking" : "signed-out"); const [authNotice, setAuthNotice] = useState(""); const [health, setHealth] = useState<Health>(); const [userName, setUserName] = useState(() => localStorage.getItem("orbit-name") || "");
  useEffect(() => {
    const onExpired = () => { setAuthState("signed-out"); setUserName(""); setChatSessionId(`session-${crypto.randomUUID()}`); setAuthNotice("Your session expired. Sign in again to continue."); };
    window.addEventListener("orbit:session-expired", onExpired);
    if (localStorage.getItem("orbit-token")) {
      void api("/api/observability/metrics").then(() => setAuthState("signed-in")).catch((error) => {
        if (error instanceof ApiRequestError && error.status === 401) onExpired();
        else setAuthState("signed-in");
      });
    } else setAuthState("signed-out");
    const refreshHealth = () => { void api<Health>("/health").then(setHealth).catch(() => setHealth(undefined)); };
    refreshHealth();
    const healthTimer = window.setInterval(refreshHealth, 30000);
    return () => { window.clearInterval(healthTimer); window.removeEventListener("orbit:session-expired", onExpired); };
  }, []);
  const startConversation = () => {
    const nextSession = `session-${crypto.randomUUID()}`;
    setChatSessionId(nextSession); localStorage.setItem("orbit-session", nextSession);
    setPage("chat"); setMobileOpen(false);
  };
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (authState === "signed-in" && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "") && !target?.isContentEditable) {
        event.preventDefault(); startConversation();
      }
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [authState, chatSessionId]);
  if (authState === "checking") return <main className="auth-loading"><span className="brand-mark">✦</span><span className="spinner" />Restoring your workspace…</main>;
  if (authState === "signed-out") return <LoginView notice={authNotice} onAuthenticated={(name) => { setUserName(name); setAuthNotice(""); setAuthState("signed-in"); }} />;
  const render = { chat: <ChatView sessionId={chatSessionId} />, knowledge: <KnowledgeView />, resume: <ResumeView />, content: <ContentView />, research: <ResearchView />, agents: <AgentsView />, evaluation: <EvaluationView />, analytics: <AnalyticsView />, settings: <SettingsView /> }[page];
  const displayName = userName || "Orbit user";
  const apiStatus = !health ? "unavailable" : health.status === "ok" ? "online" : "degraded";
  const signOut = () => { localStorage.removeItem("orbit-token"); localStorage.removeItem("orbit-name"); localStorage.removeItem("orbit-session"); setChatSessionId(`session-${crypto.randomUUID()}`); setUserName(""); setAuthNotice(""); setAuthState("signed-out"); };
  return <div className="app-shell"><aside className={`sidebar ${mobileOpen ? "open" : ""}`}><div className="brand"><span className="brand-mark">✦</span><div>orbit<span>AI ENGINEERING</span></div></div><button className="new-chat" onClick={startConversation}>＋ <span>New conversation</span><kbd>Ctrl K</kbd></button>{["Workspace", "Create", "Automate", "Operate", "System"].map((group) => <div className="nav-group" key={group}><p>{group}</p>{modules.filter((item) => item.group === group).map((item) => <button aria-current={page === item.id ? "page" : undefined} className={page === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => { setPage(item.id); setMobileOpen(false); }}><span>{item.icon}</span>{item.label}</button>)}</div>)}<div className="sidebar-footer"><span className={apiStatus} /><div><strong>{apiStatus === "online" ? "API is healthy" : apiStatus === "degraded" ? "API is degraded" : "API unavailable"}</strong><small>{health?.database === "ready" ? "Database ready" : health ? "Database needs attention" : "Retry from system status"}</small></div></div></aside><main className="main"><header className="topbar"><button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileOpen(!mobileOpen)}>☰</button><div className="breadcrumb"><span>Workspace</span><b>/</b> {modules.find((item) => item.id === page)?.label}</div><div className="topbar-actions"><span className={`top-status ${apiStatus}`}><span className={apiStatus} />{apiStatus === "online" ? "API healthy" : apiStatus === "degraded" ? "API degraded" : "API offline"}</span><div className="profile"><span>{displayName.slice(0, 1).toUpperCase()}</span><b>{displayName}</b></div><button className="signout-button" onClick={signOut}>Sign out</button></div></header><div key={page} className="content page-enter">{render}</div></main></div>;
}
