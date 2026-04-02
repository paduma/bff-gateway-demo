/**
 * Mock downstream microservices
 * Simulates user-service, order-service, message-service, and ai-service
 * with realistic latency, occasional timeouts, and random failures.
 *
 * All responses follow a unified format: { code, message, data }
 */
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

/* ── Helpers ── */
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min: number, max: number) => delay(min + Math.random() * (max - min));
const shouldFail = (rate = 0.1) => Math.random() < rate;

/** Unified success response */
function ok(data: unknown) {
  return { code: 200, message: 'success', data };
}

/** Unified error response */
function fail(code: number, message: string) {
  return { code, message, data: null };
}

/* ── User Service ── */
app.get('/api/users/:id', async (req, res) => {
  await randomDelay(50, 200);
  if (shouldFail(0.05)) return res.status(500).json(fail(500, 'User service internal error'));
  res.json(ok({
    id: req.params.id,
    name: 'Alice Chen',
    email: 'alice@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    role: 'admin',
    department: 'Engineering',
    joinedAt: '2024-03-15',
  }));
});

app.get('/api/users/:id/permissions', async (req, res) => {
  await randomDelay(30, 100);
  res.json(ok({
    userId: req.params.id,
    permissions: ['dashboard.view', 'orders.manage', 'reports.export', 'users.view'],
  }));
});

/* ── Order Service ── */
app.get('/api/orders/recent', async (_req, res) => {
  await randomDelay(80, 300);
  if (shouldFail(0.08)) return res.status(500).json(fail(500, 'Order service timeout'));
  res.json(ok({
    orders: [
      { id: 'ORD-001', product: 'Widget A', amount: 299, status: 'shipped', date: '2026-03-28' },
      { id: 'ORD-002', product: 'Widget B', amount: 159, status: 'processing', date: '2026-03-27' },
      { id: 'ORD-003', product: 'Widget C', amount: 499, status: 'completed', date: '2026-03-25' },
    ],
    total: 42,
  }));
});

app.get('/api/orders/stats', async (_req, res) => {
  await randomDelay(100, 400);
  if (shouldFail(0.1)) return res.status(503).json(fail(503, 'Order stats temporarily unavailable'));
  res.json(ok({
    totalOrders: 1247,
    totalRevenue: 384500,
    pendingOrders: 23,
    completedToday: 15,
  }));
});

/* ── Message Service ── */
app.get('/api/messages/unread', async (_req, res) => {
  await randomDelay(40, 150);
  res.json(ok({
    count: Math.floor(Math.random() * 10) + 1,
    messages: [
      { id: 'm1', title: 'New order received', time: '2 min ago', type: 'order' },
      { id: 'm2', title: 'System maintenance scheduled', time: '1 hour ago', type: 'system' },
    ],
  }));
});

/* ── Config Service (intentionally slow — good for caching demo) ── */
app.get('/api/config/app', async (_req, res) => {
  await randomDelay(200, 600);
  console.log(`[Config Service] Serving config at ${new Date().toISOString()}`);
  res.json(ok({
    features: { darkMode: true, betaFeatures: false, maxUploadSize: 10485760 },
    version: '3.2.1',
    maintenance: false,
    servedAt: new Date().toISOString(),
  }));
});

/* ── AI Service (SSE streaming — no wrapper, raw event stream) ── */
app.post('/api/ai/chat', async (req, res) => {
  const { message } = req.body;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const reply = `Based on your question "${message || 'hello'}", here is my analysis: The current data shows a positive trend across all key metrics. Revenue is up 12% month-over-month, and customer satisfaction scores have improved significantly. I recommend focusing on the top-performing product lines while gradually phasing out underperformers.`;

  const words = reply.split(' ');
  for (let i = 0; i < words.length; i++) {
    await delay(50 + Math.random() * 80);
    res.write(`data: ${JSON.stringify({ token: words[i] + ' ', done: false })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ token: '', done: true })}\n\n`);
  res.end();
});

/* ── Start ── */
const PORT = 4001;
app.listen(PORT, () => {
  console.log(`\n🔧 Mock services running on http://localhost:${PORT}`);
  console.log('   GET  /api/users/:id');
  console.log('   GET  /api/users/:id/permissions');
  console.log('   GET  /api/orders/recent');
  console.log('   GET  /api/orders/stats');
  console.log('   GET  /api/messages/unread');
  console.log('   GET  /api/config/app');
  console.log('   POST /api/ai/chat (SSE)\n');
});
