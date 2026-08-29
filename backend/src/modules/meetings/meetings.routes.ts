import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../shared/api-response';
import * as meetingsService from './meetings.service';

const router = Router();

const createMeetingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  durationMinutes: z.number().min(15).max(480),
  participants: z.array(z.string().email()),
  timezone: z.string().optional(),
  location: z.string().optional(),
});

const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  location: z.string().optional(),
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createMeetingSchema.parse(req.body);
    const meeting = await meetingsService.createMeeting(req.user!.userId, {
      ...body,
      start: new Date(body.start),
      end: new Date(body.end),
    });
    sendSuccess(res, meeting, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    const meetings = await meetingsService.getMeetings(
      req.user!.userId,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined
    );
    sendSuccess(res, meetings);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meeting = await meetingsService.getMeetingById(String(req.params.id), req.user!.userId);
    sendSuccess(res, meeting);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateMeetingSchema.parse(req.body);
    const meeting = await meetingsService.updateMeeting(String(req.params.id), req.user!.userId, {
      ...body,
      start: body.start ? new Date(body.start) : undefined,
      end: body.end ? new Date(body.end) : undefined,
    });
    sendSuccess(res, meeting);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await meetingsService.deleteMeeting(String(req.params.id), req.user!.userId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/confirm', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await meetingsService.confirmMeeting(String(req.params.id), req.user!.userId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

export default router;
