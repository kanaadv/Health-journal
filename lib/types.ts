export interface MorningData {
  weight?: number | null;
  weightUnit?: "lbs" | "kg";
  bodyFat?: number | null;
  sleepHours?: number | null;
  wakeMood?: number | null;
  wakeEnergy?: number | null;
  notes?: string;
}

export interface ExerciseEntry {
  name: string;
  minutes?: number | null;
}

export interface EveningData {
  mood?: number | null;
  stress?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  exercises?: ExerciseEntry[];
  workoutImages?: string[];
  /** @deprecated use exercises array instead */
  exercise?: string | null;
  /** @deprecated use exercises array instead */
  exerciseMinutes?: number | null;
  socialConnectedness?: number | null;
  reflection?: string | null;
  notes?: string;
}

export interface ChecklistItem {
  item: string;
  target?: string | null;
  actual?: string | null;
  met: boolean;
}

export interface InsightResult {
  period: string;
  overallScore: number;
  scoreBreakdown: {
    nutrition: number;
    physicalMetrics: number;
    sleep: number;
    consistency: number;
  };
  summary: string;
  highlights: string[];
  areasToImprove: string[];
  actionableTips: string[];
  notablePatterns: string | null;
  dailyChecklist?: ChecklistItem[];
  generatedAt?: string;
}

export interface DailyEntry {
  id?: string;
  date: string;
  morning: MorningData;
  evening: EveningData;
  score?: number | null;
  insights?: InsightResult | null;
}

export interface GoalsData {
  weightGoal?: number | null;
  weightUnit?: "lbs" | "kg";
  bodyFatGoal?: number | null;
  updatedAt?: string;
}

export type PrimaryGoal =
  | "lose_fat"
  | "build_muscle"
  | "maintain"
  | "improve_fitness"
  | "recomp";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface UserProfile {
  age?: number | null;
  sex?: "male" | "female" | "prefer_not_to_say" | null;
  heightFt?: number | null;
  heightIn?: number | null;
  heightCm?: number | null;
  heightUnit?: "imperial" | "metric";
  primaryGoal?: PrimaryGoal | null;
  targetWeight?: number | null;
  targetBodyFat?: number | null;
  goalTimeline?: string | null;
  caloriTarget?: number | null;
  proteinTarget?: number | null;
  carbTarget?: number | null;
  fatTarget?: number | null;
  dietaryNotes?: string | null;
  trainingDaysPerWeek?: number | null;
  workoutTypes?: string[];
  activityLevel?: ActivityLevel | null;
  experienceLevel?: ExperienceLevel | null;
  sleepTarget?: number | null;
  additionalContext?: string | null;
  updatedAt?: string;
}
