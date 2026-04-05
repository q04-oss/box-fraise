export interface TokenVisuals {
  size: number;          // 1–100
  color: string;         // hex
  seeds: number;         // 3–144
  irregularity: number;  // 1–100
}

// Every box mints a token. The NFC chip's unique identifier seeds the base visual —
// so each token has a distinct, deterministic appearance tied to that physical object.
// Overpaying enhances the token: deeper color, more seeds, larger, more irregular.
//
// Base range (no excess):  size 8–30, pale pink family, 3–15 seeds, low irregularity
// With excess, logarithmic scale:
//   CA$1 over   → subtle shift toward rose
//   CA$100      → noticeably richer, mid red
//   CA$1,000    → deep red, dense seeds
//   CA$10,000+  → dramatic — burgundy-purple into near-black blue

export function computeTokenVisuals(seed: number, excessCents: number): TokenVisuals {
  const rand = seededRandom(seed);

  // Base visual from the physical box's identity — each box has its own character
  const baseSize         = Math.round(8  + rand() * 22); // 8–30
  const baseSeeds        = Math.round(3  + rand() * 12); // 3–15
  const baseIrregularity = Math.round(5  + rand() * 20); // 5–25
  const basePalette      = rand() * 0.15;                // 0–0.15: stays in pale-pink family

  // Enhancement from excess — logarithmic, felt not linear
  const dollars = excessCents / 100;
  const logMax  = 7; // log10(10,000,000) — beyond this, max
  const logVal  = Math.log10(Math.max(1, dollars));
  const ease    = excessCents > 0
    ? Math.pow(Math.min(1, Math.max(0, logVal / logMax)), 0.6)
    : 0;

  const size         = Math.round(baseSize         + ease * (100 - baseSize));
  const seeds        = Math.round(baseSeeds        + ease * (144 - baseSeeds));
  const irregularity = Math.round(baseIrregularity + ease * (100 - baseIrregularity));
  const color        = interpolateColor(ease > 0 ? ease : basePalette);

  return { size, color, seeds, irregularity };
}

// Deterministic PRNG — same seed always produces the same token appearance
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(48271, s) + 1) >>> 0;
    return s / 0x100000000;
  };
}

function interpolateColor(t: number): string {
  const stops = [
    { t: 0.0, r: 255, g: 205, b: 210 }, // pale pink
    { t: 0.3, r: 229, g: 115, b: 115 }, // rose
    { t: 0.6, r: 183, g: 28,  b: 28  }, // deep red
    { t: 0.8, r: 123, g: 31,  b: 162 }, // burgundy-purple
    { t: 1.0, r: 26,  g: 35,  b: 126 }, // near black-blue
  ];

  let lower = stops[0], upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lower = stops[i]; upper = stops[i + 1]; break;
    }
  }

  const range = upper.t - lower.t || 1;
  const local = (t - lower.t) / range;
  const r = Math.round(lower.r + local * (upper.r - lower.r));
  const g = Math.round(lower.g + local * (upper.g - lower.g));
  const b = Math.round(lower.b + local * (upper.b - lower.b));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export async function getNextTokenNumber(
  varietyId: number,
  db: any,
  tokensTable: any,
  eq: any,
): Promise<number> {
  const existing = await db.select().from(tokensTable).where(eq(tokensTable.variety_id, varietyId));
  return existing.length + 1;
}

export function composeTokenName(params: {
  token_type: string;
  location_type?: string | null;
  partner_name?: string | null;
  variety_name: string;
}): string {
  if (params.token_type === 'chocolate') {
    if (params.location_type === 'collab_chocolate' && params.partner_name) {
      return `MAISON FRAISE × ${params.partner_name.toUpperCase()}`;
    }
    return 'MAISON FRAISE';
  }
  return params.variety_name.toUpperCase();
}
