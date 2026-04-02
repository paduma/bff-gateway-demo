/**
 * SSE Proxy — forwards Server-Sent Events from downstream AI service to the client.
 * Uses Node.js http module for reliable streaming (fetch ReadableStream has compatibility issues).
 */

import type { Request, Response } from 'express';
import http from 'http';

const SERVICE_HOST = 'localhost';
const SERVICE_PORT = 4001;

export function proxySSE(req: Request, res: Response) {
  const { message } = req.body || {};
  const postData = JSON.stringify({ message });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-BFF-Proxy', 'true');
  res.flushHeaders();

  console.log('[SSE Proxy] Starting proxy, message:', message);

  const upstream = http.request(
    {
      hostname: SERVICE_HOST,
      port: SERVICE_PORT,
      path: '/api/ai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    (upstreamRes) => {
      console.log('[SSE Proxy] Connected to upstream, status:', upstreamRes.statusCode);
      upstreamRes.on('data', (chunk: Buffer) => {
        res.write(chunk);
      });
      upstreamRes.on('end', () => {
        console.log('[SSE Proxy] Upstream ended');
        res.end();
      });
      upstreamRes.on('error', (err) => {
        console.error('[SSE Proxy] Upstream stream error:', err.message);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      });
    },
  );

  upstream.on('error', (err) => {
    console.error('[SSE Proxy] Connection error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'Upstream service unavailable' })}\n\n`);
    res.end();
  });

  // Only destroy upstream if client actually disconnects
  res.on('close', () => {
    console.log('[SSE Proxy] Client disconnected');
    upstream.destroy();
  });

  upstream.write(postData);
  upstream.end();
}
