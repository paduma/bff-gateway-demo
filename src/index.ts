/**
 * BFF Gateway — Entry Point
 *
 * This is the Node.js middle layer between frontend and downstream microservices.
 * It provides: API aggregation, SSE proxy, caching, rate limiting, and fallback.
 *
 * Start with: npm run dev:all (starts both BFF and mock services)
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bffRoutes from './routes/bff';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static frontend
app.use(express.static('public'));

// BFF routes
app.use('/bff', bffRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bff-gateway', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 BFF Gateway running on http://localhost:${PORT}`);
  console.log('   GET  /bff/dashboard    — aggregated dashboard data');
  console.log('   GET  /bff/orders       — cached order list');
  console.log('   POST /bff/ai/chat      — SSE streaming proxy');
  console.log('   GET  /bff/config       — cached app config');
  console.log('   GET  /bff/stats        — cache & rate limiter stats');
  console.log('   POST /bff/cache/clear  — clear cache\n');
});
