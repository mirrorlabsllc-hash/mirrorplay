export interface PracticePrompt {
  id: string;
  category: string;
  text: string;
  context?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const PRACTICE_PROMPTS: PracticePrompt[] = [
  // Workplace
  { id: "w1", category: "workplace", text: "Your coworker keeps interrupting you during meetings. How would you address this?", difficulty: "intermediate" },
  { id: "w2", category: "workplace", text: "You need to ask your manager for a deadline extension. What do you say?",  difficulty: "beginner" },
  { id: "w3", category: "workplace", text: "A teammate took credit for your idea. How would you bring this up?", difficulty: "advanced" },
  { id: "w4", category: "workplace", text: "You disagree with a decision your boss made. How do you express your concerns?", difficulty: "intermediate" },
  { id: "w5", category: "workplace", text: "Practice giving constructive feedback to a junior colleague about their work.", difficulty: "intermediate" },
  
  // Relationships
  { id: "r1", category: "relationships", text: "Your partner seems distant lately. How would you start a caring conversation?", difficulty: "beginner" },
  { id: "r2", category: "relationships", text: "A friend keeps canceling plans last minute. How do you express how this affects you?", difficulty: "intermediate" },
  { id: "r3", category: "relationships", text: "You need to apologize for something you said that hurt someone. What would you say?", difficulty: "intermediate" },
  { id: "r4", category: "relationships", text: "Someone you care about is going through a hard time. How do you offer support?", difficulty: "beginner" },
  { id: "r5", category: "relationships", text: "You want to reconnect with someone you've grown apart from. What would you say?", difficulty: "advanced" },
  
  // Empathy
  { id: "e1", category: "empathy", text: "A friend just lost their job. How would you respond with understanding?", difficulty: "beginner" },
  { id: "e2", category: "empathy", text: "Someone shares they're struggling with anxiety. What would you say?", difficulty: "intermediate" },
  { id: "e3", category: "empathy", text: "A colleague is upset about feedback they received. How do you show you understand?", difficulty: "intermediate" },
  { id: "e4", category: "empathy", text: "A family member is frustrated about something you don't fully understand. How do you respond?", difficulty: "advanced" },
  { id: "e5", category: "empathy", text: "Someone made a mistake and feels embarrassed. What would you say to comfort them?", difficulty: "beginner" },
  
  // Boundaries
  { id: "b1", category: "boundaries", text: "A family member keeps asking personal questions you're not comfortable answering. What do you say?", difficulty: "intermediate" },
  { id: "b2", category: "boundaries", text: "Your boss asks you to work over the weekend when you have plans. How do you respond?", difficulty: "intermediate" },
  { id: "b3", category: "boundaries", text: "A friend always vents to you but never asks how you're doing. How would you address this?", difficulty: "advanced" },
  { id: "b4", category: "boundaries", text: "Someone keeps pushing you to make a decision before you're ready. What do you say?", difficulty: "beginner" },
  { id: "b5", category: "boundaries", text: "You need to say no to taking on more responsibilities. How would you phrase it?", difficulty: "beginner" },
  
  // Confidence
  { id: "c1", category: "confidence", text: "Introduce yourself at a networking event in a memorable way.", difficulty: "beginner" },
  { id: "c2", category: "confidence", text: "You're asked to share your opinion in a group where others disagree. What do you say?", difficulty: "intermediate" },
  { id: "c3", category: "confidence", text: "Practice asking for what you deserve in a negotiation.", difficulty: "advanced" },
  { id: "c4", category: "confidence", text: "Someone questions your expertise. How do you respond with confidence?", difficulty: "intermediate" },
  { id: "c5", category: "confidence", text: "You need to present an idea you believe in to skeptical listeners. How do you start?", difficulty: "advanced" },
  
  // Difficult Talks
  { id: "d1", category: "difficult", text: "You need to end a friendship that's become toxic. How would you approach this?", difficulty: "advanced" },
  { id: "d2", category: "difficult", text: "A loved one has a habit that's affecting your relationship. How do you bring it up?", difficulty: "intermediate" },
  { id: "d3", category: "difficult", text: "You witnessed something unfair and need to speak up. What would you say?", difficulty: "intermediate" },
  { id: "d4", category: "difficult", text: "Someone is making assumptions about you that aren't true. How do you correct them?", difficulty: "beginner" },
  { id: "d5", category: "difficult", text: "You need to have an honest conversation about finances with your partner.", difficulty: "advanced" },
  
  // Goals
  { id: "g1", category: "goals", text: "Share your biggest goal for this year and why it matters to you.", difficulty: "beginner" },
  { id: "g2", category: "goals", text: "Explain to someone why you're making a life change they don't understand.", difficulty: "intermediate" },
  { id: "g3", category: "goals", text: "Practice asking a mentor for guidance on achieving your goals.", difficulty: "intermediate" },
  { id: "g4", category: "goals", text: "You're feeling stuck. Express what's holding you back and what help you need.", difficulty: "advanced" },
  { id: "g5", category: "goals", text: "Celebrate a recent accomplishment by sharing what you're proud of.", difficulty: "beginner" },
  
  // Stress Relief
  { id: "s1", category: "stress", text: "Describe how you're feeling right now in this moment, without judgment.", difficulty: "beginner" },
  { id: "s2", category: "stress", text: "Practice expressing frustration in a healthy, constructive way.", difficulty: "intermediate" },
  { id: "s3", category: "stress", text: "Talk through what's overwhelming you and identify one small step forward.", difficulty: "intermediate" },
  { id: "s4", category: "stress", text: "Practice asking for help when you're stressed without feeling guilty.", difficulty: "advanced" },
  { id: "s5", category: "stress", text: "Share three things you're grateful for right now.", difficulty: "beginner" },
];

export function getPromptsForCategory(categoryId: string): PracticePrompt[] {
  return PRACTICE_PROMPTS.filter(p => p.category === categoryId);
}

export function getRandomPrompt(categoryId: string): PracticePrompt {
  const categoryPrompts = getPromptsForCategory(categoryId);
  return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
}
