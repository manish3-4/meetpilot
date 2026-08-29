import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../shared/api-response';
import * as usersService from './users.service';

const router = Router();

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isAvailable: z.boolean().optional(),
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.getMe(req.user!.userId);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateMeSchema.parse(req.body);
    const user = await usersService.updateMe(req.user!.userId, body);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
});

router.get('/me/preferences', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preferences = await usersService.getPreferences(req.user!.userId);
    sendSuccess(res, preferences);
  } catch (error) {
    next(error);
  }
});

router.patch('/me/preferences/:dayOfWeek', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dayOfWeek = parseInt(req.params.dayOfWeek, 10);
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new z.ZodError([{ code: 'invalid_type', expected: 'number', received: 'string', path: ['dayOfWeek'], message: 'Day of week must be 0-6' }]);
    }
    const body = updatePreferencesSchema.parse(req.body);
    const preference = await usersService.updatePreferences(req.user!.userId, dayOfWeek, body);
    sendSuccess(res, preference);
  } catch (error) {
    next(error);
  }
});

export default router;
