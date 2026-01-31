export interface ScenarioPhase {
  name: string;
  objective: string;
  tips: string[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: "workplace" | "relationship" | "co-parenting" | "general";
  difficulty: 1 | 2 | 3 | 4 | 5;
  requiredLevel: number;
  context: string;
  aiRole: string;
  phases: ScenarioPhase[];
  duoMode?: boolean;
  roleA?: string;
  roleB?: string;
}

export const scenarios: Scenario[] = [
  {
    id: "workplace-1",
    title: "The Credit Taker",
    description: "A colleague presents your idea as their own in a team meeting.",
    category: "workplace",
    difficulty: 3,
    requiredLevel: 1,
    context: "You've been working on an innovative solution for weeks. During a team meeting, your colleague presents it as their own idea to the manager.",
    aiRole: "A defensive colleague who took credit for your work",
    phases: [
      {
        name: "Approach",
        objective: "Initiate a private conversation without accusations",
        tips: ["Use 'I' statements", "Stay calm and professional", "Choose the right time and place"],
      },
      {
        name: "Discuss",
        objective: "Express your feelings and perspective clearly",
        tips: ["Be specific about what happened", "Avoid blame language", "Listen to their perspective"],
      },
      {
        name: "Resolve",
        objective: "Find a mutually acceptable solution",
        tips: ["Focus on future actions", "Set clear expectations", "Document agreements"],
      },
    ],
  },
  {
    id: "workplace-2",
    title: "The Micromanager",
    description: "Your boss constantly checks on your work and questions every decision.",
    category: "workplace",
    difficulty: 4,
    requiredLevel: 8,
    context: "Your manager has been increasingly micromanaging your work, asking for updates multiple times a day and questioning every small decision.",
    aiRole: "An anxious manager who micromanages out of fear",
    phases: [
      {
        name: "Understand",
        objective: "Explore the root cause of the behavior",
        tips: ["Ask open-ended questions", "Show genuine curiosity", "Avoid defensive reactions"],
      },
      {
        name: "Address",
        objective: "Express how the behavior affects your work",
        tips: ["Focus on productivity", "Suggest alternatives", "Offer solutions"],
      },
      {
        name: "Agreement",
        objective: "Establish new communication norms",
        tips: ["Propose check-in schedules", "Set clear milestones", "Build trust gradually"],
      },
    ],
  },
  {
    id: "workplace-3",
    title: "Salary Negotiation",
    description: "You believe you deserve a raise and need to make your case.",
    category: "workplace",
    difficulty: 4,
    requiredLevel: 12,
    context: "You've been in your role for two years with excellent performance reviews but no salary increase. You've researched market rates and know you're underpaid.",
    aiRole: "A budget-conscious HR manager",
    phases: [
      {
        name: "Preparation",
        objective: "Present your value and research clearly",
        tips: ["Cite specific achievements", "Know your market value", "Be confident but not arrogant"],
      },
      {
        name: "Negotiation",
        objective: "Navigate objections professionally",
        tips: ["Listen to concerns", "Offer alternatives", "Stay calm under pressure"],
      },
      {
        name: "Closure",
        objective: "Reach a satisfactory outcome or next steps",
        tips: ["Get commitments in writing", "Establish timeline", "Maintain the relationship"],
      },
    ],
  },
  {
    id: "workplace-4",
    title: "The Deadline Disaster",
    description: "You need to tell your team you won't make an important deadline.",
    category: "workplace",
    difficulty: 3,
    requiredLevel: 1,
    context: "Due to unexpected complications, you realize you won't be able to deliver a critical project component on time. The team is counting on you.",
    aiRole: "A stressed project manager",
    phases: [
      {
        name: "Disclosure",
        objective: "Communicate the issue promptly and clearly",
        tips: ["Don't wait until the last minute", "Be honest about the situation", "Take responsibility"],
      },
      {
        name: "Solution",
        objective: "Propose alternatives and timeline",
        tips: ["Come with solutions, not just problems", "Be realistic", "Show commitment to fix it"],
      },
      {
        name: "Recovery",
        objective: "Rebuild trust and prevent future issues",
        tips: ["Follow through on promises", "Over-communicate progress", "Document lessons learned"],
      },
    ],
  },
  {
    id: "relationship-1",
    title: "The Distant Partner",
    description: "Your partner has been emotionally distant lately.",
    category: "relationship",
    difficulty: 3,
    requiredLevel: 1,
    context: "Over the past few weeks, your partner seems withdrawn. They're less affectionate and spend more time alone. You're worried but don't want to push them away.",
    aiRole: "A partner who is stressed and withdrawing",
    phases: [
      {
        name: "Observation",
        objective: "Express concern without accusations",
        tips: ["Choose a calm moment", "Start with observations", "Express care, not criticism"],
      },
      {
        name: "Connection",
        objective: "Create space for them to share",
        tips: ["Ask open questions", "Listen without fixing", "Validate their feelings"],
      },
      {
        name: "Support",
        objective: "Discuss how you can support each other",
        tips: ["Offer specific help", "Set gentle expectations", "Reaffirm your commitment"],
      },
    ],
  },
  {
    id: "relationship-2",
    title: "Money Matters",
    description: "You need to discuss a major financial decision with your partner.",
    category: "relationship",
    difficulty: 4,
    requiredLevel: 6,
    context: "Your partner wants to make a large purchase you're uncomfortable with. You have different financial priorities and need to find common ground.",
    aiRole: "A partner with different financial values",
    phases: [
      {
        name: "Values",
        objective: "Understand each other's financial perspectives",
        tips: ["Share your background with money", "Listen to their values", "Avoid judgment"],
      },
      {
        name: "Discussion",
        objective: "Present concerns and hear theirs",
        tips: ["Use numbers, not emotions", "Consider compromises", "Focus on shared goals"],
      },
      {
        name: "Decision",
        objective: "Reach a decision together",
        tips: ["Find middle ground", "Create a plan together", "Set up regular money talks"],
      },
    ],
  },
  {
    id: "coparenting-1",
    title: "Schedule Conflict",
    description: "Your co-parent keeps changing the custody schedule last minute.",
    category: "co-parenting",
    difficulty: 4,
    requiredLevel: 15,
    context: "Your ex-partner frequently asks for schedule changes with little notice, disrupting your plans and creating instability for your child.",
    aiRole: "A co-parent who is disorganized and defensive",
    phases: [
      {
        name: "Address",
        objective: "Raise the issue calmly and specifically",
        tips: ["Focus on the children's needs", "Use specific examples", "Avoid personal attacks"],
      },
      {
        name: "Boundaries",
        objective: "Establish clear expectations",
        tips: ["Propose minimum notice requirements", "Suggest communication methods", "Be willing to compromise"],
      },
      {
        name: "Agreement",
        objective: "Create a sustainable solution",
        tips: ["Put agreements in writing", "Use shared calendars", "Focus on consistency for kids"],
      },
    ],
  },
  {
    id: "coparenting-2",
    title: "Different Parenting Styles",
    description: "Your co-parent has very different rules at their house.",
    category: "co-parenting",
    difficulty: 3,
    requiredLevel: 1,
    context: "Your child is confused because the rules at your house and your co-parent's house are completely different. Bedtimes, screen time, and discipline vary widely.",
    aiRole: "A co-parent who disagrees with your parenting approach",
    phases: [
      {
        name: "Align",
        objective: "Find common ground on core values",
        tips: ["Focus on what matters most", "Accept some differences", "Prioritize child's wellbeing"],
      },
      {
        name: "Negotiate",
        objective: "Agree on essential consistencies",
        tips: ["Pick your battles", "Suggest specific areas", "Be flexible on non-essentials"],
      },
      {
        name: "Maintain",
        objective: "Create a plan to stay consistent",
        tips: ["Schedule regular check-ins", "Communicate about changes", "Support each other publicly"],
      },
    ],
  },
  {
    id: "general-1",
    title: "The Boundary Crosser",
    description: "A friend keeps overstepping your personal boundaries.",
    category: "general",
    difficulty: 2,
    requiredLevel: 1,
    context: "Your friend regularly shows up unannounced, asks intrusive questions, and doesn't respect when you say you're busy.",
    aiRole: "An oblivious friend who doesn't realize they're overstepping",
    phases: [
      {
        name: "Identify",
        objective: "Clearly identify and state your boundaries",
        tips: ["Be specific about behaviors", "Use clear language", "Explain why it matters to you"],
      },
      {
        name: "Establish",
        objective: "Set consequences and expectations",
        tips: ["Be firm but kind", "Explain what you need", "Offer alternatives"],
      },
      {
        name: "Maintain",
        objective: "Reinforce boundaries when tested",
        tips: ["Be consistent", "Follow through on consequences", "Acknowledge improvements"],
      },
    ],
  },
  {
    id: "general-2",
    title: "The Difficult Neighbor",
    description: "Your neighbor's behavior is affecting your quality of life.",
    category: "general",
    difficulty: 3,
    requiredLevel: 1,
    context: "Your neighbor plays loud music late at night, and previous hints haven't worked. You need to have a direct conversation.",
    aiRole: "A neighbor who is unaware of the impact of their behavior",
    phases: [
      {
        name: "Approach",
        objective: "Start a friendly conversation",
        tips: ["Choose the right time", "Start positive", "Be neighborly"],
      },
      {
        name: "Request",
        objective: "Make your request clearly",
        tips: ["Be specific about the issue", "Focus on impact", "Suggest solutions"],
      },
      {
        name: "Resolve",
        objective: "Agree on changes and follow-up",
        tips: ["Get agreement", "Offer reciprocity", "Leave door open for future talks"],
      },
    ],
  },
  {
    id: "general-3",
    title: "Standing Up for Yourself",
    description: "Someone is being rude or dismissive to you in public.",
    category: "general",
    difficulty: 2,
    requiredLevel: 1,
    context: "A stranger in line is being rude and trying to cut ahead. You want to stand up for yourself without escalating the situation.",
    aiRole: "An entitled person who believes they're more important",
    phases: [
      {
        name: "Assert",
        objective: "Calmly assert your position",
        tips: ["Stay calm but firm", "Use confident body language", "Speak clearly"],
      },
      {
        name: "De-escalate",
        objective: "Prevent the situation from escalating",
        tips: ["Don't match their energy", "Offer a solution", "Know when to disengage"],
      },
    ],
  },
  {
    id: "general-4",
    title: "Asking for Help",
    description: "You need to ask for help but feel like a burden.",
    category: "general",
    difficulty: 2,
    requiredLevel: 1,
    context: "You're going through a difficult time and need support from friends or family, but you're worried about being a burden.",
    aiRole: "A caring friend who wants to help",
    phases: [
      {
        name: "Reach Out",
        objective: "Initiate the conversation about needing help",
        tips: ["Choose someone you trust", "Be honest about your feelings", "It's okay to be vulnerable"],
      },
      {
        name: "Accept",
        objective: "Practice accepting help gracefully",
        tips: ["Let them help in their way", "Express gratitude", "Don't minimize your needs"],
      },
    ],
  },
];

// Duo Practice Scenarios - require 2 people
export const duoScenarios: Scenario[] = [
  {
    id: "duo-workplace-1",
    title: "Performance Review Discussion",
    description: "Practice both sides of a performance review conversation.",
    category: "workplace",
    difficulty: 3,
    requiredLevel: 5,
    context: "One person plays a manager giving constructive feedback, the other plays an employee receiving it. Take turns alternating perspectives.",
    aiRole: "",
    duoMode: true,
    roleA: "Manager",
    roleB: "Employee",
    phases: [
      {
        name: "Opening",
        objective: "Set a constructive tone for the conversation",
        tips: ["Start with positives", "Be specific with feedback", "Listen actively"],
      },
      {
        name: "Discussion",
        objective: "Exchange perspectives on performance",
        tips: ["Use examples", "Ask clarifying questions", "Acknowledge feelings"],
      },
      {
        name: "Action Planning",
        objective: "Agree on next steps together",
        tips: ["Set clear goals", "Offer support", "Schedule follow-up"],
      },
    ],
  },
  {
    id: "duo-relationship-1",
    title: "Dividing Household Chores",
    description: "Navigate a conversation about fairly distributing household responsibilities.",
    category: "relationship",
    difficulty: 2,
    requiredLevel: 1,
    context: "Partners discuss how to divide household tasks more fairly. Each person shares their perspective on current workload.",
    aiRole: "",
    duoMode: true,
    roleA: "Partner A",
    roleB: "Partner B",
    phases: [
      {
        name: "Share Perspectives",
        objective: "Each person shares how they view the current division",
        tips: ["Avoid accusations", "Use 'I' statements", "Be specific"],
      },
      {
        name: "Find Common Ground",
        objective: "Identify what each person values and prefers",
        tips: ["Ask about preferences", "Be flexible", "Focus on solutions"],
      },
      {
        name: "Create a Plan",
        objective: "Develop a fair division that works for both",
        tips: ["Write it down", "Be willing to adjust", "Check in regularly"],
      },
    ],
  },
  {
    id: "duo-coparenting-1",
    title: "Coordinating Holiday Schedules",
    description: "Work together to plan holiday time with your children.",
    category: "co-parenting",
    difficulty: 4,
    requiredLevel: 10,
    context: "Co-parents need to discuss and agree on holiday schedules while prioritizing children's needs and happiness.",
    aiRole: "",
    duoMode: true,
    roleA: "Parent A",
    roleB: "Parent B",
    phases: [
      {
        name: "Share Preferences",
        objective: "Express your holiday wishes while staying child-focused",
        tips: ["Focus on children's needs", "Be flexible", "Avoid past grievances"],
      },
      {
        name: "Problem Solve",
        objective: "Address conflicts and find compromises",
        tips: ["Think creatively", "Consider alternating years", "Keep emotions in check"],
      },
      {
        name: "Finalize",
        objective: "Agree on a schedule and backup plans",
        tips: ["Document the agreement", "Plan for contingencies", "Communicate with children"],
      },
    ],
  },
  {
    id: "duo-general-1",
    title: "Apologizing and Forgiving",
    description: "Practice giving a heartfelt apology and accepting one gracefully.",
    category: "general",
    difficulty: 3,
    requiredLevel: 3,
    context: "One person hurt the other unintentionally. Practice both apologizing sincerely and accepting an apology.",
    aiRole: "",
    duoMode: true,
    roleA: "Person Apologizing",
    roleB: "Person Receiving Apology",
    phases: [
      {
        name: "The Apology",
        objective: "Deliver a sincere, complete apology",
        tips: ["Take responsibility", "Be specific about what you did", "Don't make excuses"],
      },
      {
        name: "Processing",
        objective: "Share how the action affected you and listen",
        tips: ["Express feelings honestly", "Listen without interrupting", "Ask clarifying questions"],
      },
      {
        name: "Moving Forward",
        objective: "Discuss how to prevent future issues and rebuild trust",
        tips: ["Discuss changes", "Set expectations", "Express commitment"],
      },
    ],
  },
  {
    id: "duo-workplace-2",
    title: "Project Collaboration Conflict",
    description: "Resolve a disagreement about project direction with a colleague.",
    category: "workplace",
    difficulty: 3,
    requiredLevel: 1,
    context: "Two team members have different ideas about how to approach a project. Practice finding common ground professionally.",
    aiRole: "",
    duoMode: true,
    roleA: "Team Member A",
    roleB: "Team Member B",
    phases: [
      {
        name: "Present Ideas",
        objective: "Share your approach and reasoning",
        tips: ["Be clear and concise", "Focus on benefits", "Invite questions"],
      },
      {
        name: "Find Overlap",
        objective: "Identify shared goals and complementary ideas",
        tips: ["Look for common ground", "Ask about concerns", "Be open-minded"],
      },
      {
        name: "Decide Together",
        objective: "Agree on a unified approach",
        tips: ["Combine best elements", "Document decisions", "Define next steps"],
      },
    ],
  },
];

export function getScenariosByCategory(category: string): Scenario[] {
  return scenarios.filter(s => s.category === category);
}

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find(s => s.id === id);
}

export function getDuoScenarios(): Scenario[] {
  return duoScenarios;
}

export function getDuoScenarioById(id: string): Scenario | undefined {
  return duoScenarios.find(s => s.id === id);
}
