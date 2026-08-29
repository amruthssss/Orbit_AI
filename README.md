# 🚀 Orbit AI Engineering Platform

> A production-oriented AI Engineering platform combining LLMs, RAG, AI Agents, Tool Calling, Workflows, Evaluation, Observability, and modern cloud deployment.

**Orbit AI** is a full-stack AI Engineering platform built to demonstrate how modern AI applications are designed, integrated, evaluated, optimized, and deployed.

It combines a React/TypeScript frontend with a FastAPI backend and integrates Gemini, PostgreSQL, Redis, vector search, embeddings, reranking, web research, AI agents, and LLM/RAG evaluation.

---

## 🌐 Live Application

**Frontend**

https://orbit-ai-nine-pi.vercel.app

**GitHub**

https://github.com/amruthssss/Orbit_AI

**Backend**

Deployed on Render.

**Database**

Supabase PostgreSQL.

**Cache / Rate Limiting**

Upstash Redis.

---

# ✨ What Orbit AI Does

Orbit AI provides a unified workspace for:

- 🤖 AI Chat
- 📚 Knowledge Base
- 🔎 Retrieval-Augmented Generation (RAG)
- 📄 Resume Analysis
- ✍️ AI Content Generation
- 🔬 AI Research
- 🧠 AI Agents
- ⚙️ AI Workflows
- 📊 LLM Evaluation
- 🔍 RAG Evaluation
- 📈 Analytics
- 🔭 Observability
- 🛡️ AI Guardrails
- 🔐 Authentication
- ⚡ Redis Caching
- ☁️ Cloud Deployment

The goal is to demonstrate **practical AI Engineering**, not just model experimentation.

---

# 🏗️ Architecture

```text
                         ┌─────────────────────────┐
                         │      React + Vite       │
                         │        Frontend         │
                         └────────────┬────────────┘
                                      │
                                      │ HTTPS
                                      ▼
                         ┌─────────────────────────┐
                         │        FastAPI          │
                         │         Backend         │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
       ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
       │   Gemini    │        │  Supabase   │        │   Upstash   │
       │     LLM     │        │ PostgreSQL  │        │    Redis    │
       └─────────────┘        └─────────────┘        └─────────────┘
              │                       │
              │                       │
              ▼                       ▼
       ┌─────────────┐        ┌─────────────┐
       │ AI Agents   │        │ Vector/RAG  │
       │ & Tools     │        │   System    │
       └─────────────┘        └─────────────┘
              │
              ▼
       ┌─────────────┐
       │    Tavily   │
       │ Web Research│
       └─────────────┘
```

---

# 🧠 AI Engineering Architecture

Orbit AI follows a layered AI application architecture:

```text
User
 ↓
Frontend
 ↓
API Layer
 ↓
Authentication
 ↓
Guardrails
 ↓
Application Logic
 ↓
AI Services
 ├── LLM
 ├── Embeddings
 ├── RAG
 ├── Agents
 └── Tools
 ↓
Data Layer
 ├── PostgreSQL
 ├── Vector Storage
 └── Redis
 ↓
Evaluation + Observability
```

---

# 🤖 1. AI Chat

## Purpose

A conversational AI interface powered by Gemini.

The chat system supports multi-turn conversations, streaming responses, conversation persistence, structured responses, and context management.

## Flow

```text
User Message
     ↓
Frontend
     ↓
FastAPI
     ↓
Validation / Guardrails
     ↓
Conversation Context
     ↓
Gemini
     ↓
Streaming Response
     ↓
Frontend
     ↓
PostgreSQL
```

## Capabilities

- Multi-turn conversations
- Conversation history
- Streaming responses
- Structured AI responses
- Markdown
- Code blocks
- Context management
- Error handling
- Rate limiting
- Usage tracking

---

# 📚 2. Knowledge Base

## Purpose

The Knowledge Base allows users to upload documents that can later be used by the RAG system.

## Supported Documents

- PDF
- TXT
- DOCX

## Document Pipeline

```text
Upload
 ↓
Validation
 ↓
Text Extraction
 ↓
Cleaning
 ↓
Chunking
 ↓
Metadata
 ↓
Embeddings
 ↓
Vector Storage
```

The system tracks document processing and makes processed documents available to the retrieval pipeline.

---

# 🔎 3. Retrieval-Augmented Generation

## Purpose

RAG allows Orbit AI to answer questions using information retrieved from user-provided documents.

## RAG Pipeline

```text
User Question
      ↓
Query Processing
      ↓
Query Embedding
      ↓
Vector / Hybrid Retrieval
      ↓
Top-K Results
      ↓
Reranking
      ↓
Context Selection
      ↓
Gemini
      ↓
Grounded Answer
      ↓
Citations / Sources
```

## RAG Capabilities

- Document ingestion
- Text extraction
- Chunking
- Metadata
- Embeddings
- Vector search
- Hybrid retrieval
- Similarity filtering
- Reranking
- Query processing
- Context optimization
- Source citations
- Retrieval evaluation

---

# 🧩 4. RAG Optimization

The platform is designed to allow experimentation with retrieval quality.

Optimization areas include:

```text
Chunk Size
Chunk Overlap
      ↓
Top-K
      ↓
Similarity Threshold
      ↓
Query Rewriting
      ↓
Hybrid Retrieval
      ↓
Reranking
      ↓
Context Compression
```

The goal is to improve:

- Retrieval quality
- Answer relevance
- Faithfulness
- Latency
- Token usage
- Cost

Optimization should be based on measured evaluation results rather than assumptions.

---

# 📄 5. Resume Lab

## Purpose

Resume Lab uses AI to analyze resumes and compare them against job requirements.

## Workflow

```text
Resume Upload
      ↓
Document Extraction
      ↓
Resume Parsing
      ↓
Skills Extraction
      ↓
Experience Analysis
      ↓
Education / Projects
      ↓
Job Description Analysis
      ↓
Matching
      ↓
Recommendations
```

## Results

The system can provide:

- Resume summary
- Skills
- Experience
- Education
- Project information
- Job matching
- Matched skills
- Missing skills
- Improvement recommendations

The system should not invent information that does not exist in the source resume.

---

# ✍️ 6. Content Studio

## Purpose

Content Studio provides AI-assisted content generation.

## Supported Use Cases

- LinkedIn posts
- Blog content
- Emails
- Documentation
- Resume bullets

## Workflow

```text
User Requirements
      ↓
Prompt Construction
      ↓
Gemini
      ↓
Structured Output
      ↓
Validation
      ↓
Final Content
```

## Features

- Generate
- Regenerate
- Copy
- Structured output
- Validation
- Error handling

---

# 🔬 7. Research Assistant

## Purpose

Research Assistant combines AI reasoning with web-search capabilities.

Tavily can be used as the web-search provider where configured.

## Workflow

```text
Research Question
      ↓
Planning
      ↓
Web Search
      ↓
Source Collection
      ↓
Source Analysis
      ↓
Information Synthesis
      ↓
Final Report
      ↓
Citations
```

## Research Output

- Research question
- Sources
- Key findings
- Analysis
- Final answer
- Citations

The system should use actual sources and should not fabricate URLs or citations.

---

# 🧠 8. AI Agents

## Purpose

AI Agents allow the system to perform multi-step tasks using available tools.

## Agent Architecture

```text
User Task
    ↓
Agent
    ↓
Planning
    ↓
Tool Selection
    ↓
Tool Execution
    ↓
Observation
    ↓
Next Action
    ↓
Completion
```

## Agent Controls

- Tool validation
- Tool schemas
- Tool permissions
- Maximum steps
- Timeout
- Retry
- Error handling
- Execution tracking
- Agent evaluation

Private chain-of-thought is not exposed to users.

The interface should display safe execution status such as:

```text
Planning
   ↓
Searching
   ↓
Retrieving
   ↓
Executing Tool
   ↓
Processing
   ↓
Completed
```

---

# ⚙️ 9. AI Workflows

## Purpose

Workflows provide deterministic multi-step AI operations.

Example:

```text
Input
 ↓
Step 1
 ↓
Step 2
 ↓
Condition
 ├── Path A
 └── Path B
 ↓
Step 3
 ↓
Final Result
```

Workflows can support:

- Sequential execution
- Multiple steps
- Branching
- Validation
- Retry
- Error handling
- Execution tracking

---

# 📊 10. LLM Evaluation

Orbit AI includes an evaluation layer for measuring model/application quality.

## Evaluation Dimensions

- Correctness
- Relevance
- Faithfulness
- Instruction following
- Hallucination
- Structured output validity

## Evaluation Methods

- Golden datasets
- Automated evaluation
- LLM-as-a-Judge
- Regression evaluation
- Evaluation history

The goal is to make AI behavior measurable rather than relying only on subjective inspection.

---

# 🔍 11. RAG Evaluation

RAG systems require retrieval-specific evaluation.

Orbit AI supports evaluation of metrics such as:

- Context Precision
- Context Recall
- Hit Rate
- MRR where applicable
- Faithfulness
- Answer Relevance
- Citation Accuracy
- Retrieval latency

Example:

```text
Dataset
   ↓
RAG Pipeline
   ↓
Retrieved Context
   ↓
Generated Answer
   ↓
Evaluation
   ↓
Metrics
   ↓
Stored Results
```

---

# 🤖 12. Agent Evaluation

Agent performance can be evaluated using:

- Task success
- Tool selection
- Tool-call correctness
- Final answer quality
- Latency
- Token usage
- Estimated cost

This allows agent workflows to be compared and improved systematically.

---

# 📈 13. Analytics

Analytics provides visibility into application usage and AI performance.

Tracked metrics can include:

- Total requests
- Successful requests
- Failed requests
- Latency
- Time to First Token
- Input tokens
- Output tokens
- Estimated cost
- Model usage
- Cache hits
- Cache misses
- RAG usage
- Agent usage
- Evaluation results

Analytics should be based on actual application data.

---

# 🔭 14. Observability

AI systems require visibility into their execution pipeline.

Orbit AI can track:

- Request ID
- Feature
- Model
- Prompt version
- Latency
- TTFT
- Token usage
- Cost
- Errors
- Cache status
- Retrieval information
- Tool execution

Sensitive credentials should never be logged.

Private chain-of-thought should never be logged or exposed.

---

# 🛡️ 15. Guardrails

The platform includes application-level safety and validation mechanisms.

Examples include:

- Input validation
- Output validation
- Prompt injection detection
- Tool-call validation
- Authentication
- Authorization
- Rate limiting
- Structured output validation
- Error handling

The objective is to prevent malformed requests, unsafe tool execution, invalid outputs, and application crashes.

---

# 🔐 16. Authentication

Authentication protects user-specific application data.

Protected resources can include:

- Conversations
- Messages
- Documents
- RAG knowledge
- Evaluations
- Analytics
- Agent executions

Backend authorization should enforce user data isolation.

Frontend-only protection is not sufficient for sensitive resources.

---

# ⚡ 17. Redis

Upstash Redis is used for application-level caching and rate limiting where configured.

Possible use cases:

- Response caching
- Rate limiting
- Temporary state
- TTL-based data
- Cache invalidation

Redis failures should be handled gracefully where caching is not critical to the operation.

---

# 🗄️ 18. PostgreSQL

Supabase PostgreSQL provides persistent application storage.

Data can include:

- Users
- Conversations
- Messages
- Documents
- Document chunks
- Evaluations
- Analytics
- Agent executions

PostgreSQL is intended to be the production persistence layer.

---

# 🔑 Environment Variables

Create a local `.env` file for development.

**Never commit `.env` to GitHub.**

Example:

```env
GEMINI_API_KEY=
GEMINI_MODEL=

GEMINI_EMBEDDING_MODEL=

DATABASE_URL=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

TAVILY_API_KEY=

SECRET_KEY=

CORS_ORIGINS=http://localhost:5173

RATE_LIMIT_PER_MINUTE=60

ENVIRONMENT=development
```

For the frontend:

```env
VITE_API_URL=http://localhost:8000
```

For production, backend secrets must be configured in the backend hosting environment.

The frontend must never receive backend secrets.

---

# 🛠️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Pytest

## AI

- Google Gemini
- Gemini Embeddings
- LLM Evaluation
- LLM-as-a-Judge
- AI Agents
- Tool Calling
- RAG
- Reranking

## Data

- PostgreSQL
- Supabase
- Vector Storage
- Upstash Redis

## Research

- Tavily

## Deployment

- Vercel
- Render
- Supabase
- Upstash

---

# 📁 Project Structure

```text
Orbit_AI/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── agents/
│   │   ├── core/
│   │   ├── database/
│   │   ├── evaluation/
│   │   ├── guardrails/
│   │   ├── integrations/
│   │   ├── llm/
│   │   ├── memory/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── rag/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   │
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── eval/
│   ├── datasets/
│   ├── llm/
│   ├── rag/
│   ├── agents/
│   └── run_evaluation.py
│
├── scripts/
│
├── docs/
│
├── tests/
│
├── .env.example
├── .gitignore
├── pyproject.toml
├── requirements.txt
└── README.md
```

---

# 💻 Local Setup

## 1. Clone the Repository

```bash
git clone https://github.com/amruthssss/Orbit_AI.git
cd Orbit_AI
```

---

# 🐍 Backend Setup

Create a virtual environment:

```bash
python -m venv venv
```

### Windows

```powershell
venv\Scripts\activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

Configure your `.env`.

Start FastAPI:

```bash
uvicorn backend.app.main:app --reload
```

API:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

---

# 🎨 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Configure:

```env
VITE_API_URL=http://localhost:8000
```

---

# 🧪 Testing

Backend:

```bash
pytest
```

Frontend build:

```bash
cd frontend
npm run build
```

Production preview:

```bash
npm run preview
```

---

# 🔬 Evaluation

Evaluation datasets are stored under:

```text
eval/
```

Evaluation can be used to measure:

```text
LLM Quality
     ↓
RAG Quality
     ↓
Agent Quality
     ↓
Latency
     ↓
Token Usage
     ↓
Cost
```

Evaluation results should always be generated from actual model/application runs.

---

# ☁️ Deployment

Orbit AI uses a split cloud architecture.

```text
React / Vite
     ↓
   Vercel
     ↓
   Render
     ↓
 ┌───┼───────────────┐
 ↓   ↓               ↓
Gemini PostgreSQL   Redis
      ↓               ↓
   Supabase         Upstash
```

## Frontend — Vercel

Deploy:

```text
frontend/
```

Build command:

```bash
npm run build
```

Output:

```text
dist
```

Frontend environment variable:

```env
VITE_API_URL=https://YOUR-RENDER-BACKEND.onrender.com
```

---

# Backend — Render

Deploy the FastAPI backend.

Example start command:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Configure backend environment variables in Render.

Backend secrets must never be exposed to the browser.

---

# 🗃️ Database — Supabase

Production persistence uses:

```text
Supabase PostgreSQL
```

Configure:

```env
DATABASE_URL=
```

The database should contain the required application tables and vector/RAG data where configured.

---

# ⚡ Redis — Upstash

Configure the Redis credentials expected by the application.

For the Upstash REST implementation:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

These credentials must remain server-side.

---

# 🔎 Research — Tavily

Research functionality uses Tavily where configured.

Configure:

```env
TAVILY_API_KEY=
```

The key must remain on the backend.

---

# 🔐 Security

Never commit:

```text
.env
API keys
Database passwords
Redis tokens
Secret keys
Private credentials
```

The following should remain ignored:

```text
.env
venv/
.venv/
node_modules/
dist/
__pycache__/
*.db
*.sqlite
```

Use `.env.example` to document required variables without exposing real credentials.

---

# ⚡ Performance

AI application performance is measured using:

- Time to First Token (TTFT)
- Total response latency
- Gemini latency
- Retrieval latency
- Database latency
- Redis/cache latency
- Token usage
- Estimated cost

Optimization techniques include:

- Streaming
- Async I/O
- Connection reuse
- Caching
- Context optimization
- Retrieval optimization
- Reranking
- Query optimization
- Avoiding duplicate model calls

Performance improvements should be measured rather than assumed.

---

# 🧪 Production Testing

Before considering the system production-ready, test:

```text
Frontend
   ↓
FastAPI
   ↓
Gemini
   ↓
PostgreSQL
   ↓
Redis
```

And:

```text
PDF
 ↓
Parsing
 ↓
Chunking
 ↓
Embeddings
 ↓
Vector Storage
 ↓
Retrieval
 ↓
Reranking
 ↓
Gemini
 ↓
Answer
 ↓
Citations
```

Also verify:

- Authentication
- Authorization
- Rate limiting
- Error handling
- Streaming
- File uploads
- RAG
- Agents
- Workflows
- Evaluations
- Analytics

A feature should only be considered complete after its actual end-to-end workflow has been tested.

---

# 🎯 What This Project Demonstrates

Orbit AI is designed to demonstrate practical AI Engineering skills across the complete AI application lifecycle:

```text
Python
   ↓
FastAPI
   ↓
LLM APIs
   ↓
Prompt Engineering
   ↓
Structured Outputs
   ↓
Embeddings
   ↓
Vector Search
   ↓
RAG
   ↓
RAG Optimization
   ↓
Reranking
   ↓
AI Agents
   ↓
Tool Calling
   ↓
AI Workflows
   ↓
LLM Evaluation
   ↓
RAG Evaluation
   ↓
Observability
   ↓
Production Deployment
```

---

# 📌 Project Status

The platform is actively developed and deployed.

Current infrastructure:

| Component | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | FastAPI + Python |
| LLM | Google Gemini |
| Embeddings | Gemini Embeddings |
| Database | Supabase PostgreSQL |
| Redis | Upstash |
| Research | Tavily |
| Vector Search | PostgreSQL / configured vector storage |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Testing | Pytest |
| Evaluation | LLM / RAG / Agent evaluation |

Feature status should be determined through actual integration and end-to-end testing rather than the presence of UI components alone.

---

# 📈 Future Improvements

Potential improvements include:

- Advanced hybrid retrieval
- Improved reranking
- More RAG benchmarks
- Automated evaluation pipelines
- More agent tools
- Better observability
- Prompt/version management
- AI cost dashboards
- Advanced authentication
- Background document processing
- Distributed task queues
- More production-grade monitoring

---

# 👨‍💻 Author

## Amruth S

AI / ML Engineer

Areas of focus:

- Artificial Intelligence
- Machine Learning
- Generative AI
- Large Language Models
- RAG
- AI Agents
- LLM Evaluation
- Python
- FastAPI
- Cloud AI Applications

GitHub:

https://github.com/amruthssss

---

# ⭐ Project

If you find the project useful, consider giving the repository a star.

GitHub:

https://github.com/amruthssss/Orbit_AI
