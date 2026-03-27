export type IssueId = "not_bubbling" | "bubbling_not_rising" | "smells_unusual" | "rose_then_stopped";
export type StatusLevel = "green" | "amber" | "red";

export interface Issue {
  id: IssueId;
  label: string;
  description: string;
  icon: string;
}

export interface Question {
  id: string;
  text: string;
  options: { label: string; value: string }[];
}

export interface Result {
  likelyCause: string;
  meaning: string;
  nextStep: string;
  waitLonger: boolean;
  restart: boolean;
  status: StatusLevel;
}

export const issues: Issue[] = [
  { id: "not_bubbling", label: "Starter not bubbling", description: "No visible activity after activation", icon: "🫧" },
  { id: "bubbling_not_rising", label: "Bubbling but not rising", description: "Small bubbles visible but no height increase", icon: "↕️" },
  { id: "smells_unusual", label: "Smells unusual", description: "Off-putting or unexpected aroma", icon: "👃" },
  { id: "rose_then_stopped", label: "Rose once, then stopped", description: "Had activity but now seems flat", icon: "📉" },
];

const sharedQuestions: Record<string, Question> = {
  starter: {
    id: "starter",
    text: "Which starter are you using?",
    options: [
      { label: "Simple Bake Dried Starter", value: "simple_bake" },
      { label: "Another dried starter", value: "other_dried" },
      { label: "Fresh starter from a friend", value: "fresh" },
    ],
  },
  hours_since: {
    id: "hours_since",
    text: "How many hours since activation or last feeding?",
    options: [
      { label: "Less than 12 hours", value: "lt12" },
      { label: "12–24 hours", value: "12_24" },
      { label: "24–48 hours", value: "24_48" },
      { label: "More than 48 hours", value: "gt48" },
    ],
  },
  room_temp: {
    id: "room_temp",
    text: "What is the room temperature roughly?",
    options: [
      { label: "Cool — below 20°C / 68°F", value: "cool" },
      { label: "Moderate — 20–25°C / 68–78°F", value: "moderate" },
      { label: "Warm — above 25°C / 78°F", value: "warm" },
    ],
  },
  water_type: {
    id: "water_type",
    text: "What kind of water did you use?",
    options: [
      { label: "Cool / cold water", value: "cool" },
      { label: "Lukewarm water", value: "lukewarm" },
      { label: "Hot water", value: "hot" },
    ],
  },
  doubled: {
    id: "doubled",
    text: "Has it doubled in size at any point?",
    options: [
      { label: "Yes, it doubled", value: "yes" },
      { label: "It rose a bit but didn't double", value: "partial" },
      { label: "No rise at all", value: "no" },
    ],
  },
  smell: {
    id: "smell",
    text: "What smell best describes it?",
    options: [
      { label: "Mild sour / tangy", value: "mild_sour" },
      { label: "Strong sour / vinegar", value: "strong_sour" },
      { label: "Unpleasant / rotten", value: "unpleasant" },
      { label: "No smell at all", value: "none" },
    ],
  },
};

export const questionsPerIssue: Record<IssueId, Question[]> = {
  not_bubbling: [
    sharedQuestions.starter,
    sharedQuestions.hours_since,
    sharedQuestions.room_temp,
    sharedQuestions.water_type,
  ],
  bubbling_not_rising: [
    sharedQuestions.starter,
    sharedQuestions.hours_since,
    sharedQuestions.room_temp,
    sharedQuestions.doubled,
  ],
  smells_unusual: [
    sharedQuestions.starter,
    sharedQuestions.hours_since,
    sharedQuestions.smell,
    sharedQuestions.room_temp,
  ],
  rose_then_stopped: [
    sharedQuestions.starter,
    sharedQuestions.hours_since,
    sharedQuestions.room_temp,
    sharedQuestions.doubled,
    sharedQuestions.smell,
  ],
};

export function getResult(issue: IssueId, answers: Record<string, string>): Result {
  // not_bubbling
  if (issue === "not_bubbling") {
    if (answers.hours_since === "lt12") {
      return {
        likelyCause: "Not enough time yet",
        meaning: "Gluten-free starters can take 24–48 hours to show first signs of activity. You're still early.",
        nextStep: "Keep it in a warm spot (around 24°C) and check again in 12 hours. No need to feed yet.",
        waitLonger: true,
        restart: false,
        status: "green",
      };
    }
    if (answers.water_type === "hot") {
      return {
        likelyCause: "Water too hot — may have killed the culture",
        meaning: "Hot water (above 40°C) can destroy the beneficial bacteria and yeast in your starter.",
        nextStep: "Start fresh with a new portion of dried starter. Use lukewarm water (around 30°C) this time.",
        waitLonger: false,
        restart: true,
        status: "red",
      };
    }
    if (answers.room_temp === "cool") {
      return {
        likelyCause: "Room temperature is too low",
        meaning: "Cool environments significantly slow down fermentation. Your starter needs warmth to wake up.",
        nextStep: "Move it to a warmer spot — aim for 24°C. A warm kitchen counter, oven with the light on, or a proofing box works well.",
        waitLonger: true,
        restart: false,
        status: "amber",
      };
    }
    if (answers.hours_since === "gt48") {
      return {
        likelyCause: "Starter may not have activated",
        meaning: "After 48+ hours without any bubbles, the culture may not have survived storage or rehydration.",
        nextStep: "Try starting again with fresh dried starter, lukewarm water, and a warm spot. If the problem persists, reach out to support.",
        waitLonger: false,
        restart: true,
        status: "red",
      };
    }
    return {
      likelyCause: "Slow activation — likely needs more time",
      meaning: "Some starters take up to 48 hours depending on conditions. This is normal for gluten-free starters.",
      nextStep: "Give it another 12–24 hours in a warm spot. Stir gently once a day to incorporate air.",
      waitLonger: true,
      restart: false,
      status: "amber",
    };
  }

  // bubbling_not_rising
  if (issue === "bubbling_not_rising") {
    if (answers.doubled === "no" && answers.hours_since === "lt12") {
      return {
        likelyCause: "Still building strength",
        meaning: "Bubbles mean fermentation has started — that's great! Rising takes a bit more time as the culture builds gas production.",
        nextStep: "Wait another 6–12 hours. Gluten-free starters don't rise as dramatically as wheat-based ones.",
        waitLonger: true,
        restart: false,
        status: "green",
      };
    }
    if (answers.room_temp === "cool") {
      return {
        likelyCause: "Temperature slowing fermentation",
        meaning: "Cool conditions mean slower gas production, so bubbles form but the starter can't build enough volume to rise visibly.",
        nextStep: "Move to a warmer spot (24°C). Consider placing it in the oven with just the light on.",
        waitLonger: true,
        restart: false,
        status: "amber",
      };
    }
    return {
      likelyCause: "Normal gluten-free behaviour",
      meaning: "Without gluten, starters often don't rise as high as wheat ones. Bubbles throughout are a great sign of healthy activity.",
      nextStep: "If it's bubbly and smells mildly sour, it's likely ready to use. Try the float test — drop a small spoonful in water.",
      waitLonger: false,
      restart: false,
      status: "green",
    };
  }

  // smells_unusual
  if (issue === "smells_unusual") {
    if (answers.smell === "unpleasant") {
      return {
        likelyCause: "Contamination or spoiled culture",
        meaning: "A rotten or truly unpleasant smell (not just sour) can indicate harmful bacteria have taken over.",
        nextStep: "Discard this batch and start fresh. Make sure your jar, utensils, and water are clean. Use filtered or bottled water.",
        waitLonger: false,
        restart: true,
        status: "red",
      };
    }
    if (answers.smell === "strong_sour") {
      return {
        likelyCause: "Over-fermented — needs feeding",
        meaning: "A strong vinegar or acetone smell means the starter has used up its food and is producing excess acetic acid.",
        nextStep: "Feed it right away: discard half, then add 30g flour blend and 26g lukewarm water. Feed twice daily until it balances out.",
        waitLonger: false,
        restart: false,
        status: "amber",
      };
    }
    if (answers.smell === "none") {
      return {
        likelyCause: "Fermentation hasn't started yet",
        meaning: "No smell at all suggests the culture hasn't woken up. This is common in the first 12–24 hours.",
        nextStep: "Give it more time in a warm spot. If there's still no smell after 48 hours, try reactivating with fresh starter.",
        waitLonger: true,
        restart: false,
        status: "green",
      };
    }
    return {
      likelyCause: "Healthy fermentation in progress",
      meaning: "A mild tangy or yoghurt-like smell is perfectly normal and a sign of healthy lactic acid bacteria.",
      nextStep: "Everything sounds good! Continue as normal and check for bubbles and a slight rise.",
      waitLonger: false,
      restart: false,
      status: "green",
    };
  }

  // rose_then_stopped
  if (issue === "rose_then_stopped") {
    if (answers.smell === "strong_sour" || answers.hours_since === "gt48") {
      return {
        likelyCause: "Starter is hungry — it peaked and collapsed",
        meaning: "Your starter rose, used up all its food, and has now deflated. The strong sour smell confirms it's over-fermented.",
        nextStep: "Feed it immediately: discard half, add 30g flour blend and 26g lukewarm water. It should bounce back within 8–12 hours.",
        waitLonger: false,
        restart: false,
        status: "amber",
      };
    }
    if (answers.doubled === "yes") {
      return {
        likelyCause: "You may have missed the peak",
        meaning: "Starters rise and fall naturally. If it doubled, it was likely ready to use at that point.",
        nextStep: "Feed it again and watch closely. Use it when it's at or near its peak — bubbly, domed, and mildly sour.",
        waitLonger: false,
        restart: false,
        status: "green",
      };
    }
    return {
      likelyCause: "Initial burst of activity, now stabilising",
      meaning: "An initial rise followed by a pause is common with dried starters. The culture is adjusting to its new environment.",
      nextStep: "Feed it once (discard half, add flour blend and water) and give it another 12–24 hours. Activity should resume.",
      waitLonger: true,
      restart: false,
      status: "amber",
    };
  }

  return {
    likelyCause: "Unknown issue",
    meaning: "We couldn't determine the issue from your answers.",
    nextStep: "Please submit a support request with a photo and notes so we can help.",
    waitLonger: false,
    restart: false,
    status: "amber",
  };
}
