import { z } from 'zod';
import { config } from '../../config';
import { BadRequestError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import axios from 'axios';

export const SchedulingIntentSchema = z.object({
  intent: z.enum(['CREATE_MEETING', 'RESCHEDULE_MEETING', 'CANCEL_MEETING', 'FIND_AVAILABILITY']),
  title: z.string().optional(),
  participants: z.array(z.string()),
  durationMinutes: z.number().min(15).max(480),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  timePreference: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  excludedDays: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  meetingId: z.string().optional(),
  notes: z.string().optional(),
});

export type SchedulingIntent = z.infer<typeof SchedulingIntentSchema>;

const SYSTEM_PROMPT = `You are an AI scheduling assistant. Your job is to extract scheduling intents from natural language requests.

You must return a JSON object with the following structure:
{
  "intent": "CREATE_MEETING" | "RESCHEDULE_MEETING" | "CANCEL_MEETING" | "FIND_AVAILABILITY",
  "title": "Meeting title (optional)",
  "participants": ["email1@example.com", "name or email"],
  "durationMinutes": 30,
  "dateRange": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD"
  },
  "timePreference": {
    "start": "HH:MM",
    "end": "HH:MM"
  },
  "excludedDays": ["FRIDAY"],
  "timezone": "Asia/Kolkata"
}

Rules:
1. If no duration is specified, use 30 minutes as default
2. If no date is specified, use the next available day
3. Parse natural language dates like "tomorrow", "next week", "this Friday"
4. Extract participant names or emails
5. If a participant is just a name, include it as-is (will be resolved later)
6. Always return valid JSON
7. For "after X PM" or "before Y PM" constraints, set timePreference accordingly
8. For excluded days, convert day names to uppercase (e.g., "FRIDAY")`;

export async function extractSchedulingIntent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<SchedulingIntent> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages,
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);

    const validated = SchedulingIntentSchema.parse(parsed);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError('Could not parse scheduling intent from your request');
    }
    logger.error('AI extraction failed', undefined, { error: (error as Error).message });
    throw new BadRequestError('Failed to process your request. Please try again.');
  }
}

export async function generateExplanation(
  slots: Array<{ start: Date; end: Date; score: number; reasons: string[] }>,
  intent: SchedulingIntent
): Promise<string> {
  const slotDescriptions = slots.map((slot, i) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const dateStr = start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    return `${i + 1}. ${dateStr}, ${timeStr} (Score: ${slot.score}/100) - ${slot.reasons.join(', ')}`;
  });

  const prompt = `You are a helpful scheduling assistant. The user wants to ${intent.intent.toLowerCase().replace('_', ' ')}.
Here are the best available time slots:
${slotDescriptions.join('\n')}

Please provide a concise, friendly explanation of these options. Be helpful and brief.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful scheduling assistant. Be concise and friendly.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch {
    return `I found ${slots.length} available time slots for your meeting.`;
  }
}
