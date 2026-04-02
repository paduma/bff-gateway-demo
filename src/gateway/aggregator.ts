/**
 * API Aggregator — the core BFF pattern.
 * Calls multiple downstream services in parallel, merges results into one response.
 * Falls back to default data if any service fails.
 */

import { cache } from './cache';
import { getFallback } from './fallback';

const SERVICE_BASE = 'http://localhost:4001';

interface FetchOptions {
  cacheKey?: string;
  cacheTtl?: number;   // ms
  timeout?: number;     // ms
  fallbackKey?: string;
}

/** Fetch from a downstream service with cache, timeout, and fallback */
export async function fetchService<T>(
  path: string,
  options: FetchOptions = {},
): Promise<{ data: T; source: 'cache' | 'live' | 'fallback' }> {
  const { cacheKey, cacheTtl = 0, timeout = 3000, fallbackKey } = options;

  // 1. Check cache
  if (cacheKey) {
    const cached = cache.get<T>(cacheKey);
    if (cached) return { data: cached, source: 'cache' };
  }

  // 2. Fetch with timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(`${SERVICE_BASE}${path}`, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as Record<string, unknown>;
    // Unwrap unified response format: { code, message, data }
    const data = (json.code !== undefined && json.data !== undefined ? json.data : json) as T;

    // 3. Store in cache
    if (cacheKey && cacheTtl > 0) {
      cache.set(cacheKey, data, cacheTtl);
    }

    return { data, source: 'live' };
  } catch (err) {
    // 4. Fallback
    console.warn(`[Aggregator] ${path} failed:`, (err as Error).message);
    const fallback = getFallback<T>(fallbackKey || 'unknown');
    return { data: fallback, source: 'fallback' };
  }
}

/** Aggregate dashboard data — parallel calls to 4 services */
export async function aggregateDashboard(userId: string) {
  const start = Date.now();

  const [user, permissions, orders, orderStats, messages, config] = await Promise.all([
    fetchService(`/api/users/${userId}`, { fallbackKey: 'user', timeout: 2000 }),
    fetchService(`/api/users/${userId}/permissions`, { fallbackKey: 'permissions', timeout: 2000 }),
    fetchService('/api/orders/recent', { fallbackKey: 'orders', timeout: 3000 }),
    fetchService('/api/orders/stats', { fallbackKey: 'orderStats', timeout: 3000 }),
    fetchService('/api/messages/unread', { fallbackKey: 'messages', timeout: 2000 }),
    fetchService('/api/config/app', { cacheKey: 'config:app', cacheTtl: 300_000, fallbackKey: 'config', timeout: 5000 }),
  ]);

  const elapsed = Date.now() - start;

  return {
    user: user.data,
    permissions: permissions.data,
    recentOrders: orders.data,
    orderStats: orderStats.data,
    messages: messages.data,
    config: config.data,
    _meta: {
      aggregatedIn: `${elapsed}ms`,
      sources: {
        user: user.source,
        permissions: permissions.source,
        orders: orders.source,
        orderStats: orderStats.source,
        messages: messages.source,
        config: config.source,
      },
    },
  };
}
