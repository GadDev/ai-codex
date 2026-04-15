---
title: AI App Security Checklist — 35 Steps Before You Ship
tags:
  [
    security,
    deployment,
    checklist,
    HTTPS,
    CORS,
    authentication,
    database,
    infrastructure,
    observability,
    API,
    launch,
  ]
source: Security Engineering best practices
---

# AI App Security Checklist — 35 Steps Before You Ship

A 35-step checklist from a Security Engineer's perspective for anyone shipping projects with AI. AI is great at helping you ship apps — you still have to be good at keeping them alive. **Losing on security is how you get shut down in week 1 of your launch.**

---

## [1] Security Basics

| #   | Check                                      |
| --- | ------------------------------------------ |
| ☑︎   | No API keys or secrets in frontend code    |
| ☑︎   | HTTPS enforced everywhere                  |
| ☑︎   | CORS locked to known origins               |
| ☑︎   | Server-side input validation enabled       |
| ☑︎   | Rate limiting on auth and sensitive routes |

**Why it matters:**

- API keys in frontend code are trivially scraped from browser DevTools or your public GitHub repo. Use environment variables server-side and never expose them to the client.
- HTTPS prevents man-in-the-middle attacks on every request — including auth tokens and user data.
- CORS misconfigured to `*` lets any website make credentialed requests to your API on behalf of your users.
- Client-side validation is UX; server-side validation is security. Never rely only on the former.
- Without rate limiting, a single script can burn through your token budget, lock out real users, or brute-force credentials in minutes.

---

## [2] Authentication and Access

| #   | Check                                          |
| --- | ---------------------------------------------- |
| ☑︎   | Every private route checks authentication      |
| ☑︎   | Authorization checks exist on every resource   |
| ☑︎   | Passwords hashed with bcrypt or argon2         |
| ☑︎   | Auth tokens have expiry                        |
| ☑︎   | Sessions are invalidated on logout server-side |

**Key concepts:**

- **Authentication** = who are you? **Authorization** = are you allowed to do this? Both must be enforced on every request, server-side.
- `bcrypt` and `argon2` are slow by design — they make offline dictionary attacks computationally expensive. Never use MD5, SHA-1, or unsalted hashes for passwords.
- Short-lived tokens (e.g., 15-minute JWTs + refresh tokens) limit the blast radius of a leaked credential.
- Logout must invalidate the session on the server, not just delete the client-side cookie. Otherwise stolen tokens remain valid.

---

## [3] Database and Data Safety

| #   | Check                                  |
| --- | -------------------------------------- |
| ☑︎   | Backups configured and restore-tested  |
| ☑︎   | Parameterized queries used everywhere  |
| ☑︎   | Dev and prod databases fully separated |
| ☑︎   | App connects with a non-root DB user   |
| ☑︎   | Migrations live in version control     |

**Why it matters:**

- Backups you haven't tested restoring are not backups. Run a restore drill before launch, not after a breach.
- Parameterized queries (prepared statements) are the only reliable defense against SQL injection — still the #1 web vulnerability (OWASP Top 10).
- A dev mistake run against prod is a data incident. Separate environments with separate credentials.
- The DB user your app connects with should have only the permissions it needs — no `DROP TABLE`, no `CREATE USER`.
- Version-controlled migrations mean every schema change is reviewable, reversible, and reproducible.

---

## [4] Deployment and Infrastructure

| #   | Check                                  |
| --- | -------------------------------------- |
| ☑︎   | Production env vars are set correctly  |
| ☑︎   | SSL certificate is valid and renewed   |
| ☑︎   | Firewall exposes only required ports   |
| ☑︎   | Process manager is configured properly |
| ☑︎   | Rollback plan exists before deploy     |

**Key concepts:**

- Missing or wrong env vars in prod are the most common cause of broken launches — validate them in a startup check.
- An expired SSL cert kills your app as hard as a crash. Use auto-renewal (Let's Encrypt / cert-manager).
- Close every port you don't need. A server running a database should not have port 5432 open to the internet.
- Use `systemd`, `PM2`, or a container orchestrator to restart crashed processes automatically.
- If you don't have a rollback plan, you have a one-way door. Tag releases and test your rollback procedure.

---

## [5] Reliability and Observability

| #   | Check                                     |
| --- | ----------------------------------------- |
| ☑︎   | Error tracking is enabled                 |
| ☑︎   | Logs are structured and searchable        |
| ☑︎   | Health checks exist for critical services |
| ☑︎   | Alerts are set for downtime and spikes    |
| ☑︎   | Staging test passed before prod deploy    |

**Why it matters:**

- Tools like Sentry or Datadog surface exceptions in real-time. Without them, you find out about bugs from angry users.
- Structured JSON logs (not `console.log("something broke")`) can be queried, filtered, and correlated across services.
- Health-check endpoints let load balancers and monitoring systems detect failures before users do.
- Alert on: error rate spikes, p99 latency, queue depth, and downtime. Silent failures are the worst kind.
- Staging should mirror prod as closely as possible — same env vars structure, same data shapes, same third-party integrations.

---

## [6] Code and API Quality

| #   | Check                                    |
| --- | ---------------------------------------- |
| ☑︎   | No debug logs in production build        |
| ☑︎   | Async flows handle errors cleanly        |
| ☑︎   | Loading and error states exist in UI     |
| ☑︎   | Pagination exists on list endpoints      |
| ☑︎   | Dependency audit run and criticals fixed |

**Key concepts:**

- Debug logs can leak internal state, user data, and stack traces. Strip them from prod builds or gate them behind log-level config.
- Unhandled promise rejections and async exceptions silently fail in many runtimes. Every `await` needs a try/catch or `.catch()`.
- Users will see loading and error states. Design them intentionally — they're part of the product.
- A list endpoint without pagination will OOM your server when the table has 100k rows. Add it before launch, not after.
- Run `npm audit` / `pip-audit` / `trivy` and fix critical and high CVEs before shipping. Known vulnerabilities in dependencies are a free entry point for attackers.

---

## [7] Launch Readiness

| #   | Check                                           |
| --- | ----------------------------------------------- |
| ☑︎   | Admin and internal routes audited manually      |
| ☑︎   | File uploads are validated server-side          |
| ☑︎   | Sensitive responses are never cached            |
| ☑︎   | Basic abuse paths were tested before launch     |
| ☑︎   | Someone reviewed the whole app like an attacker |

**Why it matters:**

- Admin routes forgotten in a refactor are a common source of privilege escalation. Walk every route manually with an unauthenticated session.
- File uploads must validate MIME type and file extension server-side, scan for malware, and never serve uploads from the same origin as your app.
- Auth tokens, user data, and API responses containing PII must set `Cache-Control: no-store`. Cached sensitive data leaks across users on shared CDNs.
- Run your own basic abuse tests: rate limit bypass, IDOR (Insecure Direct Object Reference), forced browsing to `/admin`, replaying old tokens.
- Threat-model your own app. Walk through it as an attacker would, not as the developer who built it. What's the worst thing someone could do?

---

## Quick Reference Summary

```
[1] Security basics      → secrets, HTTPS, CORS, validation, rate limits
[2] Auth & access        → authn/authz on every route, hashed passwords, token expiry
[3] Database safety      → backups, parameterized queries, least privilege
[4] Deployment           → env vars, SSL, firewall, process manager, rollback
[5] Observability        → error tracking, structured logs, health checks, alerts
[6] Code quality         → no debug logs, error handling, pagination, dep audit
[7] Launch readiness     → admin audit, file uploads, cache headers, attacker review
```

> **Cannot check every box? You are not ready to ship.**
>
> The patch after launch costs way more than the fix before launch.

---

## AI-Specific Security Considerations

When your app uses an LLM (Claude, GPT, etc.), these extra risks apply:

| Risk                          | Mitigation                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Prompt injection**          | Treat user content as untrusted data, not instructions. Never interpolate raw user input directly into system prompts with elevated trust. |
| **API key exposure**          | LLM API keys are high-value targets — rotate them, scope them, and set spend limits.                                                       |
| **Indirect prompt injection** | Attackers can embed instructions in documents or web pages your agent reads. Validate tool outputs before acting on them.                  |
| **Runaway costs**             | Set hard token and spend limits per user/session. A single malicious or misconfigured request can generate a large bill.                   |
| **Data exfiltration via LLM** | If your agent can read sensitive data AND make outbound calls, an injected prompt could exfiltrate it. Scope tool permissions tightly.     |
| **Insecure output rendering** | If you render LLM output as HTML, sanitize it — LLMs can be made to output XSS payloads.                                                   |

---

## Related Notes

- [16 — AI Agents](./16-ai-agents.md) — agentic patterns where security surface area is larger
- [26 — AI Safety & Red-Teaming](./26-ai-safety-red-teaming.md) — prompt injection, jailbreaking, adversarial testing
- [15 — RAG](./15-rag.md) — retrieval pipelines that introduce indirect prompt injection risk
