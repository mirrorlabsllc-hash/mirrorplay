export interface PracticeHandoff {
  id: string;
  category: string;
  line: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const DEFAULT_HANDOFF_LINE = "They’ve just shared something difficult. They’re watching your face for a response.";

export const PRACTICE_HANDOFFS: PracticeHandoff[] = [
  // Workplace
  { id: "w1", category: "workplace", line: "In the meeting, a coworker cuts you off again mid-sentence. The room waits.", difficulty: "intermediate" },
  { id: "w2", category: "workplace", line: "Your manager says the deadline is tomorrow, but you need more time. They’re waiting for your response.",  difficulty: "beginner" },
  { id: "w3", category: "workplace", line: "The team wraps up and your boss thanks a teammate for the idea you shared last week. Eyes drift to you.", difficulty: "advanced" },
  { id: "w4", category: "workplace", line: "The decision is set and the team nods along. You don’t agree, and they’re looking at you.", difficulty: "intermediate" },
  { id: "w5", category: "workplace", line: "A junior teammate hands you their draft and waits for your reaction across the table.", difficulty: "intermediate" },
  
  // Relationships
  { id: "r1", category: "relationships", line: "On the couch, your partner answers you with short, distant replies. They glance over, waiting.", difficulty: "beginner" },
  { id: "r2", category: "relationships", line: "A friend texts, “sorry, gotta bail again.” The chat bubble blinks for you.", difficulty: "intermediate" },
  { id: "r3", category: "relationships", line: "Across from you, they sit quiet after what you said. The pause stretches.", difficulty: "intermediate" },
  { id: "r4", category: "relationships", line: "They slump in their chair and finally share what’s weighing on them. Their eyes stay on you.", difficulty: "beginner" },
  { id: "r5", category: "relationships", line: "You meet after months apart. They smile politely, then wait in the small silence.", difficulty: "advanced" },
  
  // Empathy
  { id: "e1", category: "empathy", line: "A friend blurts out, “I just got let go.” Their voice cracks. They wait for you.", difficulty: "beginner" },
  { id: "e2", category: "empathy", line: "They admit quietly, “I’ve been feeling anxious all the time.” They watch your face.", difficulty: "intermediate" },
  { id: "e3", category: "empathy", line: "A colleague tosses the feedback sheet down, eyes wet. “I thought I did fine.”", difficulty: "intermediate" },
  { id: "e4", category: "empathy", line: "A family member vents, frustrated and tangled. “You don’t get it.” They look to you.", difficulty: "advanced" },
  { id: "e5", category: "empathy", line: "They fumble a task, blush, and mutter, “That was dumb.” Their eyes drop, waiting.", difficulty: "beginner" },
  
  // Boundaries
  { id: "b1", category: "boundaries", line: "At dinner, a relative presses with personal questions. Forks pause over plates.", difficulty: "intermediate" },
  { id: "b2", category: "boundaries", line: "A ping from your boss: “Can you cover this weekend.” The cursor blinks.", difficulty: "intermediate" },
  { id: "b3", category: "boundaries", line: "Your friend starts venting again, never asking about you. They lean in, expecting.", difficulty: "advanced" },
  { id: "b4", category: "boundaries", line: "They push, “So what’s it gonna be.” Their gaze doesn’t break.", difficulty: "beginner" },
  { id: "b5", category: "boundaries", line: "Your manager slides over another task. “Can you take this too.” Papers wait between you.", difficulty: "beginner" },
  
  // Confidence
  { id: "c1", category: "confidence", line: "The circle at the meetup turns to you. The host nods for your intro.", difficulty: "beginner" },
  { id: "c2", category: "confidence", line: "The room is split. Someone says, “You haven’t weighed in yet.” Eyes shift to you.", difficulty: "intermediate" },
  { id: "c3", category: "confidence", line: "Across the table, they slide the offer over. “So… does this work for you.” Silence follows.", difficulty: "advanced" },
  { id: "c4", category: "confidence", line: "They ask, “Are you sure you can handle this.” Their brow lifts.", difficulty: "intermediate" },
  { id: "c5", category: "confidence", line: "In the boardroom, arms are folded. “We’re not convinced yet.” They wait for your opening.", difficulty: "advanced" },
  
  // Difficult Talks
  { id: "d1", category: "difficult", line: "At the café, your friend chats like nothing’s wrong. You know you need to end this. The pause hangs.", difficulty: "advanced" },
  { id: "d2", category: "difficult", line: "That habit surfaces again. They notice your face change and stop mid-motion.", difficulty: "intermediate" },
  { id: "d3", category: "difficult", line: "The group saw what happened. Silence settles. A few eyes flick to you.", difficulty: "intermediate" },
  { id: "d4", category: "difficult", line: "They state a wrong assumption about you and wait for a nod.", difficulty: "beginner" },
  { id: "d5", category: "difficult", line: "Bills spread across the table. “We need to talk numbers,” they say, looking at you.", difficulty: "advanced" },
  
  // Goals and stress prompts moved out of Practice for now.
];

export function getHandoffsForCategory(categoryId: string): PracticeHandoff[] {
  return PRACTICE_HANDOFFS.filter(p => p.category === categoryId);
}

export function getRandomHandoff(categoryId: string): PracticeHandoff {
  const categoryPrompts = getHandoffsForCategory(categoryId);
  if (!categoryPrompts.length) {
    return {
      id: `${categoryId}-default`,
      category: categoryId,
      line: DEFAULT_HANDOFF_LINE,
      difficulty: "beginner",
    };
  }

  return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
}

export function getRandomHandoffLine(categoryId?: string): string {
  if (categoryId) {
    return getRandomHandoff(categoryId).line;
  }

  const random = PRACTICE_HANDOFFS[Math.floor(Math.random() * PRACTICE_HANDOFFS.length)];
  return random?.line ?? DEFAULT_HANDOFF_LINE;
}
