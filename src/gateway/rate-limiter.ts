/**
 * Sliding window rate limiter
 * Limits requests per client (by IP) within a time window.
 */

interface WindowEntry {
  timestamps: number[];
}

export class RateLimiter {
  private windows = new Map<string, WindowEntry>();
  private maxRequests: number;
  private windowMs: number;
  private rejected = 0;

  constructor(maxRequests = 20, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** Returns true if request is allowed, false if rate limited */
  allow(clientId: string): boolean {
    const now = Date.now();
    let entry = this.windows.get(clientId);

    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(clientId, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter(t => now - t < this.windowMs);

    if (entry.timestamps.length >= this.maxRequests) {
      this.rejected++;
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }

  /** Get remaining requests for a client */
  remaining(clientId: string): number {
    const entry = this.windows.get(clientId);
    if (!entry) return this.maxRequests;
    const now = Date.now();
    const active = entry.timestamps.filter(t => now - t < this.windowMs).length;
    return Math.max(0, this.maxRequests - active);
  }

  getStats() {
    return {
      activeClients: this.windows.size,
      totalRejected: this.rejected,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }
}

export const rateLimiter = new RateLimiter(20, 60_000);
