export type TranslateFn = (key: string) => string;

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  // Attendee-facing categories (filters / discover)
  'Music': 'categories.music',
  'Sports': 'categories.sports',
  'Arts & Culture': 'categories.artsCulture',
  'Business': 'categories.business',
  'Food & Drink': 'categories.foodDrink',
  'Education': 'categories.education',
  'Technology': 'categories.technology',
  'Health & Wellness': 'categories.healthWellness',
  'Party': 'categories.party',
  'Religious': 'categories.religious',
  'Other': 'categories.other',

  // Organizer create-event categories that may appear on events
  'Arts': 'categories.artsCulture',
  'Community': 'categories.community',
  'Tech': 'categories.technology',
  'Health': 'categories.healthWellness',

  // Legacy categories that may appear on events
  'Concert': 'categories.concert',
  'Conference': 'categories.conference',
  'Festival': 'categories.festival',
  'Workshop': 'categories.workshop',
  'Theater': 'categories.theater',
};

function normalizeCategory(value: string) {
  return value.trim();
}

export function getCategoryLabel(t: TranslateFn, category: string | null | undefined): string {
  if (!category) return '';
  const normalized = normalizeCategory(category);
  const key = CATEGORY_LABEL_KEYS[normalized];
  return key ? t(key) : normalized;
}
