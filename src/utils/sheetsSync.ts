import { getSpeedTier } from '../data/progression';
import { QuestionMode, RoundRecord, StudentProfile } from '../types/math';
import { OPERATION_LABELS } from './questionGenerator';

const DEFAULT_SHEETS_EXEC_URL =
  'https://script.google.com/macros/s/AKfycbyuLAs6AMah7hU6t7Uxhrt6JMsF_lSHxDqyJ-grM5CKMafhqeO-itpYuxf0mcvXo3cq8A/exec';

const SHEETS_EXEC_URL =
  ((import.meta.env.VITE_SHEETS_EXEC_URL as string | undefined) || '').trim() ||
  DEFAULT_SHEETS_EXEC_URL;

const QUESTION_MODE_LABELS: Record<QuestionMode, string> = {
  direct: 'Directes',
  indirect: 'Indirectes',
  mixed: 'Mixtes',
};

export interface SheetsSyncResult {
  ok: boolean;
  sheet?: string;
  error?: string;
}

function isValidAppsScriptUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'script.google.com' &&
      parsed.pathname.startsWith('/macros/s/') &&
      parsed.pathname.endsWith('/exec')
    );
  } catch {
    return false;
  }
}

export async function submitRoundToSheets(
  profile: StudentProfile,
  round: RoundRecord
): Promise<SheetsSyncResult> {
  if (!isValidAppsScriptUrl(SHEETS_EXEC_URL)) {
    return { ok: false, error: 'URL de connexió no vàlid.' };
  }

  const tier = getSpeedTier(round.tierUsed);
  const payload = {
    timestamp: round.timestamp,
    studentName: profile.name,
    course: profile.course,
    group: profile.group,
    tierUsed: round.tierUsed,
    tierName: tier.name,
    operations: round.operations.map((op) => OPERATION_LABELS[op]).join(', '),
    questionMode: QUESTION_MODE_LABELS[round.questionMode] ?? round.questionMode,
    totalQuestions: round.totalQuestions,
    correctCount: round.correctCount,
    indirectTotalCount: round.indirectTotalCount,
    indirectCorrectCount: round.indirectCorrectCount,
    avgResponseTimeMs: round.avgResponseTimeMs,
    bestStreak: round.bestStreak,
    starsEarned: round.starsEarned,
    totalStarsEarned: profile.totalStarsEarned,
    highestUnlockedTier: profile.highestUnlockedTier,
  };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(SHEETS_EXEC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, error: 'No s’ha pogut desar al full de càlcul.' };
    }

    const data = (await response.json()) as { ok?: boolean; sheet?: string; error?: string };
    if (!data.ok) {
      return { ok: false, error: data.error || 'Error en registrar la ronda.' };
    }

    return { ok: true, sheet: data.sheet || profile.course };
  } catch {
    return { ok: false, error: 'Error de connexió amb el full de càlcul.' };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
