export interface RecipeStep {
  title: string;
  description: string;
  timerMinutes?: number;
  timerLabel?: string;
  lookFor?: string;
  troubleshoot?: { q: string; a: string }[];
}

export interface Recipe {
  id: string;
  name: string;
  subtitle?: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  prepTime: string;
  bakeTime: string;
  description: string;
  ingredients: string[];
  equipment?: string[];
  allergens?: string;
  steps: RecipeStep[];
  tips: string[];
  tags: string[];
}

export const recipes: Recipe[] = [
  {
    id: "gf-sourdough-loaf",
    name: "Classic Gluten-Free Sourdough Loaf",
    subtitle: "Crisp crust, open crumb — the signature bake",
    category: "Bread",
    difficulty: "medium",
    prepTime: "30 min + 4-8h ferment",
    bakeTime: "45-55 min",
    description: "A beautifully risen gluten-free sourdough with a crisp crust and open crumb.",
    ingredients: [
      "200g rice flour",
      "100g tapioca starch",
      "50g potato starch",
      "200g active GF sourdough starter",
      "250ml warm water",
      "10g psyllium husk",
      "8g salt",
      "15ml olive oil",
      "10g sugar or honey",
    ],
    equipment: ["Large mixing bowl", "Loaf tin", "Dutch oven or steam tray", "Scoring blade", "Wire cooling rack"],
    steps: [
      {
        title: "Make the psyllium gel",
        description: "Mix psyllium husk with warm water and let gel for 5 minutes. It should become thick and jelly-like.",
        timerMinutes: 5,
        timerLabel: "Psyllium gel",
        lookFor: "A thick, jelly-like consistency — not watery.",
      },
      {
        title: "Combine dry ingredients",
        description: "Combine rice flour, tapioca starch, potato starch, salt, and sugar in a large bowl. Whisk to distribute evenly.",
      },
      {
        title: "Mix the dough",
        description: "Add active starter, psyllium gel, and olive oil to the dry ingredients. Mix until smooth and well combined.",
        lookFor: "A thick, smooth batter with no dry pockets. It will be wetter than wheat dough — that's normal!",
        troubleshoot: [
          { q: "Dough is too thick to mix?", a: "Add a tablespoon of warm water at a time until it's a thick but mixable batter." },
          { q: "Dough is very runny?", a: "The psyllium may not have gelled fully. Let it sit 2 more minutes before mixing again." },
        ],
      },
      {
        title: "Transfer to tin",
        description: "Oil a loaf tin generously. Transfer the dough and smooth the top with wet fingers or the back of a spoon.",
      },
      {
        title: "Bulk ferment",
        description: "Cover the tin and ferment at 25-28°C for 4-8 hours until risen by 50-75%. Warmer temperatures mean shorter ferment times.",
        lookFor: "The dough should have risen noticeably (50-75%) and have visible bubbles on the surface and sides.",
        troubleshoot: [
          { q: "No rise after 4 hours?", a: "Move to a warmer spot (25-28°C). Cold kitchens slow fermentation significantly." },
          { q: "Dough has risen and started to collapse?", a: "It's over-proofed. Bake immediately — it may still turn out well!" },
        ],
      },
      {
        title: "Preheat oven",
        description: "Preheat oven to 220°C (428°F) with a Dutch oven or steam tray inside. Let it heat for at least 20 minutes.",
        timerMinutes: 20,
        timerLabel: "Oven preheat",
      },
      {
        title: "Score the loaf",
        description: "Use a sharp blade or lame to score the top of the loaf. A single slash down the centre works well for GF loaves.",
        lookFor: "Clean, confident cuts about 1cm deep. Don't hesitate — quick slashes work best.",
      },
      {
        title: "Bake covered",
        description: "Place the loaf in the preheated Dutch oven (or oven with steam tray). Bake covered for 30 minutes.",
        timerMinutes: 30,
        timerLabel: "Covered bake",
        lookFor: "Steam should be visible when you open the lid. The loaf should have started to colour.",
      },
      {
        title: "Bake uncovered",
        description: "Remove the lid and bake for 15-25 minutes more until deep golden brown. The crust should feel firm when tapped.",
        timerMinutes: 20,
        timerLabel: "Uncovered bake",
        lookFor: "Deep golden colour and a hollow sound when the base is tapped.",
        troubleshoot: [
          { q: "Top is browning too fast?", a: "Tent loosely with foil for the remaining time." },
          { q: "Crust is pale after 20 minutes?", a: "Give it another 5-10 minutes. GF loaves can take longer to colour." },
        ],
      },
      {
        title: "Cool completely",
        description: "Remove from the tin and cool on a wire rack for at least 2 hours before slicing. GF bread needs this time to set its structure.",
        timerMinutes: 120,
        timerLabel: "Cooling",
        lookFor: "The loaf should feel firm and cool to the touch. Cutting too early results in a gummy crumb.",
        troubleshoot: [
          { q: "The crumb is gummy inside?", a: "It likely needed more cooling time, or the internal temp didn't reach 96°C (205°F)." },
        ],
      },
    ],
    tips: [
      "A warmer ferment (28°C) gives faster rise but milder flavour.",
      "Don't skip the psyllium – it's the gluten replacement for structure.",
      "The loaf will feel soft when hot but firms up as it cools.",
    ],
    tags: ["sourdough", "loaf", "classic", "gluten-free"],
  },
  {
    id: "gf-sourdough-pizza",
    name: "Gluten-Free Sourdough Pizza Base",
    subtitle: "Crispy, chewy bases from your starter",
    category: "Flatbread",
    difficulty: "easy",
    prepTime: "20 min + 2-4h ferment",
    bakeTime: "12-15 min",
    description: "Crispy, chewy pizza bases using your gluten-free sourdough starter.",
    ingredients: [
      "150g rice flour",
      "50g tapioca starch",
      "100g active GF sourdough starter",
      "120ml warm water",
      "5g psyllium husk",
      "5g salt",
      "15ml olive oil",
    ],
    equipment: ["Pizza stone or inverted baking tray", "Rolling pin", "Parchment paper"],
    steps: [
      {
        title: "Make the psyllium gel",
        description: "Mix psyllium husk with water and let sit for 3 minutes until gelled.",
        timerMinutes: 3,
        timerLabel: "Psyllium gel",
      },
      {
        title: "Combine dry ingredients",
        description: "Combine flour, starch, and salt in a bowl.",
      },
      {
        title: "Mix the dough",
        description: "Add starter, psyllium gel, and olive oil. Mix to a soft dough.",
        lookFor: "A soft, slightly sticky dough that holds together. Not as wet as bread dough.",
      },
      {
        title: "Ferment",
        description: "Divide into 2 portions, cover, and ferment 2-4 hours at room temperature.",
        lookFor: "Dough should be slightly puffier with some bubbles visible.",
        troubleshoot: [
          { q: "Dough is very sticky?", a: "Dust your hands and surface with rice flour when shaping." },
        ],
      },
      {
        title: "Preheat oven",
        description: "Preheat oven to 250°C (482°F) with a pizza stone or inverted baking tray inside.",
        timerMinutes: 20,
        timerLabel: "Oven preheat",
      },
      {
        title: "Shape the bases",
        description: "Roll or press each portion onto parchment paper to desired thickness. Thinner = crispier.",
      },
      {
        title: "Par-bake",
        description: "Par-bake the bases for 5 minutes. This prevents a soggy middle once toppings are added.",
        timerMinutes: 5,
        timerLabel: "Par-bake",
        lookFor: "The surface should be set and slightly dry, but not browned yet.",
      },
      {
        title: "Add toppings and finish",
        description: "Add your favourite toppings and bake for 7-10 minutes more until golden and bubbling.",
        timerMinutes: 8,
        timerLabel: "Final bake",
        lookFor: "Golden edges, bubbling cheese, crispy base.",
      },
    ],
    tips: [
      "Wetter dough = chewier base. Drier = crispier.",
      "Par-baking prevents a soggy middle.",
      "Works great on a BBQ pizza stone too!",
    ],
    tags: ["pizza", "flatbread", "quick", "gluten-free"],
  },
  {
    id: "gf-sourdough-pancakes",
    name: "Sourdough Discard Pancakes",
    subtitle: "Zero-waste fluffy pancakes",
    category: "Breakfast",
    difficulty: "easy",
    prepTime: "10 min",
    bakeTime: "15 min",
    description: "Fluffy pancakes using sourdough discard — zero waste and delicious.",
    ingredients: [
      "200g sourdough discard",
      "1 egg",
      "30g sugar",
      "60ml milk (any)",
      "30g melted butter or oil",
      "3g baking powder",
      "Pinch of salt",
    ],
    equipment: ["Non-stick pan", "Spatula", "Mixing bowl"],
    steps: [
      {
        title: "Mix wet ingredients",
        description: "Whisk together discard, egg, sugar, milk, and melted butter in a bowl.",
      },
      {
        title: "Add dry ingredients",
        description: "Add baking powder and salt, stir gently until just combined. Don't overmix — lumps are fine!",
        lookFor: "A thick, pourable batter with a few small lumps. Overmixing makes pancakes tough.",
      },
      {
        title: "Heat the pan",
        description: "Heat a non-stick pan over medium heat with a little butter or oil.",
        lookFor: "A drop of water should sizzle and evaporate when the pan is ready.",
      },
      {
        title: "Cook the pancakes",
        description: "Pour ~60ml batter per pancake. Cook until bubbles form on the surface, then flip.",
        timerMinutes: 3,
        timerLabel: "First side",
        lookFor: "Bubbles forming across the surface and edges looking set.",
      },
      {
        title: "Flip and finish",
        description: "Flip and cook 1-2 minutes more until golden on both sides.",
        timerMinutes: 2,
        timerLabel: "Second side",
      },
      {
        title: "Serve",
        description: "Serve with fresh fruit, maple syrup, or honey. Enjoy warm!",
      },
    ],
    tips: [
      "Don't overmix — lumps are fine and keep pancakes fluffy.",
      "Discard straight from the fridge works perfectly.",
      "Add blueberries or chocolate chips to the batter for variety.",
    ],
    tags: ["pancakes", "breakfast", "discard", "easy", "gluten-free"],
  },
  {
    id: "gf-sourdough-focaccia",
    name: "Gluten-Free Sourdough Focaccia",
    subtitle: "Olive oil-rich with crispy top",
    category: "Bread",
    difficulty: "medium",
    prepTime: "20 min + 3-6h ferment",
    bakeTime: "25-30 min",
    description: "Olive oil-rich focaccia with a crispy top and soft, airy interior.",
    ingredients: [
      "200g rice flour",
      "80g tapioca starch",
      "40g potato starch",
      "180g active GF sourdough starter",
      "220ml warm water",
      "10g psyllium husk",
      "8g salt",
      "60ml extra virgin olive oil (divided)",
      "Flaky salt, rosemary, cherry tomatoes for topping",
    ],
    equipment: ["20x30cm baking tin", "Mixing bowl"],
    steps: [
      {
        title: "Make the psyllium gel",
        description: "Mix psyllium husk with warm water, let gel 5 minutes.",
        timerMinutes: 5,
        timerLabel: "Psyllium gel",
      },
      {
        title: "Combine dry ingredients",
        description: "Combine flours, starch, and salt in a bowl.",
      },
      {
        title: "Mix the dough",
        description: "Add starter, psyllium gel, and 30ml olive oil. Mix well until smooth.",
        lookFor: "A very wet, batter-like dough — this is normal for focaccia!",
      },
      {
        title: "Transfer to tin",
        description: "Pour remaining olive oil into a 20x30cm baking tin, then spread dough evenly. Don't be shy with the oil!",
      },
      {
        title: "Ferment",
        description: "Cover and ferment 3-6 hours until puffy and jiggly when you shake the tin.",
        lookFor: "The dough should jiggle like a waterbed and have visible bubbles throughout.",
        troubleshoot: [
          { q: "Not puffy after 4 hours?", a: "Move to a warmer spot. GF focaccia needs warmth to get that airy texture." },
        ],
      },
      {
        title: "Preheat and dimple",
        description: "Preheat oven to 220°C (428°F). Dimple the surface generously with oiled fingers.",
        timerMinutes: 15,
        timerLabel: "Oven preheat",
        lookFor: "Deep dimples that pool with olive oil — this creates the signature texture.",
      },
      {
        title: "Add toppings",
        description: "Press rosemary sprigs, cherry tomato halves, and flaky salt into the dimples.",
      },
      {
        title: "Bake",
        description: "Bake 25-30 minutes until golden and crisp on top.",
        timerMinutes: 27,
        timerLabel: "Bake",
        lookFor: "Deep golden colour with crispy, oil-fried edges.",
        troubleshoot: [
          { q: "Edges are crispy but middle is soft?", a: "That's actually perfect for focaccia! The middle should be soft and airy." },
        ],
      },
      {
        title: "Cool and serve",
        description: "Let cool 10 minutes in the tin before cutting for cleaner slices.",
        timerMinutes: 10,
        timerLabel: "Cooling",
      },
    ],
    tips: [
      "Don't be shy with the olive oil — it creates the signature crust.",
      "The dough will be very wet; that's normal for focaccia.",
      "Let it cool 10 minutes before cutting for cleaner slices.",
    ],
    tags: ["focaccia", "bread", "olive oil", "herbs", "gluten-free"],
  },
  {
    id: "gf-sourdough-crackers",
    name: "Seeded Sourdough Crackers",
    subtitle: "Crunchy snacks from your discard",
    category: "Snacks",
    difficulty: "easy",
    prepTime: "15 min",
    bakeTime: "20-25 min",
    description: "Crunchy, savoury crackers made with sourdough discard and seeds.",
    ingredients: [
      "150g sourdough discard",
      "30g rice flour",
      "30ml olive oil",
      "3g salt",
      "Mixed seeds (sesame, flax, sunflower)",
      "Dried herbs (optional)",
    ],
    equipment: ["Rolling pin", "Parchment paper", "Baking tray"],
    steps: [
      {
        title: "Preheat oven",
        description: "Preheat oven to 180°C (356°F).",
      },
      {
        title: "Mix the dough",
        description: "Mix discard, flour, olive oil, salt, and herbs until smooth.",
        lookFor: "A smooth, spreadable dough — not too thick, not too runny.",
      },
      {
        title: "Roll thin",
        description: "Roll very thin between two sheets of parchment paper. The thinner you roll, the crunchier they'll be.",
        lookFor: "Almost translucent thinness is ideal. Uneven spots will burn while thick spots stay chewy.",
      },
      {
        title: "Add seeds and score",
        description: "Remove top parchment, sprinkle with seeds and press gently. Score into cracker-sized pieces with a knife or pizza cutter.",
      },
      {
        title: "Bake",
        description: "Bake 20-25 minutes until golden and crisp. Watch carefully near the end — they go from perfect to burnt quickly.",
        timerMinutes: 22,
        timerLabel: "Bake",
        lookFor: "Even golden colour across all pieces. Remove any that brown faster at the edges.",
        troubleshoot: [
          { q: "Edges burning before middle is done?", a: "Remove the crispy edge pieces and return the rest to the oven." },
        ],
      },
      {
        title: "Cool and break apart",
        description: "Let cool completely on the tray, then break apart along score lines. They crisp up more as they cool.",
        lookFor: "Crackers should snap cleanly. If they bend, they need more time in the oven.",
      },
    ],
    tips: [
      "The thinner you roll, the crunchier they'll be.",
      "Experiment with everything bagel seasoning or za'atar.",
      "Store in an airtight container for up to a week.",
    ],
    tags: ["crackers", "snacks", "discard", "seeds", "gluten-free"],
  },
];

export const getRecipeById = (id: string): Recipe | undefined =>
  recipes.find((r) => r.id === id);

export const getRecipesByCategory = (category: string): Recipe[] =>
  recipes.filter((r) => r.category.toLowerCase() === category.toLowerCase());

export const searchRecipes = (query: string): Recipe[] => {
  const q = query.toLowerCase();
  return recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.tags.some((t) => t.includes(q)) ||
      r.description.toLowerCase().includes(q)
  );
};
