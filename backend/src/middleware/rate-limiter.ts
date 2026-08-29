import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis';
import { sendError } from '../shared/api-response';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = options;
  const redis = getRedis();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress}`;
    const now = Date.now();

    try {
      const pipe = redis.pipeline();
      pipe.zremrangebyscore(key, 0, now - windowMs);
      pipe.zadd(key, now.toString(), `${now}:${Math.random()}`);
      pipe.zcard(key);
      pipe.pexpire(key, windowMs);

      const results = await pipe.exec();
      const requestCount = results?.[2]?.[1] as number;

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount));

      if (requestCount > maxRequests) {
        sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
        return;
      }

      next();
    } catch {
      next();
    }
  };
}

export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'rl:api',
});

export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'rl:auth',
});

export const aiRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl:ai',
});
