export interface StudyQuote {
  text: string;
  author: string;
}

export const DAILY_STUDY_QUOTES: StudyQuote[] = [
  {
    text: 'Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.',
    author: 'Richard Feynman',
  },
  {
    text: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more.',
    author: 'Marie Curie',
  },
  {
    text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Will Durant',
  },
  {
    text: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
  },
  {
    text: 'If you cannot explain it simply, you do not understand it well enough.',
    author: 'Albert Einstein',
  },
  {
    text: 'It is not that I am so smart. But I stay with the questions much longer.',
    author: 'Albert Einstein',
  },
  {
    text: 'The secret to getting ahead is getting started; break complex overwhelming tasks into small manageable ones.',
    author: 'Mark Twain',
  },
  {
    text: 'Deep work is the ability to focus without distraction on a cognitively demanding task.',
    author: 'Cal Newport',
  },
  {
    text: 'Understanding grows when you test yourself before you feel ready.',
    author: 'Barbara Oakley',
  },
  {
    text: 'If you can’t solve a problem, then there is an easier problem you can solve: find it.',
    author: 'George Pólya',
  },
  {
    text: 'Luck is what happens when preparation meets opportunity.',
    author: 'Seneca',
  },
  {
    text: 'Small, consistent daily effort compounds into mastery faster than occasional marathons.',
    author: 'James Clear',
  },
  {
    text: 'The mind is not a vessel to be filled, but a fire to be kindled.',
    author: 'Plutarch',
  },
  {
    text: 'Imagination is the discovering faculty, pre-eminently. It is that which penetrates into the unseen worlds around us.',
    author: 'Ada Lovelace',
  },
  {
    text: 'Do the best you can until you know better. Then when you know better, do better.',
    author: 'Maya Angelou',
  },
  {
    text: 'Focus on the step right in front of you; steady progress quietly builds the entire staircase.',
    author: 'Marcus Aurelius',
  },
];

/** Deterministic starting quote index for a given local YYYY-MM-DD key. */
export function getDailyQuoteIndex(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash % DAILY_STUDY_QUOTES.length;
}
