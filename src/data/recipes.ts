export interface Recipe {
  id: string;
  name: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  prepTime: string;
  bakeTime: string;
  description: string;
  ingredients: string[];
  steps: string[];
  tips: string[];
  tags: string[];
}

export const recipes: Recipe[] = [
  {
    id: "gf-sourdough-loaf",
    name: "Classic Gluten-Free Sourdough Loaf",
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
    steps: [
      "Mix psyllium husk with warm water and let gel for 5 minutes.",
      "Combine flours, starch, salt, and sugar in a large bowl.",
      "Add active starter, psyllium gel, and olive oil. Mix until smooth.",
      "Transfer to an oiled loaf tin and smooth the top.",
      "Cover and ferment at 25-28°C for 4-8 hours until risen by 50-75%.",
      "Preheat oven to 220°C with a Dutch oven or steam tray.",
      "Score the top of the loaf with a sharp blade.",
      "Bake covered for 30 minutes, then uncovered for 15-25 minutes until deep golden.",
      "Cool completely on a wire rack before slicing (at least 2 hours).",
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
    steps: [
      "Mix psyllium husk with water and let sit 3 minutes.",
      "Combine flour, starch, and salt.",
      "Add starter, psyllium gel, and olive oil. Mix to a soft dough.",
      "Divide into 2 portions, cover, and ferment 2-4 hours.",
      "Preheat oven to 250°C with a pizza stone or inverted baking tray.",
      "Roll or press each portion onto parchment paper to desired thickness.",
      "Par-bake for 5 minutes, add toppings, then bake 7-10 minutes more.",
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
    steps: [
      "Whisk together discard, egg, sugar, milk, and melted butter.",
      "Add baking powder and salt, stir gently until just combined.",
      "Heat a non-stick pan over medium heat with a little butter.",
      "Pour ~60ml batter per pancake. Cook until bubbles form on surface.",
      "Flip and cook 1-2 minutes more until golden.",
      "Serve with fresh fruit, maple syrup, or honey.",
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
    steps: [
      "Mix psyllium husk with warm water, let gel 5 minutes.",
      "Combine flours, starch, and salt.",
      "Add starter, psyllium gel, and 30ml olive oil. Mix well.",
      "Pour remaining olive oil into a 20x30cm baking tin, spread dough evenly.",
      "Cover and ferment 3-6 hours until puffy and jiggly.",
      "Preheat oven to 220°C. Dimple the surface with oiled fingers.",
      "Add toppings: rosemary, tomatoes, flaky salt.",
      "Bake 25-30 minutes until golden and crisp on top.",
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
    steps: [
      "Preheat oven to 180°C.",
      "Mix discard, flour, olive oil, salt, and herbs until smooth.",
      "Roll very thin between two sheets of parchment paper.",
      "Remove top parchment, sprinkle with seeds and press gently.",
      "Score into cracker-sized pieces with a knife or pizza cutter.",
      "Bake 20-25 minutes until golden and crisp.",
      "Break apart along score lines once cooled.",
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
