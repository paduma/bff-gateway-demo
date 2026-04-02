/**
 * Graceful degradation — fallback data when downstream services fail.
 * Returns cached stale data or sensible defaults instead of letting the frontend crash.
 */

const FALLBACK_DATA: Record<string, unknown> = {
  user: {
    id: 'unknown',
    name: 'User',
    email: '',
    role: 'viewer',
    department: 'Unknown',
    _fallback: true,
  },
  permissions: {
    userId: 'unknown',
    permissions: ['dashboard.view'],
    _fallback: true,
  },
  orders: {
    orders: [],
    total: 0,
    _fallback: true,
    _message: 'Order service is temporarily unavailable',
  },
  orderStats: {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedToday: 0,
    _fallback: true,
  },
  messages: {
    count: 0,
    messages: [],
    _fallback: true,
  },
  config: {
    features: { darkMode: true, betaFeatures: false, maxUploadSize: 5242880 },
    version: 'unknown',
    maintenance: false,
    _fallback: true,
  },
};

export function getFallback<T>(key: string): T {
  return (FALLBACK_DATA[key] ?? { _fallback: true, _message: 'Service unavailable' }) as T;
}
