export interface RecipeIngredient {
  name: string;
  amount: string;
}

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
  subtitle: string;
  premix: string;
  starterType: string;
  ingredients: RecipeIngredient[];
  equipment: string[];
  steps: RecipeStep[];
  allergens?: string;
}

export const recipes: Recipe[] = [
  {
    id: "quinoa",
    name: "Quinoa Sourdough Bread",
    subtitle: "Loaf tin bread with olive oil",
    premix: "Simple Bake Gluten-Free Quinoa Bread Premix (361g)",
    starterType: "Brown Rice Sourdough Starter Powder (Quinoa Bread)",
    ingredients: [
      { name: "Quinoa Bread Premix", amount: "1 pouch (361g)" },
      { name: "Water (for bread)", amount: "265g" },
      { name: "Olive oil", amount: "28g" },
      { name: "Active sourdough starter", amount: "100g" },
    ],
    equipment: [
      "2 mixing bowls",
      "Kitchen scale",
      "Damp tea towel",
      "Loaf baking tin",
      "Greaseproof paper or butter for tin",
      "Cooling rack",
    ],
    steps: [
      {
        title: "Make Your Bread Dough",
        description: "Empty the quinoa bread premix into a large mixing bowl. Add 265g water, 28g olive oil, and 100g active sourdough starter. Mix thoroughly until all ingredients are well incorporated. Cover with a damp tea towel and leave for 1 hour.",
        timerMinutes: 60,
        timerLabel: "Initial rest (1 hour)",
        lookFor: "A well-combined, moist dough with no dry patches.",
      },
      {
        title: "Knead & Shape",
        description: "Lightly dust the worktop with GF flour and wet your hands. Remove dough from bowl and knead on worktop until it feels dough-like and holds its shape. Line your loaf baking tin with greaseproof paper or grease it with butter. Place the dough in the tin and cover with a damp tea towel.",
        lookFor: "A smooth dough that holds its shape in the tin.",
        troubleshoot: [
          { q: "Dough too sticky?", a: "Use wet hands and more GF flour for dusting." },
        ],
      },
      {
        title: "Overnight Rise (Recommended)",
        description: "Cover the dough with a damp tea towel or cling film. Refrigerate overnight for better flavour development. If baking the same day, leave at room temperature for 4–6 hours or more.",
        lookFor: "The dough should have risen noticeably in the tin.",
      },
      {
        title: "Prepare for Baking",
        description: "Remove bread from the fridge and let it rise for 1–2 hours at room temperature. Preheat oven to 190°C.",
        timerMinutes: 90,
        timerLabel: "Room temp rise (~1.5 hours)",
      },
      {
        title: "Bake Your Bread",
        description: "Place the bread in the preheated oven at 190°C. Bake for 35–40 minutes. Check after 35 minutes — the crust should look nice and golden. May need an extra 5–10 minutes for perfect doneness. Bread is ready when the crust is golden and hard.",
        timerMinutes: 40,
        timerLabel: "Bake time (~40 min)",
        lookFor: "A golden, hard crust.",
        troubleshoot: [
          { q: "Crust browning too quickly?", a: "Cover with foil for the last 10–15 minutes." },
        ],
      },
      {
        title: "Cooling (Important!)",
        description: "Remove from the oven when golden with a crust. Let it cool completely on a cooling rack before cutting. This is crucial — you must wait for the bread to cool down properly. Proper cooling ensures the best texture and prevents gumminess.",
        timerMinutes: 60,
        timerLabel: "Cooling (1 hour minimum)",
        lookFor: "The bread should sound hollow when tapped on the bottom.",
      },
    ],
  },
  {
    id: "buckwheat",
    name: "Buckwheat Sourdough Bread",
    subtitle: "Rustic round loaf",
    premix: "Simple Bake Buckwheat Bread Premix (278g)",
    starterType: "Chickpea Sourdough Starter Powder",
    allergens: "Contains: Almonds",
    ingredients: [
      { name: "Buckwheat Bread Premix", amount: "1 pouch (278g)" },
      { name: "Water (for bread)", amount: "300g" },
      { name: "Oil (olive or neutral)", amount: "15g" },
      { name: "Active sourdough starter", amount: "110g" },
    ],
    equipment: [
      "2 mixing bowls",
      "Kitchen scale",
      "Damp tea towel",
      "Baking tray",
      "Sharp knife or bread lame",
      "Cooling rack",
    ],
    steps: [
      {
        title: "Make Your Bread Dough",
        description: "Empty the buckwheat bread premix into a large mixing bowl. Add 300g water, 15g oil, and 110g active sourdough starter. Mix thoroughly until all ingredients are well incorporated. Cover with a damp tea towel and leave for 1 hour.",
        timerMinutes: 60,
        timerLabel: "Initial rest (1 hour)",
        lookFor: "A well-combined, moist dough.",
      },
      {
        title: "Knead & Shape",
        description: "Lightly dust the worktop with GF flour and wet your hands. Remove the dough from the bowl and knead it on the worktop until it feels dough-like and holds its shape. Shape into a nice round ball and coat with GF flour. Place in a small bowl lined with GF flour. Cover with a damp tea towel for 4 hours (longer if cooler weather).",
        timerMinutes: 240,
        timerLabel: "Proof (4 hours)",
        lookFor: "The dough should visibly rise in the container.",
        troubleshoot: [
          { q: "Dough too sticky?", a: "Use wet hands and more GF flour for dusting." },
        ],
      },
      {
        title: "Overnight Rise (Recommended)",
        description: "Cover the dough with a damp tea towel or cling film. Refrigerate overnight for better flavour development. If baking the same day, leave at room temperature for an additional hour.",
        lookFor: "A slightly puffier dough with better flavour after cold fermentation.",
      },
      {
        title: "Prepare for Baking",
        description: "Remove from fridge and coat with GF flour. Leave for 1–2 hours before baking. Preheat oven to 250°C with baking tray inside.",
        timerMinutes: 90,
        timerLabel: "Room temp rise (~1.5 hours)",
      },
      {
        title: "Bake Your Bread",
        description: "Remove the preheated tray and place the dough on it. Score the top with a sharp knife or bread lame. Spray bread with water to create steam. Bake 10 minutes at 250°C, then reduce to 225°C and bake 35–40 minutes. Check after 35 minutes — crust should be golden and hard. May need an extra 5–10 minutes.",
        timerMinutes: 50,
        timerLabel: "Bake time (~50 min)",
        lookFor: "A golden, hard crust.",
        troubleshoot: [
          { q: "Crust too dark?", a: "Cover with foil for the last 10–15 minutes." },
        ],
      },
      {
        title: "Cooling (Important!)",
        description: "Remove from the oven when golden with a hard crust. Place on a cooling rack. Cool COMPLETELY before cutting — this is crucial! Resist the temptation. Proper cooling ensures perfect texture.",
        timerMinutes: 60,
        timerLabel: "Cooling (1 hour minimum)",
        lookFor: "Hollow sound when tapped on the bottom.",
      },
    ],
  },
  {
    id: "chickpea",
    name: "Chickpea Sourdough Bread",
    subtitle: "Rustic round loaf",
    premix: "Simple Bake Chickpea Bread Premix (343g)",
    starterType: "Chickpea Sourdough Starter Powder",
    allergens: "Contains: Almonds",
    ingredients: [
      { name: "Chickpea Bread Premix", amount: "1 pouch (343g)" },
      { name: "Water (for bread)", amount: "320g" },
      { name: "Oil (olive or neutral)", amount: "15g" },
      { name: "Active sourdough starter", amount: "110g" },
    ],
    equipment: [
      "2 mixing bowls",
      "Kitchen scale",
      "Damp tea towel",
      "Baking tray",
      "Sharp knife or bread lame",
      "Cooling rack",
    ],
    steps: [
      {
        title: "Make Your Bread Dough",
        description: "Empty the chickpea bread premix into a large mixing bowl. Add 320g water, 15g oil, and 110g active sourdough starter. Mix thoroughly until all ingredients are well incorporated. Cover with a damp tea towel and leave for 1 hour.",
        timerMinutes: 60,
        timerLabel: "Initial rest (1 hour)",
        lookFor: "A well-combined, moist dough.",
      },
      {
        title: "Knead & Shape",
        description: "Lightly dust the worktop with GF flour and wet your hands. Remove the dough from the bowl and knead it on the worktop until it feels dough-like and holds its shape. Shape into a nice round ball and coat with GF flour. Place in a small bowl lined with GF flour. Cover with a damp tea towel for 4 hours (longer if cooler weather).",
        timerMinutes: 240,
        timerLabel: "Proof (4 hours)",
        lookFor: "The dough should visibly rise in the container.",
        troubleshoot: [
          { q: "Dough too sticky?", a: "Use wet hands and more GF flour for dusting." },
        ],
      },
      {
        title: "Overnight Rise (Recommended)",
        description: "Cover the dough with a damp tea towel or cling film. Refrigerate overnight for better flavour development. If baking the same day, leave at room temperature for an additional hour.",
        lookFor: "A slightly puffier dough after cold fermentation.",
      },
      {
        title: "Prepare for Baking",
        description: "Remove from fridge and coat with GF flour. Leave for 1–2 hours before baking. Preheat the oven to 250°C with the baking tray inside.",
        timerMinutes: 90,
        timerLabel: "Room temp rise (~1.5 hours)",
      },
      {
        title: "Bake Your Bread",
        description: "Remove the preheated tray and place the dough on it. Score the top with a sharp knife or bread lame. Spray bread with water to create steam. Bake 10 minutes at 250°C, then reduce to 225°C and bake 35–40 minutes. Check after 35 minutes — crust should be golden and hard. May need an extra 5–10 minutes.",
        timerMinutes: 50,
        timerLabel: "Bake time (~50 min)",
        lookFor: "A golden, hard crust.",
        troubleshoot: [
          { q: "Crust too dark?", a: "Cover with foil for the last 10–15 minutes." },
        ],
      },
      {
        title: "Cooling (Important!)",
        description: "Remove from the oven when golden with a hard crust. Place on a cooling rack. Cool COMPLETELY before cutting — this is crucial! Proper cooling ensures perfect texture.",
        timerMinutes: 60,
        timerLabel: "Cooling (1 hour minimum)",
        lookFor: "Hollow sound when tapped on the bottom.",
      },
    ],
  },
  {
    id: "oat",
    name: "Oat Sourdough Bread",
    subtitle: "Rustic round loaf",
    premix: "Simple Bake Oat Bread Premix (303g)",
    starterType: "Brown Rice Sourdough Starter Powder",
    allergens: "Contains: Oats",
    ingredients: [
      { name: "Oat Bread Premix", amount: "1 pouch (303g)" },
      { name: "Water (for bread)", amount: "300g" },
      { name: "Oil (olive or neutral)", amount: "15g" },
      { name: "Active sourdough starter", amount: "110g" },
    ],
    equipment: [
      "2 mixing bowls",
      "Kitchen scale",
      "Damp tea towel",
      "Baking tray",
      "Sharp knife or bread lame",
      "Cooling rack",
    ],
    steps: [
      {
        title: "Make Your Bread Dough",
        description: "Empty the oat bread premix into a large mixing bowl. Add 300g water, 15g oil, and 110g active sourdough starter. Mix thoroughly until all ingredients are well incorporated. Cover with a damp tea towel and leave for 1 hour.",
        timerMinutes: 60,
        timerLabel: "Initial rest (1 hour)",
        lookFor: "A well-combined, moist dough.",
      },
      {
        title: "Knead & Shape",
        description: "Lightly dust the worktop with GF flour and wet your hands. Remove the dough from the bowl and knead it on the worktop until it feels dough-like and holds its shape. Shape into a nice round ball and coat with GF flour. Place in a small bowl lined with GF flour. Cover with a damp tea towel for 4 hours (longer if cooler weather).",
        timerMinutes: 240,
        timerLabel: "Proof (4 hours)",
        lookFor: "The dough should visibly rise in the container.",
        troubleshoot: [
          { q: "Dough too sticky?", a: "Use wet hands and more GF flour for dusting." },
        ],
      },
      {
        title: "Overnight Rise (Recommended)",
        description: "Cover the dough with a damp tea towel or cling film. Refrigerate overnight for better flavour development. If baking the same day, leave at room temperature for an additional hour.",
        lookFor: "A slightly puffier dough after cold fermentation.",
      },
      {
        title: "Prepare for Baking",
        description: "Remove from fridge and coat with GF flour. Leave for 1–2 hours before baking. Preheat the oven to 250°C with the baking tray inside.",
        timerMinutes: 90,
        timerLabel: "Room temp rise (~1.5 hours)",
      },
      {
        title: "Bake Your Bread",
        description: "Remove the preheated tray and place the dough on it. Score the top with a sharp knife or bread lame. Spray bread with water to create steam. Bake for 10 minutes at 250°C, then reduce to 225°C and bake 35–40 minutes. Check after 35 minutes — crust should be golden and hard. May need an extra 5–10 minutes.",
        timerMinutes: 50,
        timerLabel: "Bake time (~50 min)",
        lookFor: "A golden, hard crust.",
        troubleshoot: [
          { q: "Crust too dark?", a: "Cover with foil for the last 10–15 minutes." },
        ],
      },
      {
        title: "Cooling (Important!)",
        description: "Remove from the oven when golden with a hard crust. Place on a cooling rack. Cool COMPLETELY before cutting — this is crucial! Proper cooling ensures perfect texture.",
        timerMinutes: 60,
        timerLabel: "Cooling (1 hour minimum)",
        lookFor: "Hollow sound when tapped on the bottom.",
      },
    ],
  },
  {
    id: "amaranth",
    name: "Amaranth Sourdough Bread",
    subtitle: "Rustic round loaf",
    premix: "Simple Bake Amaranth Bread Premix (343g)",
    starterType: "Amaranth Sourdough Starter Powder",
    allergens: "Contains: Almonds",
    ingredients: [
      { name: "Amaranth Bread Premix", amount: "1 pouch (343g)" },
      { name: "Water (for bread)", amount: "320g" },
      { name: "Oil (olive or neutral)", amount: "15g" },
      { name: "Active sourdough starter", amount: "110g" },
    ],
    equipment: [
      "2 mixing bowls",
      "Kitchen scale",
      "Damp tea towel",
      "Baking tray",
      "Sharp knife or bread lame",
      "Cooling rack",
    ],
    steps: [
      {
        title: "Make Your Bread Dough",
        description: "Empty the amaranth bread premix into a large mixing bowl. Add 320g water, 15g oil, and 110g active sourdough starter. Mix thoroughly until all ingredients are well incorporated. Cover with a damp tea towel and leave for 1 hour.",
        timerMinutes: 60,
        timerLabel: "Initial rest (1 hour)",
        lookFor: "A well-combined, moist dough.",
      },
      {
        title: "Knead & Shape",
        description: "Lightly dust the worktop with GF flour and wet your hands. Remove the dough from the bowl and knead it on the worktop until it feels dough-like and holds its shape. Shape into a nice round ball and coat with GF flour. Place in a small bowl lined with GF flour. Cover with a damp tea towel for 4 hours (longer if cooler weather).",
        timerMinutes: 240,
        timerLabel: "Proof (4 hours)",
        lookFor: "The dough should visibly rise in the container.",
        troubleshoot: [
          { q: "Dough too sticky?", a: "Use wet hands and more GF flour for dusting." },
        ],
      },
      {
        title: "Overnight Rise (Recommended)",
        description: "Cover the dough with a damp tea towel or cling film. Refrigerate overnight for better flavour development. If baking the same day, leave at room temperature for an additional hour.",
        lookFor: "A slightly puffier dough after cold fermentation.",
      },
      {
        title: "Prepare for Baking",
        description: "Remove from fridge and coat with GF flour. Leave for 1–2 hours before baking. Preheat the oven to 250°C with the baking tray inside.",
        timerMinutes: 90,
        timerLabel: "Room temp rise (~1.5 hours)",
      },
      {
        title: "Bake Your Bread",
        description: "Remove the preheated tray and place the dough on it. Score the top with a sharp knife or bread lame. Spray bread with water to create steam. Bake 10 minutes at 250°C, then reduce to 225°C and bake 35–40 minutes. Check after 35 minutes — crust should be golden and hard. May need an extra 5–10 minutes.",
        timerMinutes: 50,
        timerLabel: "Bake time (~50 min)",
        lookFor: "A golden, hard crust.",
        troubleshoot: [
          { q: "Crust too dark?", a: "Cover with foil for the last 10–15 minutes." },
        ],
      },
      {
        title: "Cooling (Important!)",
        description: "Remove from the oven when golden with a hard crust. Place on a cooling rack. Cool COMPLETELY before cutting — this is crucial! Proper cooling ensures perfect texture.",
        timerMinutes: 60,
        timerLabel: "Cooling (1 hour minimum)",
        lookFor: "Hollow sound when tapped on the bottom.",
      },
    ],
  },
  {
    id: "cornbread",
    name: "Sourdough Cornbread",
    subtitle: "Quick batter-style bread",
    premix: "Simple Bake Gluten-Free Sourdough Cornbread Premix (297g)",
    starterType: "Brown Rice Sourdough Starter Powder (Cornbread)",
    ingredients: [
      { name: "Cornbread Premix", amount: "1 pouch (297g)" },
      { name: "Whole milk (room temp)", amount: "200g" },
      { name: "Avocado or neutral oil", amount: "¼ cup (60ml)" },
      { name: "Large egg", amount: "1" },
      { name: "Active sourdough starter", amount: "264g" },
    ],
    equipment: [
      "2 mixing bowls",
      "Kitchen scale",
      "20×20 cm square baking tin",
      "Butter or greaseproof paper for tin",
    ],
    steps: [
      {
        title: "Prepare Your Baking Tin",
        description: "Preheat your oven to 180°C (fan oven) or 200°C (regular oven). Grease your 20×20 cm square baking tin with butter or line it with greaseproof paper.",
      },
      {
        title: "Make Your Cornbread Batter",
        description: "In a large bowl, mix together the milk, oil, and egg until well combined. Add the cornbread premix to the bowl. Add 264g of your active sourdough starter. Mix until everything is incorporated and you have a smooth batter.",
        lookFor: "A smooth, pourable batter with no lumps.",
        troubleshoot: [
          { q: "Batter too thick?", a: "Add a splash more milk." },
        ],
      },
      {
        title: "Bake Your Cornbread",
        description: "Pour the batter into your prepared baking tin. Ensure the top is smooth and the batter spreads evenly. Bake at 180°C for 20–24 minutes until done. Test with a toothpick — it should come out clean when inserted in the centre.",
        timerMinutes: 22,
        timerLabel: "Bake time (~22 min)",
        lookFor: "Golden top, toothpick comes out clean.",
        troubleshoot: [
          { q: "Top browning too quickly?", a: "Cover with foil for the last 5–10 minutes." },
          { q: "Cornbread not rising?", a: "Check that the starter is active and the oven temperature is correct." },
        ],
      },
      {
        title: "Serving",
        description: "You can eat it warm straight from the oven, or at room temperature. Perfect as a side dish or on its own. Store covered at room temperature for 2–3 days.",
      },
    ],
  },
  {
    id: "gingerbread",
    name: "Sourdough Gingerbread",
    subtitle: "Spiced sweet loaf",
    premix: "Simple Bake Spiced Oat Flour Blend (with mixed spices & baking powder)",
    starterType: "Dried Sourdough Starter Mix",
    allergens: "Contains: Oats",
    ingredients: [
      { name: "Spiced Oat Flour Blend (Pouch 1)", amount: "1 pouch" },
      { name: "Sugar & Vanilla Blend (Pouch 2)", amount: "1 pouch" },
      { name: "Large eggs", amount: "2" },
      { name: "Milk (or non-dairy)", amount: "60ml (¼ cup)" },
      { name: "Oil or melted butter", amount: "60ml (¼ cup)" },
      { name: "Active sourdough starter", amount: "from Pouch 3" },
      { name: "Optional add-ins", amount: "50g nuts, raisins, dates, or stem ginger" },
    ],
    equipment: [
      "Mixing bowl",
      "Kitchen scale",
      "Loaf tin",
      "Greaseproof paper or butter",
    ],
    steps: [
      {
        title: "Mix Wet Ingredients",
        description: "In a large bowl, whisk together the eggs, milk, and oil or melted butter until well combined.",
      },
      {
        title: "Combine All Ingredients",
        description: "Add the Spiced Oat Flour Blend (Pouch 1) and the Sugar & Vanilla Blend (Pouch 2) to the wet ingredients. Add your active sourdough starter. Mix until just combined — don't overmix. Fold in any optional add-ins (nuts, raisins, dates, or chopped stem ginger).",
        lookFor: "A thick, smooth batter. Don't overmix once flour is added.",
      },
      {
        title: "First Rise",
        description: "Pour batter into a greased or lined loaf tin. Cover and let rise in a warm spot until noticeably puffy — usually 45–90 minutes.",
        timerMinutes: 60,
        timerLabel: "First rise (~60 min)",
        lookFor: "The batter should be noticeably puffy and slightly risen.",
      },
      {
        title: "Bake",
        description: "Preheat oven to 175°C. Bake for 45–60 minutes, or until a skewer inserted into the centre comes out clean. Tent with foil if browning too fast.",
        timerMinutes: 55,
        timerLabel: "Bake time (~55 min)",
        lookFor: "Skewer comes out clean, golden top.",
        troubleshoot: [
          { q: "Browning too fast?", a: "Tent with foil and continue baking." },
          { q: "Still gooey in the middle?", a: "The gingerbread can take longer than regular cakes — be patient and keep testing with a skewer." },
        ],
      },
      {
        title: "Cool",
        description: "Cool 10–15 minutes in the tin, then transfer to a cooling rack. Let it cool completely before slicing for the best texture.",
        timerMinutes: 15,
        timerLabel: "Cool in tin (15 min)",
      },
    ],
  },
];
