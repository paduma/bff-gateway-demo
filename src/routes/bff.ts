/**
 * BFF Routes — the API surface exposed to the frontend.
 * Frontend only talks to these endpoints, never directly to downstream services.
 */

import { Router } from 'express';
import { aggregateDashboard, fetchService } from '../gateway/aggregator';
import { proxySSE } from '../gateway/sse-proxy';
import { cache } from '../gateway/cache';
import { rateLimiter } from '../gateway/rate-limiter';

const router = Router();

/** Rate limiting middleware */
router.use((req, res, next) => {
  const clientId = req.ip || 'unknown';
  if (!rateLimiter.allow(clientId)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: '60s',
      remaining: 0,
    });
  }
  // Add rate limit headers
  res.setHeader('X-RateLimit-Remaining', rateLimiter.remaining(clientId));
  next();
});

/**
 * GET /bff/dashboard
 * Aggregates user info, orders, messages, and config in one call.
 * Frontend sends 1 request instead of 6.
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'user-1';
    const result = await aggregateDashboard(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Dashboard aggregation failed' });
  }
});

/**
 * GET /bff/orders
 * Fetches recent orders with caching (30s TTL).
 */
router.get('/orders', async (req, res) => {
  try {
    const { data, source } = await fetchService('/api/orders/recent', {
      cacheKey: 'orders:recent',
      cacheTtl: 30_000,
      fallbackKey: 'orders',
    });
    res.json({ ...data as object, _source: source });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * POST /bff/ai/chat
 * SSE proxy — forwards streaming response from AI service.
 */
router.post('/ai/chat', proxySSE);

/**
 * GET /bff/config
 * App config with aggressive caching (5 min TTL).
 */
router.get('/config', async (req, res) => {
  try {
    const { data, source } = await fetchService('/api/config/app', {
      cacheKey: 'config:app',
      cacheTtl: 300_000,
      fallbackKey: 'config',
    });
    res.json({ ...data as object, _source: source });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * GET /bff/stats
 * BFF internal stats — cache hit rate, rate limiter status.
 */
router.get('/stats', (req, res) => {
  res.json({
    cache: cache.getStats(),
    rateLimiter: rateLimiter.getStats(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

/**
 * POST /bff/cache/clear
 * Manually clear BFF cache.
 */
router.post('/cache/clear', (req, res) => {
  cache.clear();
  res.json({ message: 'Cache cleared' });
});

/**
 * Individual proxy endpoints — used by "Without BFF" demo.
 * These pass through the raw downstream response (with { code, message, data } wrapper)
 * to show what frontend deals with when there's no BFF aggregation layer.
 */
router.get('/proxy/user', async (_req, res) => {
  try {
    const r = await fetch('http://localhost:4001/api/users/user-1');
    res.json(await r.json());
  } catch { res.json({ code: 500, message: 'Service unavailable', data: null }); }
});
router.get('/proxy/permissions', async (_req, res) => {
  try {
    const r = await fetch('http://localhost:4001/api/users/user-1/permissions');
    res.json(await r.json());
  } catch { res.json({ code: 500, message: 'Service unavailable', data: null }); }
});
router.get('/proxy/orders', async (_req, res) => {
  try {
    const r = await fetch('http://localhost:4001/api/orders/recent');
    res.json(await r.json());
  } catch { res.json({ code: 500, message: 'Service unavailable', data: null }); }
});
router.get('/proxy/order-stats', async (_req, res) => {
  try {
    const r = await fetch('http://localhost:4001/api/orders/stats');
    res.json(await r.json());
  } catch { res.json({ code: 500, message: 'Service unavailable', data: null }); }
});
router.get('/proxy/messages', async (_req, res) => {
  try {
    const r = await fetch('http://localhost:4001/api/messages/unread');
    res.json(await r.json());
  } catch { res.json({ code: 500, message: 'Service unavailable', data: null }); }
});
router.get('/proxy/config', async (_req, res) => {
  try {
    const r = await fetch('http://localhost:4001/api/config/app');
    res.json(await r.json());
  } catch { res.json({ code: 500, message: 'Service unavailable', data: null }); }
});

export default router;
