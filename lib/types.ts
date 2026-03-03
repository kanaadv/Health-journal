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
