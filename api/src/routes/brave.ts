import { Router } from 'express';

const router = Router();

// GET /api/brave?q= — proxy to Brave Search API
router.get('/', async (req: any, res: any) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.status(400).json({ error: 'q is required' });

  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return res.status(503).json({ error: 'Search unavailable' });

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=10&search_lang=en&country=ca&safesearch=moderate`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': key,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Search request failed' });
    }

    const data = await response.json() as any;

    const results = (data.web?.results ?? []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      display_url: r.meta_url?.hostname ?? r.url,
    }));

    res.json({ query: q, results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
