import { db } from './index';
import { businesses, locations, businessMenuItems } from './schema';
import { eq } from 'drizzle-orm';

async function seedRosewood() {
  // Idempotent — skip if already seeded
  const existing = await db.select().from(businesses).where(eq(businesses.name, 'Rosewood Foods'));
  if (existing.length > 0) {
    console.log('Rosewood Foods already seeded, skipping.');
    process.exit(0);
  }

  // 1. Business
  const [biz] = await db.insert(businesses).values({
    name: 'Rosewood Foods',
    type: 'partner',
    address: '101, 10150 100 Street NW',
    city: 'Edmonton, AB',
    hours: 'Tues–Fri 8:00–3:00 · Sat–Sun 9:00–3:00 · Mon Closed',
    contact: '780-757-8030',
    latitude: '53.5432',
    longitude: '-113.4904',
    launched_at: new Date('2026-01-01'),
    description: 'An all-day café in downtown Edmonton serving seasonal breakfast and lunch.',
    neighbourhood: 'Downtown Edmonton',
    approved_by_admin: true,
  }).returning();

  console.log(`Created business: ${biz.name} (id: ${biz.id})`);

  // 2. Location
  const [loc] = await db.insert(locations).values({
    name: 'Rosewood Foods',
    address: '101, 10150 100 Street NW, Edmonton, AB',
    active: true,
    business_id: biz.id,
  }).returning();

  console.log(`Created location: ${loc.name} (id: ${loc.id})`);

  // 3. Menu items
  const items = [
    // ALL-DAY
    { category: 'main', name: 'Pecan-Coconut Granola', description: 'Housemade granola with pecans, organic yogurt, seasonal fresh fruit, house strawberry preserves', price_cents: 1300, tags: ['vegetarian'], sort_order: 1 },
    { category: 'main', name: 'Verde Rice', description: 'Salsa verde toasted calrose rice, cherry tomato, persian cucumber, shaved radish, pickled carrot, za\'atar, house chili oil', price_cents: 1700, tags: ['gluten-free', 'vegan'], sort_order: 2 },
    { category: 'main', name: 'Breakfast Sandwich — Griddled Scallion', description: 'Four Whistle Farm egg, cheddar & chili jam on house milk bun', price_cents: 1100, tags: [], sort_order: 3 },
    { category: 'main', name: 'Breakfast Sandwich — Hickory Bacon', description: 'Four Whistle Farm egg, cheddar & chili jam on house milk bun', price_cents: 1200, tags: [], sort_order: 4 },
    { category: 'main', name: 'Breakfast Sandwich — House Chicken Sausage', description: 'Four Whistle Farm egg, cheddar & chili jam on house milk bun', price_cents: 1200, tags: [], sort_order: 5 },
    { category: 'main', name: 'Lox & Egg Sandwich', description: 'Pastrami-spice cured salmon, caramelized onion, scrambled farm egg, dressed kale, house milk bun', price_cents: 1600, tags: [], sort_order: 6 },
    { category: 'main', name: 'Chèvre Grilled Cheese', description: 'Whipped goat cheese, aged white cheddar, caramelized onion, house milk bread', price_cents: 1300, tags: ['vegetarian'], sort_order: 7 },
    { category: 'main', name: 'Breakfast Bowl', description: '2 creamy scrambled farm eggs, aged white cheddar, charred tomato salsa, chili jam on crispy potatoes. Choice of mushroom, bacon, or chicken sausage', price_cents: 2100, tags: [], sort_order: 8 },
    { category: 'main', name: 'Breakfast Rice', description: 'Toasted caramelized miso rice, sauteed seasonal veggies, sunny farm egg', price_cents: 1900, tags: ['gluten-free', 'vegetarian'], sort_order: 9 },
    // SALADS
    { category: 'starter', name: 'Kale Gomadare Salad', description: 'Local persian cucumber, cherry tomato, shaved radish, tangy Japanese-style sesame dressing', price_cents: 1700, tags: ['gluten-free', 'vegan'], sort_order: 10 },
    { category: 'starter', name: 'Fennel-Orange Salad', description: 'Radicchio, endive, fresh orange, fennel, castelvetrano olives, orange-dijon vinaigrette', price_cents: 1800, tags: ['gluten-free', 'vegan'], sort_order: 11 },
    { category: 'starter', name: 'Bistro Chicken Salad', description: 'Endive, radicchio, roasted broccoli, crispy potatoes w. lemony grilled chicken thigh & anchovy vinaigrette', price_cents: 2300, tags: ['gluten-free'], sort_order: 12 },
    // SANDWICHES
    { category: 'main', name: 'Lemon-Roasted Broccoli Sandwich', description: 'Roasted leek, shaved radish & spicy cashew sauce on house focaccia', price_cents: 1900, tags: ['vegan'], sort_order: 13 },
    { category: 'main', name: 'Katsu Chicken Sandwich', description: 'Japanese-style fried chicken, tangy red cabbage, housemade kewpie mayo, katsu sauce, milk bun', price_cents: 2200, tags: [], sort_order: 14 },
    { category: 'main', name: 'Rosewood Bar Burger', description: 'House-ground angus beef, cheddar, pickled white onion, mustard, house ketchup on milk bun', price_cents: 1900, tags: [], sort_order: 15 },
    { category: 'main', name: 'French Patty Melt', description: 'Herbes de provence mushroom ragu, angus beef patty, aged white cheddar, house dijonnaise, milk bun', price_cents: 2200, tags: [], sort_order: 16 },
    { category: 'main', name: 'Rosewood Club Sandwich', description: 'Lemon-grilled chicken thigh, hickory bacon, cheddar, dressed bitter greens, charred tomato salsa, house mayo, milk bun', price_cents: 2200, tags: [], sort_order: 17 },
    // WEEKEND BRUNCH
    { category: 'main', name: 'Lemony Buttermilk Pancakes', description: '3 fluffy, zesty pancakes w. Gosford Farm (QC) maple syrup, pat of butter', price_cents: 1700, tags: ['vegetarian'], sort_order: 18 },
    { category: 'main', name: 'Breakfast Burrito', description: 'House chicken sausage, 2 creamy scrambled farm eggs, white cheddar, cherry tomato-herb salsa & chili. Served w. crispy potatoes', price_cents: 2100, tags: [], sort_order: 19 },
    // SIDES
    { category: 'side', name: 'Sunny Farm Egg', description: '', price_cents: 250, tags: ['vegetarian'], sort_order: 20 },
    { category: 'side', name: 'Hickory Bacon', description: '', price_cents: 650, tags: [], sort_order: 21 },
    { category: 'side', name: 'House Chicken Sausage', description: '', price_cents: 650, tags: [], sort_order: 22 },
    { category: 'side', name: 'Katsu Chicken Cutlet', description: '', price_cents: 750, tags: [], sort_order: 23 },
    { category: 'side', name: 'Crispy Potatoes / Kale Gomadare Salad upgrade', description: '', price_cents: 200, tags: [], sort_order: 24 },
    // DRINKS
    { category: 'drink', name: 'Mimosa', description: '', price_cents: 1200, tags: [], sort_order: 25 },
    { category: 'drink', name: 'Peach Bellini', description: '', price_cents: 1200, tags: [], sort_order: 26 },
    { category: 'drink', name: 'Bourbon Peach Iced Tea', description: '', price_cents: 1400, tags: [], sort_order: 27 },
    { category: 'drink', name: 'Aperol Spritz', description: '', price_cents: 1400, tags: [], sort_order: 28 },
    { category: 'drink', name: 'Breakfast Beer — Kölsch + Grapefruit', description: '', price_cents: 1000, tags: [], sort_order: 29 },
    { category: 'drink', name: 'Biutiful Cava Brut Nature', description: 'Natural/organic', price_cents: 1200, tags: [], sort_order: 30 },
    { category: 'drink', name: 'Salvard Cheverny', description: 'Natural/organic', price_cents: 1400, tags: [], sort_order: 31 },
    { category: 'drink', name: 'St. John Beausoleil Rosé', description: 'Natural/organic', price_cents: 1500, tags: [], sort_order: 32 },
    { category: 'drink', name: 'Parajes del Valle Monastrell', description: 'Natural/organic', price_cents: 1500, tags: [], sort_order: 33 },
  ];

  await db.insert(businessMenuItems).values(
    items.map(item => ({ ...item, business_id: biz.id }))
  );

  console.log(`Inserted ${items.length} menu items.`);
  console.log('Done. Rosewood Foods is live on the map.');
  process.exit(0);
}

seedRosewood().catch(err => { console.error(err); process.exit(1); });
