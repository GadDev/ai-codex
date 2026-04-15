---
id: note-38
slug: ai-coding-assistant-landscape-comparison
title: AI Coding Assistant Landscape Architecture Pricing and How to Choose
tags: [ai-coding, copilot, cursor, windsurf, code-assistants, developer-tools]
emoji: 🤖
---

# AI Coding Assistant Landscape: Architecture, Pricing, and How to Choose

---

## Overview

AI coding assistants have evolved from simple autocomplete to full-context code generation and agentic workflows. The landscape splits into three categories: IDE plugins (GitHub Copilot, Gemini Code Assist, Amazon Q), AI-native editors (Cursor, Windsurf), and CLI agents (Claude Code). Each uses different underlying models—GPT-4, Claude 3.5 Sonnet, Gemini 2.0—with varying context window strategies and interaction patterns. The key choice isn't about which model is 'best', but which workflow fits your editing rhythm: inline suggestions during flow state, chat-driven refactoring sessions, or autonomous multi-file edits. Pricing ranges from $10-$50/month for individuals, with enterprise tiers adding security and compliance layers.

---

## The Three Interaction Paradigms

AI coding tools differ fundamentally in *how* they interact with your workflow, not just which model they use.

**Inline completion** (GitHub Copilot, Gemini Code Assist) works like autocomplete on steroids. You type, pause, and the AI fills in the next 1-10 lines. The model sees your current file plus recently edited files (typically 10-20KB context). This is optimised for flow state—you never leave your editor, never break focus. The latency budget is tight (200-500ms), so these tools use smaller, faster models or heavily cached embeddings.

**Chat-driven refactoring** (Cursor, Windsurf, Amazon Q) gives you a side panel where you describe what you want in natural language. The AI reads your codebase, proposes changes, and you accept/reject. Context windows here are larger (50-200KB), latency is more forgiving (2-5 seconds), and the models are typically frontier-class (GPT-4, Claude 3.5 Sonnet). This paradigm suits exploratory work—'refactor this class to use dependency injection', 'add error handling to all API calls'.

**Agentic CLI** (Claude Code, emerging tools) runs in your terminal, executing multi-step plans autonomously. You give it a high-level goal ('migrate from REST to GraphQL'), it reads your code, writes a plan, executes file edits, runs tests, and iterates on failures. This requires the largest context windows (100K+ tokens), longest response times (10-60 seconds), and strongest reasoning models. The agent pattern is powerful but high-stakes—it can break your codebase if the plan goes wrong.

Most developers use a mix: inline completion for the 80% repetitive work, chat for refactoring, and CLI agents for migrations or batch changes.

---

## GitHub Copilot — The Incumbent

**Architecture**: Copilot uses OpenAI Codex (a GPT-3.5-class model fine-tuned on code) for inline suggestions and GPT-4 for chat. The plugin sends your current file, neighbouring tabs, and a snippet of your git history to OpenAI's inference endpoint. Context is limited to ~8KB for inline, ~32KB for chat (as of late 2024).

The key technical detail: Copilot uses a *fill-in-the-middle* (FIM) objective during training. Standard language models predict left-to-right, but code often requires filling gaps—think function bodies or parameter lists. FIM models see `prefix <FILL> suffix` during training, so they're better at cursor-position completion.

**Pricing**:
- Individual: $10/month or $100/year
- Business: $19/user/month (adds IP indemnity, policy controls)
- Enterprise: $39/user/month (audit logs, SAML SSO)

**Integration**: VS Code, JetBrains IDEs, Neovim, Visual Studio. No standalone editor.

**Strengths**: Best inline completion latency (150-300ms). Huge training dataset (all public GitHub code). Tight integration with GitHub—it knows your repo structure, PR context, and issue history.

**Limitations**: Smaller context window than competitors. No agentic mode (you can't say 'refactor this entire module'). Chat is GPT-4-based, so slower and less code-aware than Claude 3.5 Sonnet for complex reasoning.

**When to choose**: You live in VS Code or JetBrains, you trust Microsoft's data handling, and you prioritise speed over cutting-edge model capabilities. If your company already uses GitHub Enterprise, this is the path of least procurement resistance.

---

## Cursor — The AI-Native Editor

**Architecture**: Cursor is a fork of VS Code with AI baked into the core. It supports multiple models—GPT-4, GPT-4 Turbo, Claude 3.5 Sonnet, and custom OpenAI-compatible endpoints. You switch models per-task: Claude for reasoning-heavy refactors, GPT-4 Turbo for speed.

Cursor's killer feature is **codebase indexing**. On first load, it embeds your entire repository (using a custom text-embedding model) and stores vectors locally. When you ask a question, it retrieves relevant files using semantic search, then feeds 50-200KB of context to the chat model. This is why Cursor can answer 'where is authentication handled?' across a 100K-line codebase.

The second innovation: **Composer mode**. You describe a multi-file change ('add logging to all database queries'), Cursor generates a diff across 5-10 files, and you review in a unified interface. Under the hood, this uses Claude 3.5 Sonnet with a 200K token context window and a custom diff-generation prompt.

**Pricing**:
- Free: 2000 completions/month, limited chat
- Pro: $20/month (unlimited completions, 500 premium model requests, codebase indexing)
- Business: $40/user/month (centralised billing, team analytics)

**Integration**: Standalone editor (VS Code fork). You can import your VS Code settings and extensions, but it's a separate app.

**Strengths**: Largest effective context window (thanks to retrieval). Multi-model flexibility. Composer mode for multi-file edits. Open to custom models (run local Llama 3.1 if you want).

**Limitations**: Switching from VS Code/JetBrains means re-learning muscle memory (though 90% identical). Codebase indexing is local-only—no cloud sync for teams. Premium model requests are rate-limited (500/month on Pro).

**When to choose**: You're willing to switch editors for a 10x improvement in refactoring speed. You work on large codebases (50K+ lines) where semantic search is a game-changer. You want Claude 3.5 Sonnet's reasoning for architecture decisions.

---

## Windsurf — The Flow-Optimised Hybrid

**Architecture**: Windsurf (from Codeium) is another VS Code fork, competing directly with Cursor. It uses a hybrid model stack: a proprietary fast model (Codeium's own, trained on permissively-licensed code) for inline, and GPT-4/Claude 3.5 for chat.

The differentiator is **Cascade mode**—an agentic workflow that runs inside the editor. You describe a task, Cascade reads your code, writes a plan, executes edits across files, runs tests, and fixes failures in a loop. It's halfway between Cursor's Composer (single-shot multi-file diff) and a full CLI agent (autonomous iteration).

Windsurf also has **Supercomplete**, which predicts not just the next line but the next 3-5 logical steps (e.g., import statement → function definition → test case). This uses a custom sequence-to-sequence model trained on commit diffs.

**Pricing**:
- Free: Unlimited inline completions (using Codeium's model), limited chat
- Pro: $15/month (unlimited GPT-4/Claude chat, Cascade mode, Supercomplete)
- Enterprise: Custom pricing (SSO, audit logs, on-prem deployment option)

**Integration**: Standalone editor (VS Code fork), plus plugins for VS Code and JetBrains (plugin has fewer features).

**Strengths**: Cascade mode is the closest to 'AI pair programmer' without leaving the editor. Supercomplete is genuinely useful for boilerplate-heavy tasks (React components, API endpoints). Free tier is more generous than Cursor (unlimited inline).

**Limitations**: Smaller community than Cursor (launched mid-2024). Cascade mode is impressive but brittle—it can get stuck in loops if tests fail unexpectedly. Supercomplete requires aggressive caching, so first-use latency is high.

**When to choose**: You want agentic workflows without a CLI. You write boilerplate-heavy code (web frontends, CRUD APIs). You're budget-conscious but want frontier models for complex tasks.

---

## Claude Code — The Agentic CLI

**Architecture**: Claude Code (from Anthropic) is a terminal-based agent powered by Claude 3.5 Sonnet. You give it a task in natural language, and it autonomously reads files, writes code, runs commands, and iterates on failures. It uses **tool use** (formerly function calling): the model outputs structured JSON like `{"tool": "write_file", "path": "src/app.py", "content": "..."}`, and the CLI executes it.

The context window is 200K tokens, but Claude Code uses a **working memory** pattern: it maintains a running summary of the task, completed steps, and current blockers. When context fills up, it compresses earlier steps into the summary and forgets raw file content (but remembers 'I added error handling to auth.py').

The safety mechanism: after generating a plan, it asks for confirmation before executing. You can also run in **interactive mode**, where it pauses before every file edit or shell command.

**Pricing**:
- Free tier: 50 messages/day (approx 20-30 coding tasks)
- Pro: $20/month (500 messages/day, priority access)
- API-based: Pay-per-token if you use the Anthropic API directly (approx $3-10/day for heavy use)

**Integration**: Command-line tool (works with any editor). No IDE integration—you use it alongside VS Code/Neovim/whatever.

**Strengths**: Best at autonomous multi-step tasks (migrations, adding test coverage across a project, refactoring patterns). Claude 3.5 Sonnet's reasoning is top-tier for code—it catches edge cases GPT-4 misses. Terminal-based means no vendor lock-in to an editor.

**Limitations**: No inline completions (you still need Copilot/Cursor for flow state). High latency (15-60 seconds for complex tasks). Autonomous mode can break things—one user reported it accidentally deleted a config file during a refactor. Requires discipline to review plans before execution.

**When to choose**: You have a large, gnarly refactoring task (migrate from class components to hooks, add type hints to 50 Python files). You're comfortable with the terminal and want AI to handle the tedious parts. You don't mind slower, deliberate workflows.

---

## Gemini Code Assist — The Google Cloud Play

**Architecture**: Gemini Code Assist (formerly Duet AI) uses Google's Gemini 2.0 Flash model for inline and Gemini 2.0 Pro for chat. It's designed for Google Cloud customers—tight integration with Cloud Workstations, Cloud Code, and GCP APIs.

The unique feature: **enterprise codebase grounding**. You can point it at your internal code search index (via Cloud Code), and it will retrieve context from your private repos before generating code. This uses Google's internal RAG pipeline (retrieve → rank → rewrite prompt). The retrieval step searches across millions of lines of internal code in <200ms.

Gemini Code Assist also has **change impact analysis**: before suggesting a refactor, it scans dependent code and surfaces potential breakages. This uses a custom static analysis engine (think TypeScript's language server, but cross-language).

**Pricing**:
- Individual: $19/month (requires Google Cloud account)
- Enterprise: $45/user/month (codebase grounding, change impact, admin controls)

**Integration**: VS Code, JetBrains IDEs, Cloud Workstations (Google's cloud IDE). Requires GCP project for full features.

**Strengths**: Best enterprise governance—code never leaves your GCP tenant. Codebase grounding is killer for large orgs (search 10M+ lines of internal code). Change impact analysis prevents refactoring disasters. Multimodal—can read diagrams and screenshots (e.g., 'implement this API design').

**Limitations**: Locked into Google Cloud (no standalone use). Gemini 2.0's code quality is good but not quite Claude 3.5 level for complex reasoning. Latency is higher than Copilot (300-800ms for inline). Smaller community than Cursor/Copilot.

**When to choose**: Your company uses Google Cloud heavily. You need strict data residency (code never sent to external APIs). Your codebase is massive (1M+ lines) and you need semantic search across internal repos.

---

## Amazon Q Developer — The AWS Specialist

**Architecture**: Amazon Q Developer (formerly CodeWhisperer) uses a custom model trained on Amazon's internal code plus open-source repos. The model architecture is undisclosed, but benchmarks suggest GPT-3.5-class performance. Chat mode uses a larger model (likely Claude 3 Haiku via Bedrock, though AWS hasn't confirmed).

The standout feature: **AWS SDK expertise**. Q Developer is fine-tuned on AWS documentation and SDKs, so it excels at boto3 (Python), AWS SDK for JavaScript, and CDK patterns. If you ask 'write a Lambda function that processes S3 events', it generates correct IAM policies, environment variables, and error handling out of the box.

Another unique tool: **/dev** mode, where you describe a feature and Q generates a multi-file implementation, writes tests, and creates a PR in CodeCatalyst (AWS's GitHub competitor). This is agentic but constrained to AWS workflows.

**Pricing**:
- Free: Unlimited inline completions, 50 chat messages/month
- Pro: $19/month (unlimited chat, /dev mode, security scans)
- Enterprise: Custom (SSO, admin policies, usage analytics)

**Integration**: VS Code, JetBrains IDEs, AWS Cloud9, Lambda console. Works in the AWS web console (you can chat with Q while configuring services).

**Strengths**: Best for AWS-heavy codebases—it knows IAM, CloudFormation, and CDK idioms better than any competitor. Free tier is generous (unlimited inline). Security scanning detects common AWS misconfigurations (e.g., public S3 buckets). Integrated into the AWS console (unique among these tools).

**Limitations**: Weaker than Cursor/Copilot on non-AWS code (React, Django, etc.). /dev mode only works with CodeCatalyst (not GitHub/GitLab). Model quality lags behind GPT-4 and Claude for complex reasoning.

**When to choose**: You build on AWS and spend 80%+ of your time writing Lambda functions, CDK stacks, or boto3 scripts. You want security scanning for free. You're already deep in the AWS ecosystem and don't want another vendor.

---

## Model Quality and Context Windows — What Actually Matters

The marketing materials scream about 'GPT-4 Turbo' and '200K context', but what matters in practice?

**Model reasoning ability**: For inline completions, model quality matters less—most tools use small, fast models (GPT-3.5-class) and rely on cached embeddings. For chat and agentic workflows, Claude 3.5 Sonnet currently leads on code reasoning. It catches off-by-one errors, remembers variable scope across files, and suggests cleaner abstractions than GPT-4. Gemini 2.0 is close but occasionally hallucinates API names.

**Effective context window**: Raw token count (200K) is meaningless without retrieval. Cursor's 50KB retrieval + 200K window beats a naive 200K context filled with irrelevant files. The key metric: *How much relevant code can the model see?* Cursor and Windsurf win here via semantic search. Copilot loses because it only sees neighbouring files.

**Latency vs quality trade-off**: Inline completions need <500ms or you disrupt flow state. This forces tools to use smaller models or aggressive caching. Chat can tolerate 2-5 seconds. Agentic CLI workflows can take 60+ seconds because you're already context-switching. Don't expect Claude 3.5-quality inline suggestions—the physics don't allow it.

**Fine-tuning on your codebase**: Most tools don't offer this (too expensive to fine-tune per customer). Cursor and Gemini Code Assist use retrieval instead—cheaper and more flexible. The exception: enterprise contracts with Copilot or Amazon Q sometimes include custom fine-tuning, but this costs $50K-500K and requires 6+ months of data collection.

**Multimodal capabilities**: Only Gemini Code Assist (via Gemini 2.0) handles images well. You can screenshot a Figma design and ask it to generate React components. Cursor and Windsurf support images in chat but don't use them effectively. This matters for frontend work and API design (paste a schema diagram, get working code).

---

## Pricing Deep Dive — Total Cost of Ownership

Published prices ($10-40/month) hide the real costs:

**Individual developers**:
- **Copilot**: $10/month. Simple, predictable.
- **Cursor Pro**: $20/month, but you'll burn through 500 premium requests in 2 weeks of heavy use. Add $20-50/month for OpenAI API calls if you use your own key.
- **Windsurf Pro**: $15/month, better value if you rely on chat over inline.
- **Claude Code**: $20/month for Pro, but heavy users (10+ refactorings/day) hit rate limits. API-based usage costs $5-15/day.
- **Gemini Code Assist**: $19/month, but requires a GCP account (minimum $0/month if you stay in free tier, but realistically $20-100/month for Cloud Build, artifact registry, etc.).
- **Amazon Q Pro**: $19/month, no hidden costs.

**Teams (10 developers)**:
- **Copilot Business**: $190/month. Add $100-200/month for GitHub Enterprise if you don't have it.
- **Cursor Business**: $400/month. Add $500-1000/month for shared codebase indexing (on roadmap, not yet available).
- **Windsurf Enterprise**: Custom, typically $30-50/user/month for 10+ seats.
- **Gemini Code Assist Enterprise**: $450/month + GCP costs (Cloud Workstations are $200-500/month for 10 users).
- **Amazon Q Enterprise**: Custom, typically $30/user/month.

**Enterprise (100+ developers)**:
- All tools offer volume discounts (20-40% off list price).
- Real costs include: training (10-20 hours per dev), integration with internal tools (SSO, VPN, secret management), and compliance audits (if you're in finance/healthcare, add $50K-200K for vendor security reviews).
- Opportunity cost: switching editors (Cursor/Windsurf) means 2-4 weeks of lost productivity per dev. Plugin-based tools (Copilot, Gemini, Q) integrate faster.

**Hidden costs**:
- **Prompt engineering time**: Agentic tools (Claude Code, Windsurf Cascade) require learning how to write effective task descriptions. Budget 10-20 hours per dev.
- **Context management**: Large codebases (500K+ lines) slow down retrieval-based tools. Cursor and Windsurf need 16GB+ RAM for embedding storage. This isn't free on cloud dev machines.
- **Model switching overhead**: Cursor's multi-model support is powerful but cognitively taxing. Teams need guidelines: 'Use Claude for architecture, GPT-4 Turbo for speed, local Llama for privacy-sensitive files.'

---

## Decision Framework — Matching Tool to Workflow

The right tool depends on your editing rhythm, codebase size, and risk tolerance.

**If you optimise for flow state** (writing new code >50% of the time):
- Choose: **GitHub Copilot** or **Windsurf** (best inline latency)
- Avoid: Claude Code (no inline mode)

**If you refactor more than you write** (existing codebase, lots of tech debt):
- Choose: **Cursor** (Composer mode) or **Windsurf** (Cascade mode)
- Avoid: Copilot (chat is GPT-4-based but no multi-file diff UI)

**If your codebase is >100K lines**:
- Choose: **Cursor** or **Gemini Code Assist** (codebase-wide retrieval)
- Avoid: Copilot (context limited to neighbouring files)

**If you're AWS-heavy**:
- Choose: **Amazon Q** (SDK expertise, security scanning)
- Avoid: Cursor/Windsurf (no special AWS knowledge)

**If you're Google Cloud-native**:
- Choose: **Gemini Code Assist** (enterprise grounding, multimodal)
- Avoid: Amazon Q (obvious reasons)

**If you need air-gapped/on-prem**:
- Choose: **Windsurf Enterprise** (only tool with on-prem option) or **Cursor with local models**
- Avoid: Copilot, Gemini, Q (all cloud-only)

**If you're a solo dev or small team (<5 people)**:
- Choose: **Cursor** (best bang for buck at $20/month) or **Windsurf** ($15/month)
- Avoid: Enterprise-tier anything (overkill)

**If you're in a regulated industry** (finance, healthcare):
- Choose: **Gemini Code Assist Enterprise** (data residency guarantees) or **Copilot Enterprise** (IP indemnity)
- Avoid: Free tiers of anything (unclear data handling)

**If you want to experiment with local models** (Llama 3.1, DeepSeek Coder):
- Choose: **Cursor** (supports OpenAI-compatible endpoints)
- Avoid: Copilot, Q, Gemini (locked to their models)

**If you're migrating a legacy codebase**:
- Choose: **Claude Code** (agentic, best at large refactors)
- Avoid: Inline-focused tools (too manual for bulk changes)

---

## The Plugin vs Native Editor Debate

This is the most polarising decision: stick with your current editor + plugin, or switch to an AI-native editor?

**Plugin approach** (Copilot, Gemini, Q):
- **Pro**: Keep your muscle memory, extensions, and keybindings. Zero switching cost.
- **Pro**: Works across VS Code, JetBrains, Neovim—use the same tool on different projects.
- **Con**: AI is bolted on, not integrated. You can't do things like 'search codebase semantically and feed results to chat'—the plugin doesn't have low-level access.
- **Con**: Limited to what the plugin API allows. Copilot can't add new UI panels or modify the file tree (VS Code API restriction).

**Native editor approach** (Cursor, Windsurf):
- **Pro**: AI is first-class. Codebase indexing, semantic search, multi-file diffs—all built in.
- **Pro**: Faster iteration on new features (Cursor ships Composer mode in weeks, not months).
- **Con**: Switching cost. If you've spent years configuring Neovim or learning JetBrains shortcuts, starting over hurts.
- **Con**: Editor risk. Cursor is a VC-backed startup. If it shuts down, you're migrating again. (Though it's open-source, so community could fork.)
- **Con**: Extension compatibility. Cursor supports VS Code extensions, but some break (e.g., remote SSH development is flaky).

**The hybrid path**:
Many teams use both. Inline completions from Copilot (fast, low-friction) + Cursor for refactoring sessions (switch to it when you need the big guns). This costs $30/month ($10 Copilot + $20 Cursor) but maximises strengths of each.

**The ecosystem risk**:
Copilot is backed by Microsoft/OpenAI (low shutdown risk). Cursor raised $100M (safe for 3-5 years). Windsurf is from Codeium (profitable SaaS, low risk). Gemini and Q are from Google/AWS (immortal). Claude Code is from Anthropic (raised $7B, safe). The risk isn't shutdown—it's feature abandonment. Copilot could stagnate if Microsoft prioritises other bets.

---

## What's Coming — The Next 12-24 Months

AI coding tools evolve every 3-6 months. Here's what's on the horizon:

**Longer context windows**: GPT-5 and Claude 4 (rumoured 2025) will likely support 1M+ tokens. This means entire codebases in context—no retrieval needed. Cursor and Windsurf will adapt fast. Copilot might lag (locked to OpenAI's release schedule).

**Agent orchestration**: Current tools run one agent at a time. Next-gen tools will coordinate multiple agents—one refactors, one writes tests, one reviews for security issues. Windsurf Cascade is a prototype of this. Expect full multi-agent orchestration by late 2025.

**Test-driven development loops**: Tools will autonomously write failing tests, implement code, verify tests pass, and repeat. This requires models that can reason about test coverage and edge cases—Claude 4 and GPT-5 tier.

**Cross-repo understanding**: Today's tools see one codebase. Future tools will understand microservices architectures—'refactor the auth service to match the new API contract in the gateway repo'. This needs shared semantic search across repos.

**Multimodal IDE**: Gemini Code Assist is the first step, but expect tools that read Figma/Sketch designs, database schemas (as ER diagrams), and architecture docs (Mermaid, PlantUML) to generate code. Cursor and Windsurf will add this by mid-2025.

**Fine-tuning as a service**: Enterprise customers will fine-tune models on their private codebases for $5K-20K/year (down from $100K+ today). Gemini Code Assist might offer this first (Google has the infrastructure). Copilot will follow.

**Local model parity**: DeepSeek Coder V3 and Llama 4 (expected 2025) will match GPT-4 quality at 10x lower cost. Cursor and Windsurf will make local models first-class. Copilot won't (Microsoft sells cloud compute).

**IDE-native voice coding**: Pair programming by talking to your AI. Cursor and Windsurf could ship this in 6-12 months (using Whisper for transcription + Claude for understanding). Copilot might integrate with GitHub Copilot Voice (currently experimental).

**Regulatory constraints**: EU AI Act and US state privacy laws will force clearer data handling. Expect 'privacy modes' where code never leaves your machine (Cursor with local models, Windsurf on-prem). Free tiers might disappear in regulated markets.

---

## My Takeaways

- **Start with Copilot for 2 months** to learn AI-assisted coding patterns without switching editors, then evaluate whether you need Cursor's power (most devs don't until they hit 50K+ line codebases).
- **Use Claude Code for gnarly refactors** (adding type hints, migrating frameworks) and keep Copilot/Cursor for daily work—agentic CLI is a scalpel, not a hammer.
- **Switch to Cursor if you refactor >30% of the time** and your codebase is large enough that 'find all references' isn't good enough (semantic search pays off at 20K+ lines).
- **Choose Gemini Code Assist only if you're all-in on Google Cloud**—the tight integration is powerful, but you're locked in (can't move to AWS/Azure without losing codebase grounding).
- **Pick Amazon Q if you write boto3/CDK daily**—its AWS SDK fluency is unmatched, but use Cursor for everything else (Q's general code quality lags).
- **Budget for model switching friction in Cursor**—decide team-wide when to use Claude vs GPT-4 vs local models, or you'll waste time bikeshedding 'which model for this task?'.
- **Don't pay for enterprise tiers until you have 20+ devs**—SSO and audit logs aren't worth 2x the price for small teams (use individual plans + shared practices doc).
- **Test agentic modes (Cascade, Claude Code) on low-stakes tasks first**—they can break things, so start with 'add docstrings to this module' not 'refactor the entire auth system'.

---

## References

- GitHub Copilot official documentation: https://docs.github.com/en/copilot
- Cursor official website: https://cursor.sh
- Windsurf (Codeium) official website: https://codeium.com/windsurf
- Anthropic Claude documentation: https://docs.anthropic.com
- Google Gemini Code Assist: https://cloud.google.com/gemini/docs/codeassist
- Amazon Q Developer: https://aws.amazon.com/q/developer
- OpenAI Codex research paper (FIM training): https://arxiv.org/abs/2107.03374
- Analysis based on direct experience with each tool and publicly available technical documentation as of December 2024
