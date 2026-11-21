import { BADGE_DEFINITIONS, getSpeedTier } from '../data/progression';
import {
  NumberMastery,
  OperationType,
  PracticeSettings,
  QuestionOutcome,
  RoundRecord,
  SpeedTierId,
  StudentProfile,
} from '../types/math';

const STORAGE_KEY = 'calcularapid_classroom_v1';

interface StoredState {
  activeProfileId: string;
  profiles: StudentProfile[];
  settings: PracticeSettings;
}

function createInitialNumberMastery(): Record<number, NumberMastery> {
  const mastery: Record<number, NumberMastery> = {};
  for (let n = 1; n <= 11; n++) {
    mastery[n] = { attempts: 0, correct: 0, totalTimeMs: 0 };
  }
  return mastery;
}

export function createStudentProfile(name: string): StudentProfile {
  const trimmed = name.trim().slice(0, 32) || 'Alumne';
  return {
    id: `student_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    createdAt: Date.now(),
    starsBalance: 0,
    totalStarsEarned: 0,
    highestUnlockedTier: 1,
    currentTier: 1,
    totalQuestionsAnswered: 0,
    totalCorrect: 0,
    directCorrect: 0,
    directTotal: 0,
    indirectCorrect: 0,
    indirectTotal: 0,
    bestStreak: 0,
    perfectRounds: 0,
    unlockedBadges: [],
    unlockedEmblems: ['compass'],
    equippedEmblemId: 'compass',
    operationStats: {
      sum: { attempts: 0, correct: 0, totalTimeMs: 0 },
      diff: { attempts: 0, correct: 0, totalTimeMs: 0 },
      mul: { attempts: 0, correct: 0, totalTimeMs: 0 },
    },
    numberMastery: createInitialNumberMastery(),
    roundHistory: [],
  };
}

export const DEFAULT_SETTINGS: PracticeSettings = {
  operations: ['sum', 'diff', 'mul'],
  questionMode: 'mixed',
  maxOperand: 11,
  questionsPerRound: 10,
  selectedTier: 1,
  adaptiveProgression: true,
  showVerbalHint: true,
};

export function loadStoredState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        const activeId = parsed.activeProfileId || parsed.profiles[0].id;
        const safeMaxOperand = Math.max(4, Math.min(11, parsed.settings?.maxOperand ?? 11));
        return {
          activeProfileId: parsed.profiles.some((p) => p.id === activeId)
            ? activeId
            : parsed.profiles[0].id,
          profiles: parsed.profiles,
          settings: {
            ...DEFAULT_SETTINGS,
            ...parsed.settings,
            maxOperand: safeMaxOperand,
          },
        };
      }
    }
  } catch {
    // Fallback cleanly if storage is corrupted
  }

  const starter = createStudentProfile('Classe 1');
  return {
    activeProfileId: starter.id,
    profiles: [starter],
    settings: DEFAULT_SETTINGS,
  };
}

export function saveStoredState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function calculateQuestionStars(
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitSeconds: number,
  streakAfter: number,
  isIndirect: boolean
): number {
  if (!isCorrect) return 0;
  let stars = 10;
  // Speed bonus when answered in less than half the allowed time
  if (responseTimeMs <= timeLimitSeconds * 500) {
    stars += 5;
  }
  // Indirect reasoning bonus
  if (isIndirect) {
    stars += 5;
  }
  // Streak bonus
  if (streakAfter >= 5) {
    stars += 5;
  } else if (streakAfter >= 3) {
    stars += 2;
  }
  return stars;
}

export function applyRoundResults(
  profile: StudentProfile,
  outcomes: QuestionOutcome[],
  settings: PracticeSettings,
  tierUsed: SpeedTierId
): {
  updatedProfile: StudentProfile;
  roundRecord: RoundRecord;
  newlyUnlockedBadges: string[];
  promotedToTier: SpeedTierId | null;
} {
  const next: StudentProfile = {
    ...profile,
    operationStats: {
      sum: { ...profile.operationStats.sum },
      diff: { ...profile.operationStats.diff },
      mul: { ...profile.operationStats.mul },
    },
    numberMastery: { ...profile.numberMastery },
    unlockedBadges: [...profile.unlockedBadges],
    unlockedEmblems: [...profile.unlockedEmblems],
    roundHistory: [...profile.roundHistory],
  };

  let correctCount = 0;
  let indirectCorrectCount = 0;
  let indirectTotalCount = 0;
  let totalTimeMs = 0;
  let roundStars = 0;
  let runningStreak = 0;
  let roundBestStreak = 0;

  for (const outcome of outcomes) {
    const q = outcome.question;
    totalTimeMs += outcome.responseTimeMs;
    roundStars += outcome.starsEarned;
    next.totalQuestionsAnswered += 1;

    const opStat = next.operationStats[q.operation];
    opStat.attempts += 1;
    opStat.totalTimeMs += outcome.responseTimeMs;

    if (q.isIndirect) {
      indirectTotalCount += 1;
      next.indirectTotal += 1;
    } else {
      next.directTotal += 1;
    }

    if (outcome.isCorrect) {
      correctCount += 1;
      runningStreak += 1;
      if (runningStreak > roundBestStreak) {
        roundBestStreak = runningStreak;
      }
      next.totalCorrect += 1;
      opStat.correct += 1;
      if (q.isIndirect) {
        indirectCorrectCount += 1;
        next.indirectCorrect += 1;
      } else {
        next.directCorrect += 1;
      }
    } else {
      runningStreak = 0;
    }

    // Track number mastery for both operands (1..11)
    const trackedOperands = Array.from(new Set([q.leftOperand, q.rightOperand]));
    for (const num of trackedOperands) {
      if (num >= 1 && num <= 11) {
        const current = next.numberMastery[num] ?? { attempts: 0, correct: 0, totalTimeMs: 0 };
        next.numberMastery[num] = {
          attempts: current.attempts + 1,
          correct: current.correct + (outcome.isCorrect ? 1 : 0),
          totalTimeMs: current.totalTimeMs + outcome.responseTimeMs,
        };
      }
    }
  }

  if (roundBestStreak > next.bestStreak) {
    next.bestStreak = roundBestStreak;
  }

  const totalQuestions = outcomes.length;
  if (totalQuestions > 0 && correctCount === totalQuestions) {
    next.perfectRounds += 1;
  }

  next.starsBalance += roundStars;
  next.totalStarsEarned += roundStars;

  const tierInfo = getSpeedTier(tierUsed);
  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const avgResponseTimeMs = totalQuestions > 0 ? Math.round(totalTimeMs / totalQuestions) : 0;

  let promotedToTier: SpeedTierId | null = null;
  if (
    tierUsed < 5 &&
    totalQuestions >= tierInfo.minQuestionsForPromotion &&
    accuracy >= tierInfo.promotionAccuracy
  ) {
    const candidateTier = (tierUsed + 1) as SpeedTierId;
    if (candidateTier > next.highestUnlockedTier) {
      next.highestUnlockedTier = candidateTier;
    }
    if (settings.adaptiveProgression) {
      next.currentTier = candidateTier;
      promotedToTier = candidateTier;
    } else if (candidateTier > profile.highestUnlockedTier) {
      promotedToTier = candidateTier;
    }
  }

  const roundRecord: RoundRecord = {
    id: `round_${Date.now()}`,
    timestamp: Date.now(),
    operations: [...settings.operations],
    questionMode: settings.questionMode,
    tierUsed,
    timeLimitSeconds: tierInfo.secondsPerQuestion,
    totalQuestions,
    correctCount,
    indirectCorrectCount,
    indirectTotalCount,
    avgResponseTimeMs,
    bestStreak: roundBestStreak,
    starsEarned: roundStars,
    promotedToTier,
  };

  next.roundHistory = [roundRecord, ...next.roundHistory].slice(0, 30);

  // Evaluate newly unlocked badges
  const newlyUnlockedBadges: string[] = [];
  for (const badge of BADGE_DEFINITIONS) {
    if (!next.unlockedBadges.includes(badge.id)) {
      if (badge.getProgress(next) >= badge.target) {
        next.unlockedBadges.push(badge.id);
        newlyUnlockedBadges.push(badge.id);
      }
    }
  }

  return {
    updatedProfile: next,
    roundRecord,
    newlyUnlockedBadges,
    promotedToTier,
  };
}
