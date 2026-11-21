export type OperationType = 'sum' | 'diff' | 'mul';

export type QuestionMode = 'direct' | 'indirect' | 'mixed';

export type MissingSlot = 'first' | 'second' | 'result';

export type SpeedTierId = 1 | 2 | 3 | 4 | 5;

export type AppTab = 'practice' | 'progression' | 'rewards' | 'profiles';

export interface SpeedTier {
  id: SpeedTierId;
  name: string;
  difficultyLabel: string;
  secondsPerQuestion: number;
  description: string;
  complexitySummary: string;
  minOperand: number; // >= 1
  maxOperand: number; // strictly < 12 (max 11)
  maxMulProduct: number;
  mixedIndirectRate: number;
  allowFirstSlotIndirect: boolean;
  promotionAccuracy: number; // e.g., 0.8 (80%)
  minQuestionsForPromotion: number;
}

export interface MathQuestion {
  id: string;
  operation: OperationType;
  leftOperand: number; // strictly < 12
  rightOperand: number; // strictly < 12
  result: number;
  missingSlot: MissingSlot;
  correctAnswer: number;
  isIndirect: boolean;
  verbalPrompt: string;
}

export interface PracticeSettings {
  operations: OperationType[];
  questionMode: QuestionMode;
  maxOperand: number; // 4..11 (strictly < 12)
  useDifficultyComplexity: boolean;
  questionsPerRound: 10 | 15 | 20;
  selectedTier: SpeedTierId;
  adaptiveProgression: boolean;
  showVerbalHint: boolean;
}

export interface QuestionOutcome {
  question: MathQuestion;
  userAnswer: number | null;
  isCorrect: boolean;
  timedOut: boolean;
  responseTimeMs: number;
  starsEarned: number;
}

export interface RoundRecord {
  id: string;
  timestamp: number;
  operations: OperationType[];
  questionMode: QuestionMode;
  tierUsed: SpeedTierId;
  timeLimitSeconds: number;
  totalQuestions: number;
  correctCount: number;
  indirectCorrectCount: number;
  indirectTotalCount: number;
  avgResponseTimeMs: number;
  bestStreak: number;
  starsEarned: number;
  promotedToTier: SpeedTierId | null;
}

export interface OperationStats {
  attempts: number;
  correct: number;
  totalTimeMs: number;
}

export interface NumberMastery {
  attempts: number;
  correct: number;
  totalTimeMs: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  createdAt: number;
  starsBalance: number;
  totalStarsEarned: number;
  highestUnlockedTier: SpeedTierId;
  currentTier: SpeedTierId;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  directCorrect: number;
  directTotal: number;
  indirectCorrect: number;
  indirectTotal: number;
  bestStreak: number;
  perfectRounds: number;
  unlockedBadges: string[];
  unlockedEmblems: string[];
  equippedEmblemId: string;
  operationStats: Record<OperationType, OperationStats>;
  numberMastery: Record<number, NumberMastery>; // keys 1..11
  roundHistory: RoundRecord[];
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  category: 'velocitat' | 'precisio' | 'indirectes' | 'operacions';
  target: number;
  getProgress: (profile: StudentProfile) => number;
}

export interface EmblemDefinition {
  id: string;
  name: string;
  subtitle: string;
  costStars: number;
  imagePath: string;
  fallbackColor: string;
}
