import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { businesses } from '../db/schema';
import { requireUser } from '../lib/auth';
import { logger } from '../lib/logger';

const router = Router();
const anthropic = new Anthropic();

// GET /api/stickers
// Returns all businesses with their sticker concept (and those without, for generation).
router.get('/', async (_req, res: Response) => {
  try {
    const rows = await db.select({
      id: businesses.id,
      name: businesses.name,
      type: businesses.type,
      neighbourhood: businesses.neighbourhood,
      description: businesses.description,
      sticker_concept: businesses.sticker_concept,
      sticker_emoji: businesses.sticker_emoji,
    }).from(businesses).where(eq(businesses.type, 'collection'));
    res.json(rows);
  } catch (err) {
    logger.error('Failed to fetch stickers:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/stickers/generate/:business_id
// Generates and stores a sticker concept for the given business using Claude Haiku.
router.post('/generate/:business_id', requireUser, async (req: any, res: Response) => {
  const bizId = parseInt(req.params.business_id, 10);
  if (isNaN(bizId)) { res.status(400).json({ error: 'invalid_id' }); return; }

  try {
    const [biz] = await db.select().from(businesses).where(eq(businesses.id, bizId)).limit(1);
    if (!biz) { res.status(404).json({ error: 'not_found' }); return; }

    const context = [
      `Name: ${biz.name}`,
      biz.type ? `Type: ${biz.type}` : null,
      biz.neighbourhood ? `Neighbourhood: ${biz.neighbourhood}` : null,
      biz.description ? `About: ${biz.description}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `You are designing a small, collectible die-cut vinyl sticker for a local business.

${context}

Respond with exactly two lines:
Line 1: A single emoji that best represents this business (one character only).
Line 2: A vivid 1-sentence concept for what the sticker looks like — be specific, visual, and creative. Reference the business's identity. Max 20 words.

No labels, no punctuation after the emoji, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as any)?.text?.trim() ?? '';
    const lines = raw.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const emoji = lines[0] ?? '🍓';
    const concept = lines[1] ?? `A die-cut sticker celebrating ${biz.name}.`;

    await db.update(businesses)
      .set({ sticker_emoji: emoji, sticker_concept: concept })
      .where(eq(businesses.id, bizId));

    logger.info(`Sticker concept generated for business ${bizId}: ${emoji} ${concept}`);
    res.json({ id: bizId, sticker_emoji: emoji, sticker_concept: concept });
  } catch (err) {
    logger.error('Failed to generate sticker concept:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/stickers/generate-all
// Bulk-generates concepts for every business that doesn't have one yet. Admin use.
router.post('/generate-all', requireUser, async (req: any, res: Response) => {
  try {
    const rows = await db.select({ id: businesses.id }).from(businesses)
      .where(eq(businesses.sticker_concept, businesses.sticker_concept)); // all rows

    const pending = rows; // generate for all — already-set ones will just overwrite
    res.json({ queued: pending.length, message: 'Generation started in background.' });

    // Fire-and-forget per business with a small delay to avoid rate limits
    (async () => {
      for (const { id } of pending) {
        try {
          await fetch(`http://localhost:${process.env.PORT ?? 3000}/api/stickers/generate/${id}`, {
            method: 'POST',
            headers: { Authorization: req.headers.authorization ?? '' },
          });
          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          logger.error(`generate-all: failed for business ${id}`, e);
        }
      }
      logger.info('generate-all: done');
    })();
  } catch (err) {
    logger.error('generate-all failed:', err);
  }
});

export default router;
