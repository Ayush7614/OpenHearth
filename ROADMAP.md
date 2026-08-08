# OpenHearth Roadmap

**Product north star:** Make every GitHub contribution visible — then make it *understandable* with AI agents that audit, explain, compare, and act.

**Current release:** `2.8.1` (CLI ASCII banner + README/npm banner image + Agent/MCP)  
**This document:** full-fledged roadmap (**125 features**) with a heavy **LLM / AI / Agents** track.

Status legend:

| Status | Meaning |
| --- | --- |
| `shipped` | In 2.5.x–2.6.x |
| `next` | Near-term (2.6–2.8) |
| `planned` | Mid-term (2.9–3.x) |
| `horizon` | Long-term / research |

Priority: `P0` must-have · `P1` strong · `P2` stretch · `P3` explore

---

## Vision pillars

1. **Truth** — Search API still beats the activity feed  
2. **Story** — LLMs turn audits into narratives humans share  
3. **Agency** — agents that run audits, watch drift, open digests, propose PRs  
4. **Trust** — no silent token leaks; cite sources; human-in-the-loop  
5. **Surface** — CLI · browser · Action · MCP · IDE agents  

---

## A. LLM core & narratives (1–20)

| # | Feature | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | Monthly audit **AI summary** (CLI `--ai-summary`) | P0 | shipped | Local or API model; cite repo counts |
| 2 | **Hidden-repo explainer** — why each repo was likely truncated | P0 | shipped | Ranked activity + feed cap heuristics |
| 3 | **Natural-language Q&A** over a saved month (`ask "what changed?"`) | P0 | next | RAG over insights + top items |
| 4 | **Share-card caption generator** (LinkedIn / X / README blurb) | P0 | shipped | One-click from share/portfolio `--ai-summary` |
| 5 | **Multi-month narrative** (“your year in OSS”) | P1 | planned | Needs year audit + byDay |
| 6 | **Tone presets** (hiring / humble / technical / exec) | P1 | shipped | Prompt templates |
| 7 | **Evidence citations** — every claim links to repos/PRs | P0 | shipped | Anti-hallucination gate |
| 8 | **Diff-of-months in English** (MoM story) | P1 | planned | From compareLastTwoMonths |
| 9 | **Language/stack inference** from repo set via LLM | P1 | planned | Optional enrichment |
| 10 | **Contribution themes** clustering (docs, infra, features) | P1 | planned | Embeddings over PR titles |
| 11 | **Risk language detector** (secrets in titles, TOCTOU notes) | P2 | planned | Safety assist |
| 12 | **README badge text** from latest audit | P2 | next | Markdown snippet |
| 13 | **Changelog draft** from user’s merged PRs in range | P1 | planned | Per-repo or global |
| 14 | **Interview talking points** from portfolio card | P1 | next | Hiring mode upgrade |
| 15 | **Peer review coach** — how you review vs merge | P2 | planned | From review audits |
| 16 | **Multilingual summaries** (EN/HI/ES/…) | P2 | horizon | |
| 17 | **Streaming summaries** in CLI + UI | P1 | next | SSE / token stream |
| 18 | **Offline small-model mode** (Ollama / llama.cpp) | P0 | shipped | `OPENHEARTH_LLM=ollama` |
| 19 | **Cloud model adapters** (OpenAI / Anthropic / Gemini / Groq) | P0 | shipped* | *OpenAI/Anthropic/Ollama in 2.6; Gemini/Groq pending |
| 20 | **Prompt versioning** + eval snapshots | P1 | planned | Reproducible AI |

---

## B. AI agents & orchestration (21–45)

| # | Feature | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 21 | **`openhearth agent`** interactive REPL | P0 | shipped | Tool-calling loop |
| 22 | Agent tool: `run_audit` | P0 | shipped | |
| 23 | Agent tool: `run_hidden` / `run_proof` | P0 | shipped | |
| 24 | Agent tool: `compare_users` / `overlap` | P0 | shipped | |
| 25 | Agent tool: `lens_repo` | P1 | shipped | |
| 26 | Agent tool: `publish_gist_report` | P1 | shipped | |
| 27 | Agent tool: `write_digest` + webhook post | P1 | shipped | |
| 28 | Agent tool: `import_json` / `save_workspace` | P1 | planned | Browser bridge |
| 29 | **Planner agent** — multi-step monthly ritual | P0 | planned | Schedule + checklist |
| 30 | **Watcher agent** — alert on hidden-repo spike | P0 | planned | Drift from #19 backlog |
| 31 | **Hiring scout agent** — portfolio pack for N candidates | P1 | planned | |
| 32 | **Team radar agent** — from `openhearth.yml` | P0 | next | Extends `run` |
| 33 | **PR comment agent** — first-time contributor context | P1 | planned | GitHub App |
| 34 | **Issue triage agent** (optional) using contrib graph | P2 | horizon | |
| 35 | **Multi-agent debate** (skeptic vs advocate on impact) | P2 | horizon | Fun / research |
| 36 | **Human approval gates** before any write/post | P0 | shipped | Default deny writes |
| 37 | **Agent memory** per workspace (local vector store) | P1 | planned | |
| 38 | **Agent run logs** (auditable transcript) | P0 | shipped | |
| 39 | **Cost / token budget caps** | P0 | shipped | |
| 40 | **Dry-run mode** for agents | P0 | shipped | |
| 41 | **Cron agent** via Action + model | P1 | planned | |
| 42 | **Slack/Discord agent bot** (`/hearth @user July`) | P1 | planned | |
| 43 | **Cursor / Copilot agent skill** pack | P0 | shipped | Ship `.cursor` skill |
| 44 | **Claude Desktop / ChatGPT Actions** connector | P1 | planned | |
| 45 | **Swarm mode** — parallel user audits with merge report | P2 | horizon | |

---

## C. MCP & tool ecosystem (46–58)

| # | Feature | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 46 | **Official OpenHearth MCP server** | P0 | shipped | stdio + HTTP |
| 47 | MCP: audit / hidden / proof tools | P0 | shipped | |
| 48 | MCP: board compare / overlap | P1 | shipped | |
| 49 | MCP: resources for saved runs | P1 | planned | |
| 50 | MCP: prompts library (summary, hiring, digest) | P1 | shipped | |
| 51 | MCP auth via device flow / PAT | P0 | shipped | |
| 52 | **Cursor rule** recommending OpenHearth for contrib claims | P1 | next | |
| 53 | **VS Code extension** thin client | P2 | planned | |
| 54 | **JetBrains plugin** (horizon) | P3 | horizon | |
| 55 | **Zapier / n8n node** | P2 | planned | |
| 56 | **Raycast extension** | P2 | planned | |
| 57 | **Alfred workflow** | P3 | horizon | |
| 58 | **Browser extension** — inject “Open in OpenHearth” on profiles | P1 | planned | |

---

## D. Copilot chat & UI AI (59–72)

| # | Feature | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 59 | **Workspace chat panel** (“explain July”) | P0 | next | |
| 60 | **Board chat** (“who grew hidden repos most?”) | P1 | planned | |
| 61 | **Share-page AI blurb** button | P0 | next | |
| 62 | **Onboarding AI** — guided first audit | P1 | next | |
| 63 | **Smart empty states** with suggested prompts | P1 | next | |
| 64 | **Chart annotations** by LLM | P2 | planned | |
| 65 | **Day heatmap story** (“busy weeks explained”) | P1 | planned | |
| 66 | **Proof mode narration** (feed vs search) | P0 | shipped | Deterministic gap narrative |
| 67 | **Voice input** for ask (Web Speech) | P3 | horizon | |
| 68 | **Accessible plain-language mode** | P1 | planned | |
| 69 | **Dark/light aware report themes** for AI HTML | P2 | next | |
| 70 | **Inline “why this repo?”** tooltips | P1 | next | |
| 71 | **AI-generated OG images** for share cards | P1 | planned | |
| 72 | **Portfolio website generator** (static) | P1 | planned | |

---

## E. Data, RAG & intelligence (73–88)

| # | Feature | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 73 | Persist **full item index** (optional) for RAG | P0 | planned | Beyond insights snapshot |
| 74 | **Embeddings cache** per workspace | P1 | planned | |
| 75 | **Semantic search** across saved months | P1 | planned | |
| 76 | **Similar contributors** discovery | P2 | horizon | Privacy-sensitive |
| 77 | **Org knowledge graph** (users ↔ repos) | P1 | planned | |
| 78 | **Topic tags** auto-labeled | P1 | planned | |
| 79 | **Burnout / intensity signals** (optional, careful UX) | P2 | horizon | Ethics review |
| 80 | **Bus-factor personal score** | P1 | planned | Earlier backlog |
| 81 | **First-time vs returning repos** AI blurb | P1 | planned | |
| 82 | **Review latency insights** + LLM tips | P2 | planned | |
| 83 | **Cross-forge unified RAG** (when GitLab lands) | P2 | horizon | |
| 84 | **Eval harness** — golden audits + summary quality | P0 | planned | |
| 85 | **Hallucination tests** in CI | P0 | planned | |
| 86 | **Synthetic demo personas** for AI demos | P1 | next | Extend demo.ts |
| 87 | **Public dataset** of anonymized patterns (opt-in) | P3 | horizon | |
| 88 | **Feature store** for agent tools | P2 | horizon | |

---

## F. Product surface (non-AI + AI-ready) (89–105)

| # | Feature | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 89 | Real GitHub App OAuth (no PAT paste) | P0 | planned | Extends scaffold |
| 90 | Gist short URLs polish + expiry | P1 | shipped* | *basic in 2.5 |
| 91 | Day heatmap v2 (full calendar year) | P1 | shipped* | *month byDay in 2.5 |
| 92 | `openhearth.yml` schemas + validation | P1 | next | |
| 93 | Action artifact one-click unzip import | P1 | planned | |
| 94 | Board deep links `?a=&b=` | P1 | next | |
| 95 | Public report cards CDN | P1 | planned | |
| 96 | Org radar dashboard (Pages) | P1 | planned | |
| 97 | Leaderboards (opt-in) | P2 | planned | |
| 98 | Webhook digest templates (AI-written) | P1 | next | |
| 99 | Slack Block Kit digests | P1 | planned | |
| 100 | Discord embeds | P2 | planned | |
| 101 | Email digest (Resend/Postmark) | P2 | planned | |
| 102 | GitLab forge live | P1 | planned | Stub today |
| 103 | Bitbucket forge live | P2 | horizon | |
| 104 | SourceHut / Codeberg adapters | P3 | horizon | |
| 105 | Mobile-responsive board redesign | P1 | planned | |

\*Partial — deepen in later releases.

---

## G. Trust, safety & enterprise (106–115)

| # | Feature | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 106 | **AI safety card** — what leaves the machine | P0 | shipped | |
| 107 | Redact tokens from agent logs | P0 | next | |
| 108 | Allowlist models / endpoints | P0 | next | |
| 109 | SOC2-minded data retention controls | P2 | horizon | |
| 110 | SSO for hosted OpenHearth (if SaaS) | P2 | horizon | |
| 111 | Air-gapped mode docs | P1 | planned | Ollama-only |
| 112 | Signed AI reports (attestations) | P2 | horizon | |
| 113 | Policy: never auto-commit without flag | P0 | next | |
| 114 | Abuse rate limits for public ask endpoints | P1 | planned | If hosted |
| 115 | Transparency disclosure for AI text | P0 | shipped | |

---

## H. Growth, DX & platform (116–120+)

| # | Feature | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 116 | Interactive tutorial with AI coach | P1 | planned | |
| 117 | Template gallery (hiring, OSS maintainer, student) | P1 | next | |
| 118 | Case-study generator from real audits | P2 | planned | |
| 119 | University workshop kit | P2 | planned | |
| 120 | **OpenHearth Protocol** — JSON schema for audits + AI layers | P0 | next | Stabilizes ecosystem |
| 121 | Plugin API for community agents | P1 | planned | |
| 122 | Marketplace Action: AI summary input flag | P1 | shipped | `ai-summary` + `ai-tone` inputs on composite action |
| 123 | npm `create-openhearth` scaffolder | P2 | planned | |
| 124 | Telemetry (opt-in) for feature demand | P2 | planned | Privacy-first |
| 125 | Roadmap voting via Discussions | P1 | next | |

**Count: 125 tracked features.**

---

## Suggested release trains

### 2.6 — “AI Summaries” (P0 slice)
1, 2, 4, 7, 18, 19, 59, 61, 66, 106, 115, 120, 122

### 2.7 — “Agent + MCP”
21–27, 36, 38–40, 43, 46–51

### 2.8 — “Workspace Copilot”
3, 17, 32, 59–63, 70, 86, 94, 98

### 3.0 — “OpenHearth Intelligence”
5, 8–10, 29–31, 37, 73–78, 84–85, 89, 96

### 3.x+ — Multi-forge agents & platform
45, 83, 102–104, 109–112, 121, 123–125

---

## AI architecture (target)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ CLI / Site  │────▶│ Agent runtime    │────▶│ LLM providers   │
│ Action/MCP  │     │ tools + memory   │     │ Ollama/API/…    │
└─────────────┘     └────────┬─────────┘     └─────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Audit engine     │
                    │ (Search API)     │
                    │ insights + byDay │
                    └──────────────────┘
```

**Rules for AI features**
- Cite evidence (repos, counts, links) or don’t claim it  
- Default to local/offline when possible  
- Never send PATs to model providers  
- Writes (gist, webhook, PR comment) require explicit approval  

---

## How we pick next work

1. Does it make **hidden work** more believable or shareable?  
2. Can an **agent** do it with existing tools?  
3. Ship a thin vertical slice (CLI flag → UI button → Action input).  
4. Add an eval before calling it “done.”  

---

## Immediate ask

When you’re ready to implement, start **2.6 AI Summaries**:

```bash
openhearth audit USER --month YYYY-MM --ai-summary
openhearth ask USER "What did the feed hide in July?"
```

Say the word and we’ll turn **2.6** into a concrete PR plan + first vertical slice.
