import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../shared/api-response';
import { getRedis } from '../../config/redis';
import * as calendarService from './calendar.service';
import { config } from '../../config';

const router = Router();

router.get('/connect', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    const redis = getRedis();
    await redis.setex(`oauth:state:${state}`, 600, req.user!.userId);

    const url = calendarService.getGoogleAuthUrl(req.user!.userId, state);
    sendSuccess(res, { url });
  } catch (error) {
    next(error);
  }
});

router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query as { code: string; state: string };

    if (!code || !state) {
      res.redirect(`${config.frontendUrl}/calendar?error=missing_params`);
      return;
    }

    const redis = getRedis();
    const userId = await redis.get(`oauth:state:${state}`);

    if (!userId) {
      res.redirect(`${config.frontendUrl}/calendar?error=invalid_state`);
      return;
    }

    await redis.del(`oauth:state:${state}`);

    await calendarService.handleOAuthCallback(code, userId);
    res.redirect(`${config.frontendUrl}/calendar?success=true`);
  } catch (error) {
    next(error);
  }
});

router.get('/accounts', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await calendarService.getCalendarAccounts(req.user!.userId);
    sendSuccess(res, accounts);
  } catch (error) {
    next(error);
  }
});

router.delete('/accounts/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await calendarService.disconnectCalendar(req.user!.userId, req.params.id);
    sendSuccess(res, { message: 'Calendar disconnected' });
  } catch (error) {
    next(error);
  }
});

router.get('/events', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = req.query as { start: string; end: string };
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new z.ZodError([{ code: 'invalid_type', expected: 'string', received: 'string', path: ['start'], message: 'Invalid date format' }]);
    }

    const events = await calendarService.getEvents(req.user!.userId, startDate, endDate);
    sendSuccess(res, events);
  } catch (error) {
    next(error);
  }
});

router.get('/availability', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = req.query as { start: string; end: string };
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new z.ZodError([{ code: 'invalid_type', expected: 'string', received: 'string', path: ['start'], message: 'Invalid date format' }]);
    }

    const availability = await calendarService.getAvailability(req.user!.userId, startDate, endDate);
    sendSuccess(res, availability);
  } catch (error) {
    next(error);
  }
});

export default router;
