# 19. AI Readiness Assessment

> **Status:** Draft — Pre-Implementation  
> **Purpose:** Design architecture that integrates AI capabilities without vendor lock-in and supports future AI features.

---

## 19.1 Current AI Integration (from original monolith)

```
Telegram → FastAPI → LangGraph Agent → Internal Next.js APIs → Prisma → PostgreSQL
```

**Strengths:**
- AI service does NOT directly access the database ✅
- LangGraph provides structured agent workflows ✅
- Intent classification works for attendance/leave queries ✅

**Weaknesses:**
- Tightly coupled to LangChain + LangGraph (vendor lock-in risk) ❌
- AI is only for chatbot — not integrated into the platform ❌
- No AI abstraction layer ❌
- Hardcoded to Telegram — can't easily add WhatsApp, Web Chat, Voice ❌
- AI calls synchronous internal APIs — no async pattern for heavy AI work ❌
- No model switching capability ❌

---

## 19.2 Future AI Capabilities Required

| Capability | Description | Context |
|-----------|-------------|---------|
| **Lesson Planning** | AI generates lesson plans from curriculum, grade, learning objectives | Assessment |
| **Question Generation** | AI creates MCQs, short answer, long answer, practical questions | Assessment |
| **Auto-Grading** | AI evaluates subjective answers, essays, handwriting (OCR) | Assessment |
| **Feedback Generation** | AI writes personalized student feedback from scores + context | Assessment |
| **Student Analysis** | AI identifies at-risk students, learning gaps, recommends interventions | Reporting |
| **Report Generation** | AI writes narrative report card comments, parent summaries | Reporting |
| **Teacher Assistance** | AI suggests teaching strategies, differentiation, resource recommendations | Communication |
| **Parent Communication** | AI drafts parent messages, translates, summarizes progress | Communication |
| **Attendance Insights** | AI predicts absenteeism patterns, suggests interventions | Attendance |
| **Workflow Automation** | AI routes approvals, flags anomalies, suggests escalations | Workflow |

---

## 19.3 AI Abstraction Layer Architecture

### Provider Interface

```typescript
// ai/providers/provider.interface.ts
interface AIProvider {
  /** Simple completion (single prompt → response) */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  
  /** Chat completion (multi-turn conversation) */
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  /** Structured output (JSON schema enforced) */
  structured<T>(request: StructuredRequest): Promise<T>;
  
  /** Embedding generation */
  embed(texts: string[]): Promise<number[][]>;
  
  /** Provider metadata */
  readonly name: string;
  readonly models: AIModel[];
}

interface CompletionRequest {
  model: string;
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  tenantId?: string;          // For usage tracking
}

interface StructuredRequest {
  model: string;
  systemPrompt: string;
  prompt: string;
  schema: JSONSchema;          // Output must conform to this
  temperature?: number;
}
```

### Provider Registry

```typescript
// ai/providers/provider-registry.ts
@Injectable()
export class AIProviderRegistry {
  private providers = new Map<string, AIProvider>();
  
  register(name: string, provider: AIProvider): void {
    this.providers.set(name, provider);
  }
  
  get(providerName?: string): AIProvider {
    // Default to configured provider, or first available
    const name = providerName || this.config.get('ai.default_provider');
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`AI provider '${name}' not found`);
    return provider;
  }
}
```

### Provider Implementations

```typescript
// ai/providers/openai.provider.ts
class OpenAIProvider implements AIProvider {
  name = 'openai';
  models = [
    { id: 'gpt-4o', contextWindow: 128000, capabilities: ['text', 'structured', 'vision'] },
    { id: 'gpt-4o-mini', contextWindow: 128000, capabilities: ['text', 'structured'] },
    { id: 'gpt-3.5-turbo', contextWindow: 16000, capabilities: ['text'] }
  ];
  // ... implements complete(), chat(), structured(), embed()
}

// ai/providers/anthropic.provider.ts
class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  models = [
    { id: 'claude-sonnet-4-20250514', contextWindow: 200000, capabilities: ['text', 'structured', 'vision'] },
    { id: 'claude-haiku-3-5', contextWindow: 200000, capabilities: ['text'] }
  ];
  // ...
}

// ai/providers/google.provider.ts
class GoogleProvider implements AIProvider {
  name = 'google';
  models = [
    { id: 'gemini-2.5-pro', contextWindow: 1000000, capabilities: ['text', 'structured', 'vision'] },
    { id: 'gemini-2.5-flash', contextWindow: 1000000, capabilities: ['text', 'structured'] }
  ];
  // ...
}

// ai/providers/local.provider.ts
class LocalProvider implements AIProvider {
  name = 'local';
  // Ollama, vLLM, or other self-hosted models
  // Useful for schools with data residency requirements
}
```

---

## 19.4 AI Task Definitions

### Configurable AI Tasks (per tenant)

```sql
CREATE TABLE ai_task_definitions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code VARCHAR(100) NOT NULL,                    -- 'homework.ai_generate', 'grading.auto_evaluate'
  name VARCHAR(200),
  description TEXT,
  provider VARCHAR(50) DEFAULT 'openai',         -- Which provider to use
  model VARCHAR(50) DEFAULT 'gpt-4o-mini',       -- Which model
  system_prompt_template TEXT NOT NULL,          -- Template with {{placeholders}}
  user_prompt_template TEXT NOT NULL,
  output_schema JSONB,                           -- For structured output
  temperature DECIMAL(3,2) DEFAULT 0.3,
  max_tokens INTEGER DEFAULT 4096,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(tenant_id, code)
);
```

### Example Task: AI Homework Generator

```json
{
  "code": "homework.ai_generate",
  "system_prompt_template": "You are an expert {{subject}} teacher for grade {{grade}}. Generate homework questions appropriate for {{board}} curriculum, chapter: {{chapter}}, topic: {{topic}}. Difficulty: {{difficulty}}. Number of questions: {{count}}.",
  "user_prompt_template": "Generate {{count}} {{question_type}} questions with answers and marking scheme.",
  "output_schema": {
    "type": "object",
    "properties": {
      "questions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "question": { "type": "string" },
            "type": { "enum": ["mcq", "short_answer", "long_answer", "practical"] },
            "answer": { "type": "string" },
            "marks": { "type": "number" },
            "difficulty": { "enum": ["easy", "medium", "hard"] }
          }
        }
      }
    }
  }
}
```

---

## 19.5 AI Service Architecture (Revised)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI CAPABILITY LAYER                                  │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                    │
│  │ AI Gateway   │  │ Task         │  │ Provider      │                    │
│  │ (API)        │──│ Dispatcher   │──│ Router        │                    │
│  │              │  │              │  │               │                    │
│  │ REST/GraphQL │  │ Resolves     │  │ Selects       │                    │
│  │ endpoints    │  │ task config  │  │ provider      │                    │
│  └──────┬───────┘  │ per tenant   │  │ per task      │                    │
│         │          └──────────────┘  └───────┬───────┘                    │
│         │                                     │                            │
│         │                    ┌────────────────┼────────────────┐          │
│         │                    ▼                ▼                ▼          │
│         │             ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│         │             │ OpenAI   │    │ Anthropic│    │ Google   │       │
│         │             │ Provider │    │ Provider │    │ Provider │       │
│         │             └──────────┘    └──────────┘    └──────────┘       │
│         │                                                                 │
│  ┌──────▼──────────────────────────────────────────────────────────┐     │
│  │                   AI SERVICE (Python OR Node.js)                  │     │
│  │                                                                   │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │     │
│  │  │ Chatbot      │  │ Async Jobs   │  │ Batch Processing     │   │     │
│  │  │ (Telegram,   │  │ (Grading,    │  │ (Report Generation,  │   │     │
│  │  │  WhatsApp,   │  │  Analysis,   │  │  Bulk Question Gen,  │   │     │
│  │  │  Web Chat)   │  │  OCR)        │  │  Embeddings)         │   │     │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │     │
│  │                                                                   │     │
│  │  ⚠️ NEVER accesses PostgreSQL directly.                           │     │
│  │  ALL data via Backend Internal APIs (x-api-key).                  │     │
│  └───────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 19.6 Multi-Channel AI Interaction

```typescript
// ai/channels/channel.interface.ts
interface AIChannel {
  /** Receive a message from the channel */
  onMessage(handler: (message: ChannelMessage) => Promise<void>): void;
  
  /** Send a response back to the channel */
  sendMessage(recipient: string, content: string, options?: any): Promise<void>;
  
  /** Channel identifier */
  readonly name: string;
}

// Channels: TelegramChannel, WhatsAppChannel, WebChatChannel, VoiceChannel
```

---

## 19.7 Tenant-Specific AI Configuration

```json
{
  "ai_config": {
    "default_provider": "openai",
    "model_mapping": {
      "homework.ai_generate": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
      "grading.auto_evaluate": { "provider": "openai", "model": "gpt-4o" },
      "chatbot.general": { "provider": "openai", "model": "gpt-4o-mini" },
      "report.parent_summary": { "provider": "anthropic", "model": "claude-haiku-3-5" }
    },
    "cost_limits": {
      "daily_budget_usd": 10,
      "monthly_budget_usd": 200
    },
    "data_policy": {
      "allow_training_on_data": false,
      "data_residency_required": true,
      "use_local_model_fallback": true
    },
    "language": {
      "primary": "en",
      "supported": ["en", "hi", "mr"],
      "auto_translate_responses": true
    }
  }
}
```

---

## 19.8 Cost Management & Observability

```sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  task_code VARCHAR(100),
  provider VARCHAR(50),
  model VARCHAR(50),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost_usd DECIMAL(10, 6),
  latency_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(tenant_id, created_at),
  INDEX(tenant_id, task_code, created_at)
);
```

---

## 19.9 Avoiding AI Vendor Lock-In — Checklist

| Measure | Status |
|---------|--------|
| ✅ Abstract provider interface (OpenAI, Anthropic, Google, local) | Designed |
| ✅ Per-tenant provider/model selection | Designed |
| ✅ Configurable prompts per task per tenant | Designed |
| ✅ Structured output with JSON Schema (not provider-specific) | Designed |
| ✅ Usage/cost tracking | Designed |
| ✅ Local model support (Ollama/vLLM) for data residency | Designed |
| ✅ Multi-channel chatbot abstraction | Designed |
| ✅ AI NEVER accesses database directly | Maintained |
| ⬜ Prompt versioning and A/B testing | Future |
| ⬜ Model fine-tuning support | Future |
| ⬜ RAG (Retrieval-Augmented Generation) for school documents | Future |

---

> **Next:** See [`20-extensibility-migration.md`](./20-extensibility-migration.md) for Extensibility Review & Migration Plan.
