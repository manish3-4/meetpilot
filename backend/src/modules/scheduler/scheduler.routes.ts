import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../shared/api-response';
import * as schedulerService from './scheduler.service';

const router = Router();

const findSlotsSchema = z.object({
  participants: z.array(z.string().email()).min(1),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  durationMinutes: z.number().min(15).max(480),
  timePreference: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
  excludedDays: z.array(z.number().min(0).max(6)).optional(),
  timezone: z.string().optional(),
});

router.post('/find-slots', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = findSlotsSchema.parse(req.body);
    const slots = await schedulerService.findSlots(req.user!.userId, {
      ...body,
      dateRange: {
        start: new Date(body.dateRange.start),
        end: new Date(body.dateRange.end),
      },
    });
    sendSuccess(res, { slots });
  } catch (error) {
    next(error);
  }
});

export default router;
