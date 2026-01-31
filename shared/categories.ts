export type PracticeCategory =
  | "workplace"
  | "relationships"
  | "family"
  | "social"
  | "self-advocacy";

export const PRACTICE_CATEGORIES: {
  id: PracticeCategory;
  label: string;
  description?: string;
}[] = [
  { id: "workplace", label: "Workplace" },
  { id: "relationships", label: "Relationships" },
  { id: "family", label: "Family" },
  { id: "social", label: "Social" },
  { id: "self-advocacy", label: "Self-Advocacy" },
];
