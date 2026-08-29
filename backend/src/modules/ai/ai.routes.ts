import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { sendSuccess } from '../../shared/api-response';
import { aiRateLimiter } from '../../middleware/rate-limiter';
import * as aiService from './ai.service';
import * as schedulerService from '../scheduler/scheduler.service';
import { getPrisma } from '../../config/database';
import { logger } from '../../shared/logger';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

router.post('/chat', authenticate, aiRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, conversationId } = chatSchema.parse(req.body);
    const userId = req.user!.userId;
    const prisma = getPrisma();

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await prisma.aIConversation.create({
        data: { userId, title: message.substring(0, 50) },
      });
      convId = conversation.id;
    }

    // Save user message
    await prisma.aIMessage.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: message,
      },
    });

    // Get conversation history
    const messages = await prisma.aIMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Extract scheduling intent
    const intent = await aiService.extractSchedulingIntent(message, history);

    // Find available slots
    const startDate = new Date(intent.dateRange.start);
    const endDate = new Date(intent.dateRange.end);

    // Set default date range if not provided
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      intent.dateRange.start = today.toISOString().split('T')[0];
      intent.dateRange.end = nextWeek.toISOString().split('T')[0];
    }

    const slots = await schedulerService.findSlots(userId, {
      participants: intent.participants,
      dateRange: {
        start: new Date(intent.dateRange.start),
        end: new Date(intent.dateRange.end),
      },
      durationMinutes: intent.durationMinutes,
      timePreference: intent.timePreference,
      excludedDays: intent.excludedDays?.map((d) => {
        const dayMap: Record<string, number> = {
          SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
          THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
        };
        return dayMap[d] ?? 0;
      }),
      timezone: intent.timezone,
    });

    // Generate explanation
    const explanation = await aiService.generateExplanation(slots, intent);

    // Save AI response
    const responseContent = JSON.stringify({
      intent,
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        score: s.score,
        reasons: s.reasons,
      })),
      explanation,
    });

    await prisma.aIMessage.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: explanation,
        structuredOutput: {
          intent,
          slots: slots.map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            score: s.score,
            reasons: s.reasons,
          })),
        },
      },
    });

    sendSuccess(res, {
      conversationId: convId,
      intent,
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        score: s.score,
        reasons: s.reasons,
      })),
      explanation,
    });
  } catch (error) {
    next(error);
  }
});

const scheduleSchema = z.object({
  conversationId: z.string(),
  selectedSlot: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  title: z.string().optional(),
});

router.post('/schedule', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, selectedSlot, title } = scheduleSchema.parse(req.body);
    const userId = req.user!.userId;
    const prisma = getPrisma();

    // Get the last AI message with structured output
    const lastMessage = await prisma.aIMessage.findFirst({
      where: {
        conversationId,
        role: 'assistant',
        structuredOutput: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastMessage?.structuredOutput) {
      throw new z.ZodError([{ code: 'invalid_type', expected: 'object', received: 'null', path: ['conversationId'], message: 'No scheduling context found' }]);
    }

    const output = lastMessage.structuredOutput as {
      intent: { participants: string[]; durationMinutes: number };
    };

    // Create the meeting
    const meeting = await prisma.meeting.create({
      data: {
        title: title || 'Meeting',
        start: new Date(selectedSlot.start),
        end: new Date(selectedSlot.end),
        durationMinutes: output.intent.durationMinutes,
        creatorId: userId,
        timezone: 'UTC',
      },
    });

    // Create participants
    for (const participant of output.intent.participants) {
      const user = await prisma.user.findFirst({ where: { email: participant } });
      await prisma.meetingParticipant.create({
        data: {
          meetingId: meeting.id,
          userId: user?.id,
          email: participant,
          name: user?.name,
          status: user ? 'ACCEPTED' : 'PENDING',
        },
      });
    }

    // Create scheduling request record
    await prisma.schedulingRequest.create({
      data: {
        userId,
        meetingId: meeting.id,
        intent: 'CREATE_MEETING',
        rawInput: '',
        parsedRequest: output.intent,
        suggestedSlots: [],
        selectedSlot,
        status: 'CONFIRMED',
      },
    });

    sendSuccess(res, { meeting }, 201);
  } catch (error) {
    next(error);
  }
});

export default router;
