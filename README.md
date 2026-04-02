# BFF Gateway Demo

Demonstrates common BFF (Backend For Frontend) patterns with Node.js + Express + TypeScript.

## Why BFF?

In a microservice architecture, the frontend often needs data from multiple backend services for a single page. Without a BFF layer, the frontend handles this complexity directly:

```
Without BFF:                          With BFF:

Browser                               Browser
  ├─→ User Service                      │
  ├─→ Order Service                     ▼
  ├─→ Message Service                 BFF (Node.js)
  ├─→ Config Service                    ├─→ User Service
  └─→ AI Service                        ├─→ Order Service
                                        ├─→ Message Service
6 requests from browser                 ├─→ Config Service
6 different error handling              └─→ AI Service
6 different response formats
No caching, no rate limiting          1 request from browser
                                      Unified error handling
                                      Caching, rate limiting, fallback
```

The BFF layer is owned by the frontend team. It gives frontend engineers control over the API surface without depending on backend teams for every data format change.

## What's Inside

| Pattern                  | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| **API Aggregation**      | `/bff/dashboard` calls 6 downstream services in parallel, merges into one response |
| **SSE Proxy**            | `/bff/ai/chat` forwards streaming responses from AI service to the client          |
| **Request Caching**      | In-memory TTL cache — config cached 5min, orders cached 30s                        |
| **Rate Limiting**        | Sliding window limiter — 20 req/min per client, returns 429 when exceeded          |
| **Graceful Degradation** | When a downstream service fails, returns fallback data instead of 500              |

## Quick Start

```bash
npm install
npm run dev:all
```

Opens:

- BFF Gateway: http://localhost:4000 (with demo UI)
- Mock Services: http://localhost:4001

## Architecture

```
Frontend (browser)
    │
    ▼
BFF Gateway (:4000)          ← You are here
    │  ├── aggregator.ts     ← Parallel fetch + merge
    │  ├── sse-proxy.ts      ← SSE stream forwarding
    │  ├── cache.ts          ← In-memory TTL cache
    │  ├── rate-limiter.ts   ← Sliding window limiter
    │  └── fallback.ts       ← Default data on failure
    │
    ▼
Mock Services (:4001)
    ├── User Service
    ├── Order Service
    ├── Message Service
    ├── Config Service (intentionally slow)
    └── AI Service (SSE streaming)
```

## Try It

1. Click "Without BFF" — watch 6 requests fire one by one in the timeline, see which services succeed or fail
2. Click "With BFF" — watch 1 aggregated request complete, with automatic fallback for failed services
3. Compare: request count, total time, and how dashboard cards handle failures (red = error vs orange = graceful degradation)

## License

MIT
