export interface TokenVisuals {
  size: number;          // 1–100
  color: string;         // hex
  seeds: number;         // 3–144
  irregularity: number;  // 1–100
}

// Exponential scale: value feels logarithmic so rare amounts look dramatically different
// Reference points:
//   $1 excess      → size 1,  pale pink #FFCDD2,  3 seeds,  irregularity 5
//   $100           → size 15, #EF9A9A,            8 seeds,  irregularity 15
//   $1,000         → size 30, #E57373,             20 seeds, irregularity 30
//   $10,000        → size 55, #C62828,             55 seeds, irregularity 55
//   $100,000       → size 78, #7B1FA2 (deep burgundy-purple), 89 seeds, irregularity 78
//   $1,000,000+    → size 100, #1A237E (near black-blue),    144 seeds, irregularity 100

export function computeTokenVisuals(excessCents: number): TokenVisuals {
  const dollars = excessCents / 100;

  // Logarithmic normalization: log10($1)=0, log10($1M)=6, clamped 0–1
  const logMin = 0;   // log10(1)
  const logMax = 7;   // log10(10,000,000) — beyond this everything is max
  const logVal = Math.log10(Math.max(1, dollars));
  const t = Math.min(1, Math.max(0, (logVal - logMin) / (logMax - logMin)));

  // Ease: t^0.6 so middle range has good differentiation
  const ease = Math.pow(t, 0.6);

  const size = Math.round(1 + ease * 99);
  const seeds = Math.round(3 + ease * 141);
  const irregularity = Math.round(1 + ease * 99);

  // Color: interpolate through palette stops
  // 0.0: #FFCDD2 (pale pink)
  // 0.3: #E57373 (mid red)
  // 0.6: #B71C1C (deep red)
  // 0.8: #7B1FA2 (burgundy-purple)
  // 1.0: #1A237E (near black-blue)
  const color = interpolateColor(ease);

  return { size, color, seeds, irregularity };
}

function interpolateColor(t: number): string {
  const stops = [
    { t: 0.0, r: 255, g: 205, b: 210 },
    { t: 0.3, r: 229, g: 115, b: 115 },
    { t: 0.6, r: 183, g: 28,  b: 28  },
    { t: 0.8, r: 123, g: 31,  b: 162 },
    { t: 1.0, r: 26,  g: 35,  b: 126 },
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
