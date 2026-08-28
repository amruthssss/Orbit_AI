import { Component, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Page = "chat" | "knowledge" | "resume" | "content" | "research" | "agents" | "evaluation" | "analytics" | "settings";
type Message = { id: number; role: "user" | "assistant"; content: string; error?: boolean };
type DocumentItem = { id: string; name: string; collection: string; chunks: number; characters: number; created_at: string };
type LoadState = "idle" | "loading" | "success" | "error";
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
  const response = await fetch(apiUrl(path), options);
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Request failed");
  return response.json();
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

function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const session = useRef(localStorage.getItem("orbit-session") || `session-${crypto.randomUUID()}`);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => localStorage.setItem("orbit-session", session.current), []);
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
    const assistantId = ++nextId.current;
    setInput(""); setBusy(true); setError("");
    setMessages((old) => [...old, { id: ++nextId.current, role: "user", content: text }, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const response = await fetch(apiUrl("/chat/stream"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: session.current, message: text }) });
      if (!response.ok || !response.body) throw new Error("Unable to get a response. Please try again.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let answer = "";
      while (true) {
        const chunk = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Unable to get a response. Please try again.")), 30000)),
        ]);
        if (chunk.done) break;
        answer += decoder.decode(chunk.value, { stream: true });
        setMessages((old) => old.map((item) => item.id === assistantId ? { ...item, content: answer } : item));
      }
      answer += decoder.decode();
      if (!answer.trim()) throw new Error("Unable to get a response. Please try again.");
    } catch (caught) {
      const message = caught instanceof Error && caught.message !== "Failed to fetch"
        ? caught.message
        : "Unable to get a response. Please try again.";
      setError(message);
      setMessages((old) => old.map((item) => item.id === assistantId ? { ...item, content: message, error: true } : item));
    } finally { setBusy(false); }
  }

  return <div className="chat-view">
    <header className="chat-header">
      <div><p className="eyebrow">CONVERSATION</p><h1>Think with Orbit</h1><p className="chat-subtitle">Your private AI workspace for research, writing, and decisions.</p></div>
      <div className="model-pill"><span className="pulse" /> Gemini gateway <span className="chevron">⌄</span></div>
    </header>
    {!messages.length ? <div className="chat-empty">
      <div className="hero-icon"><span>✦</span></div><p className="kicker">ORBIT AI ENGINEERING PLATFORM</p>
      <h2>Build with intelligence.</h2><p className="empty-copy">One calm workspace to chat, retrieve, automate, and evaluate with confidence.</p>
      <div className="prompt-grid">{["Explain retrieval augmented generation", "Help me design an API", "Review a product brief"].map((item) => <button key={item} onClick={() => void send(item)}><span>{item}</span><b>↗</b></button>)}</div>
      <div className="capability-row"><span>⌁ Grounded answers</span><span>◌ Streaming responses</span><span>◈ Local-first</span></div>
    </div> : <div ref={scrollRef} className="message-list">{messages.map((message) => <div className={`message ${message.role}`} key={message.id}><div className="message-avatar">{message.role === "assistant" ? "✦" : "Y"}</div><div className="message-body"><div className="message-label">{message.role === "assistant" ? "Orbit" : "You"} <span>{message.role === "assistant" ? "AI assistant" : "Just now"}</span></div><div className={`message-content ${message.error ? "message-error" : ""}`}>{message.content ? (message.role === "assistant" ? <ResponseErrorBoundary><FormattedResponse content={message.content} /></ResponseErrorBoundary> : message.content) : <><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></>}</div></div></div>)}</div>}
    {error && <StatusMessage state="error" error={error} />}
    <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(input); }}><textarea aria-label="Message Orbit" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); } }} placeholder="Ask Orbit anything…" rows={1} disabled={busy} /><button aria-label="Send message" type="submit" disabled={busy || !input.trim()}>↑</button></form>
    <p className="fine-print">Enter to send · Shift + Enter for a new line · AI output should be reviewed</p>
  </div>;
}

function KnowledgeView() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [query, setQuery] = useState(""); const [results, setResults] = useState<{ name: string; text: string; score: number }[]>([]);
  const [state, setState] = useState<LoadState>("loading"); const [error, setError] = useState(""); const [uploading, setUploading] = useState(false);
  async function refresh() { setState("loading"); try { const data = await api<{ documents: DocumentItem[] }>("/api/knowledge/documents"); setDocs(data.documents); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load documents."); setState("error"); } }
  useEffect(() => { void refresh(); }, []);
  async function upload(file: File) { setUploading(true); setError(""); try { const text = await file.text(); await api("/api/knowledge/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, text }) }); await refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to upload document."); } finally { setUploading(false); } }
  async function search() { if (!query.trim()) return; setState("loading"); try { const data = await api<{ results: typeof results }>("/api/knowledge/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) }); setResults(data.results); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Search failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Knowledge base" subtitle="Ground answers in your own documents with lightweight local retrieval." action={<label className={`button primary ${uploading ? "is-loading" : ""}`}>＋ {uploading ? "Uploading…" : "Add document"}<input type="file" hidden accept=".txt,.md,.json,.csv" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} /></label>} /><Card><div className="search-row"><div className="input-with-icon">⌕<input aria-label="Search indexed knowledge" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void search()} placeholder="Search indexed knowledge…" /></div><button className="button" onClick={() => void search()} disabled={!query.trim() || state === "loading"}>Search</button></div><StatusMessage state={state === "error" ? "error" : results.length ? "success" : "idle"} error={error} success={results.length ? `Retrieved ${results.length} matching source${results.length === 1 ? "" : "s"}.` : undefined} />{results.length > 0 && <div className="result-list"><div className="result-heading">Retrieved context <span>{results.length} matches</span></div>{results.map((result) => <div className="result" key={result.name + result.text}><div><strong>{result.name}</strong><small>match {Math.round(result.score * 100)}%</small></div><p>{result.text}</p><span className="source-chip">Source · indexed document</span></div>)}</div>}</Card><div className="section-title">Indexed documents <span>{docs.length}</span></div><Card className="table-card">{state === "loading" && !docs.length ? <StatusMessage state="loading" /> : docs.length ? docs.map((doc) => <div className="table-row" key={doc.id}><span className="file-icon">▤</span><div><strong>{doc.name}</strong><small>{doc.collection} · {doc.chunks} chunks</small></div><span className="muted">{doc.characters.toLocaleString()} chars</span></div>) : <Empty text="No documents yet. Upload a text file to create your first collection." />}</Card></div>;
}

function ResumeView() {
  const [resume, setResume] = useState(""); const [job, setJob] = useState(""); const [result, setResult] = useState<{ score: number; matched_skills: string[]; missing_skills: string[]; recommendations: string[] }>(); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function analyze() { setState("loading"); setError(""); try { const data = await api<NonNullable<typeof result>>("/api/resume/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume, job_description: job }) }); setResult(data); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Analysis failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Resume lab" subtitle="Turn a resume and job description into a focused, actionable review." /><div className="two-col"><Card><label>Resume text<textarea className="large-input" value={resume} onChange={(event) => setResume(event.target.value)} placeholder="Paste resume text here…" /></label><label>Job description <span className="muted">(optional)</span><textarea className="large-input short" value={job} onChange={(event) => setJob(event.target.value)} placeholder="Paste the role requirements…" /></label><button className="button primary full" disabled={!resume.trim() || state === "loading"} onClick={() => void analyze()}>{state === "loading" ? "Analyzing…" : "Analyze resume"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success="Analysis complete." /></Card>{result ? <Card className="result-panel"><div className="score-ring"><b>{result.score}</b><span>match score</span></div><h3>Strengths</h3><div className="tag-list">{result.matched_skills.map((skill) => <span className="tag green" key={skill}>{skill}</span>)}</div><h3>Opportunities</h3><div className="tag-list">{result.missing_skills.length ? result.missing_skills.map((skill) => <span className="tag amber" key={skill}>{skill}</span>) : <span className="muted">No obvious skill gaps.</span>}</div><h3>Recommendations</h3><ul className="clean-list">{result.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></Card> : <Card className="empty-panel"><div className="hero-icon small">▧</div><h3>Your review will appear here</h3><p>We’ll identify signals, gaps and next steps.</p></Card>}</div></div>;
}

function ContentView() {
  const [kind, setKind] = useState("custom"); const [prompt, setPrompt] = useState(""); const [output, setOutput] = useState(""); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function generate() { setState("loading"); setError(""); try { const data = await api<{ content: string }>("/api/content/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, prompt, tone: "professional" }) }); setOutput(data.content); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Generation failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Content studio" subtitle="Draft polished content with reusable, reviewable generation." /><Card><div className="form-grid"><label>Format<select value={kind} onChange={(event) => setKind(event.target.value)}>{["custom", "email", "blog", "social", "outline"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Tone<select><option>professional</option><option>friendly</option><option>direct</option></select></label></div><label>Brief<textarea className="large-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="What would you like to create?" /></label><button className="button primary" disabled={!prompt.trim() || state === "loading"} onClick={() => void generate()}>{state === "loading" ? "Generating…" : "Generate draft"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success="Draft generated." /></Card>{output && <Card className="output-card"><div className="card-heading"><div><span className="eyebrow">GENERATED OUTPUT</span><h3>Draft</h3></div><button className="button subtle" onClick={() => navigator.clipboard?.writeText(output)}>Copy</button></div><pre>{output}</pre></Card>}</div>;
}

function ResearchView() {
  const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState<{ answer: string; depth: string }>(); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function research() { setState("loading"); setError(""); try { const data = await api<NonNullable<typeof answer>>("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, depth: "standard" }) }); setAnswer(data); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Research failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Research" subtitle="Structure a research brief before you go deeper into primary sources." /><Card><label>Research question<input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What do you want to understand?" /></label><button className="button primary" disabled={!question.trim() || state === "loading"} onClick={() => void research()}>{state === "loading" ? "Structuring…" : "Start brief"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success="Brief ready." /></Card>{answer && <Card className="output-card"><span className="eyebrow">STANDARD BRIEF</span><p className="research-answer">{answer.answer}</p><div className="notice">No web sources connected. Validate findings against current primary sources.</div></Card>}</div>;
}

function AgentsView() {
  const [input, setInput] = useState(""); const [output, setOutput] = useState(""); const [state, setState] = useState<LoadState>("idle"); const [error, setError] = useState("");
  async function run() { setState("loading"); setError(""); try { const data = await api<{ output: string }>("/api/workflows/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Writing workflow", steps: ["Understand", "Draft", "Review"], input }) }); setOutput(data.output); setState("success"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Workflow failed."); setState("error"); } }
  return <div className="view"><ViewHeading title="Agents & workflows" subtitle="Compose explicit steps and inspect each result instead of running opaque automation." /><Card><label>Workflow input<textarea className="large-input short" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Describe the task for your workflow…" /></label><div className="workflow-steps"><span><b>01</b> Understand</span><span><b>02</b> Draft</span><span><b>03</b> Review</span></div><button className="button primary" disabled={!input.trim() || state === "loading"} onClick={() => void run()}>{state === "loading" ? "Running workflow…" : "Run workflow"}</button><StatusMessage state={state === "error" ? "error" : state} error={error} success="Workflow complete." /></Card>{output && <Card className="output-card"><h3>Workflow output</h3><pre>{output}</pre></Card>}</div>;
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
function SettingsView() { return <div className="view"><ViewHeading title="Settings" subtitle="Runtime choices for this local workspace." /><Card className="settings-list"><div><strong>Environment</strong><span>Development · local fallback enabled</span></div><div><strong>Model gateway</strong><span>Gemini when GEMINI_API_KEY is configured</span></div><div><strong>Persistence</strong><span>SQLite by default · PostgreSQL-ready configuration</span></div><div><strong>Guardrails</strong><span>Prompt injection and output length checks enabled</span></div></Card></div>; }
function ViewHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) { return <header className="view-heading"><div><p className="eyebrow">ORBIT WORKSPACE</p><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>; }
function Empty({ text }: { text: string }) { return <div className="empty"><span>◇</span><p>{text}</p></div>; }

export default function App() {
  const [page, setPage] = useState<Page>("chat"); const [mobileOpen, setMobileOpen] = useState(false);
  const render = { chat: <ChatView />, knowledge: <KnowledgeView />, resume: <ResumeView />, content: <ContentView />, research: <ResearchView />, agents: <AgentsView />, evaluation: <EvaluationView />, analytics: <AnalyticsView />, settings: <SettingsView /> }[page];
  return <div className="app-shell"><aside className={`sidebar ${mobileOpen ? "open" : ""}`}><div className="brand"><span className="brand-mark">✦</span><div>orbit<span>AI ENGINEERING</span></div></div><button className="new-chat" onClick={() => { setPage("chat"); setMobileOpen(false); }}>＋ <span>New conversation</span><kbd>⌘ K</kbd></button>{["Workspace", "Create", "Automate", "Operate", "System"].map((group) => <div className="nav-group" key={group}><p>{group}</p>{modules.filter((item) => item.group === group).map((item) => <button aria-current={page === item.id ? "page" : undefined} className={page === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => { setPage(item.id); setMobileOpen(false); }}><span>{item.icon}</span>{item.label}{item.id === "analytics" && <i>Live</i>}</button>)}</div>)}<div className="sidebar-footer"><span className="online" /><div><strong>Orbit is ready</strong><small>Local workspace · secure</small></div><span className="footer-menu">···</span></div></aside><main className="main"><header className="topbar"><button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileOpen(!mobileOpen)}>☰</button><div className="breadcrumb"><span>Workspace</span><b>/</b> {modules.find((item) => item.id === page)?.label}</div><div className="topbar-actions"><span className="top-status"><span className="online" /> All systems operational</span><button className="help-button" aria-label="Help">?</button><div className="profile"><span>Y</span><b>Yash</b><small>⌄</small></div></div></header><div className="content">{render}</div></main></div>;
}
