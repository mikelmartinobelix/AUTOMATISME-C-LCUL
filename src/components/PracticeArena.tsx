import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Delete,
  Flame,
  HelpCircle,
  Play,
  RotateCcw,
  Square,
  Star,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { BADGE_DEFINITIONS, SPEED_TIERS, getSpeedTier } from '../data/progression';
import {
  MathQuestion,
  OperationType,
  PracticeSettings,
  QuestionMode,
  QuestionOutcome,
  RoundRecord,
  SpeedTierId,
  StudentProfile,
} from '../types/math';
import {
  OPERATION_LABELS,
  OPERATION_SYMBOLS,
  generateQuestion,
} from '../utils/questionGenerator';
import { calculateQuestionStars } from '../utils/storage';
import { EmblemAvatar } from './EmblemAvatar';

interface PracticeArenaProps {
  profile: StudentProfile;
  settings: PracticeSettings;
  onUpdateSettings: (next: PracticeSettings) => void;
  onCompleteRound: (
    outcomes: QuestionOutcome[],
    tierUsed: SpeedTierId
  ) => {
    roundRecord: RoundRecord;
    newlyUnlockedBadges: string[];
    promotedToTier: SpeedTierId | null;
  };
  externalStartSignal: number;
}

type ArenaPhase = 'idle' | 'playing' | 'summary';

interface RoundSummaryState {
  outcomes: QuestionOutcome[];
  roundRecord: RoundRecord;
  newlyUnlockedBadges: string[];
  promotedToTier: SpeedTierId | null;
}

export function PracticeArena({
  profile,
  settings,
  onUpdateSettings,
  onCompleteRound,
  externalStartSignal,
}: PracticeArenaProps) {
  const [phase, setPhase] = useState<ArenaPhase>('idle');
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [streak, setStreak] = useState(0);
  const [roundStars, setRoundStars] = useState(0);
  const [outcomes, setOutcomes] = useState<QuestionOutcome[]>([]);
  const [feedback, setFeedback] = useState<QuestionOutcome | null>(null);
  const [summary, setSummary] = useState<RoundSummaryState | null>(null);

  const activeTierId: SpeedTierId = settings.adaptiveProgression
    ? profile.currentTier
    : (Math.min(settings.selectedTier, profile.highestUnlockedTier) as SpeedTierId);
  const activeTier = getSpeedTier(activeTierId);
  const limitMs = activeTier.secondsPerQuestion * 1000;

  const [remainingMs, setRemainingMs] = useState(limitMs);

  const questionStartRef = useRef<number>(0);
  const lastSignatureRef = useRef<string | undefined>(undefined);
  const advanceTimerRef = useRef<number | null>(null);
  const outcomesRef = useRef<QuestionOutcome[]>([]);
  const streakRef = useRef<number>(0);

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  const spawnNextQuestion = useCallback(
    (nextIndex: number) => {
      clearAdvanceTimer();
      const { question, signature } = generateQuestion(settings, lastSignatureRef.current);
      lastSignatureRef.current = signature;
      setCurrentQuestion(question);
      setQuestionIndex(nextIndex);
      setInputValue('');
      setFeedback(null);
      setRemainingMs(limitMs);
      questionStartRef.current = performance.now();
    },
    [limitMs, settings]
  );

  const startRound = useCallback(() => {
    clearAdvanceTimer();
    outcomesRef.current = [];
    streakRef.current = 0;
    lastSignatureRef.current = undefined;
    setOutcomes([]);
    setStreak(0);
    setRoundStars(0);
    setSummary(null);
    setPhase('playing');
    spawnNextQuestion(0);
  }, [spawnNextQuestion]);

  // Allow Top Bar primary CTA to trigger a new round cleanly
  const lastSignalRef = useRef(externalStartSignal);
  useEffect(() => {
    if (externalStartSignal !== lastSignalRef.current) {
      lastSignalRef.current = externalStartSignal;
      startRound();
    }
  }, [externalStartSignal, startRound]);

  const finishOrAdvance = useCallback(
    (recordedOutcomes: QuestionOutcome[], currentIdx: number) => {
      if (currentIdx + 1 >= settings.questionsPerRound) {
        const result = onCompleteRound(recordedOutcomes, activeTierId);
        setSummary({
          outcomes: recordedOutcomes,
          roundRecord: result.roundRecord,
          newlyUnlockedBadges: result.newlyUnlockedBadges,
          promotedToTier: result.promotedToTier,
        });
        setPhase('summary');
      } else {
        spawnNextQuestion(currentIdx + 1);
      }
    },
    [activeTierId, onCompleteRound, settings.questionsPerRound, spawnNextQuestion]
  );

  const resolveAnswer = useCallback(
    (submittedAnswer: number | null, timedOut: boolean) => {
      if (!currentQuestion || feedback !== null) return;

      const elapsedMs = timedOut
        ? limitMs
        : Math.min(limitMs, Math.max(150, Math.round(performance.now() - questionStartRef.current)));

      const isCorrect =
        !timedOut && submittedAnswer !== null && submittedAnswer === currentQuestion.correctAnswer;

      const nextStreak = isCorrect ? streakRef.current + 1 : 0;
      streakRef.current = nextStreak;
      setStreak(nextStreak);

      const starsEarned = calculateQuestionStars(
        isCorrect,
        elapsedMs,
        activeTier.secondsPerQuestion,
        nextStreak,
        currentQuestion.isIndirect
      );
      if (starsEarned > 0) {
        setRoundStars((prev) => prev + starsEarned);
      }

      const outcome: QuestionOutcome = {
        question: currentQuestion,
        userAnswer: submittedAnswer,
        isCorrect,
        timedOut,
        responseTimeMs: elapsedMs,
        starsEarned,
      };

      const nextOutcomes = [...outcomesRef.current, outcome];
      outcomesRef.current = nextOutcomes;
      setOutcomes(nextOutcomes);
      setFeedback(outcome);

      advanceTimerRef.current = window.setTimeout(() => {
        finishOrAdvance(nextOutcomes, questionIndex);
      }, 1150);
    },
    [
      activeTier.secondsPerQuestion,
      currentQuestion,
      feedback,
      finishOrAdvance,
      limitMs,
      questionIndex,
    ]
  );

  // High-precision countdown interval while question is active
  useEffect(() => {
    if (phase !== 'playing' || feedback !== null || !currentQuestion) return;

    const intervalId = window.setInterval(() => {
      const elapsed = performance.now() - questionStartRef.current;
      const left = Math.max(0, limitMs - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        window.clearInterval(intervalId);
        resolveAnswer(null, true);
      }
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [currentQuestion, feedback, limitMs, phase, resolveAnswer]);

  // Cleanup timer on unmount
  useEffect(() => () => clearAdvanceTimer(), []);

  const handleSubmit = useCallback(() => {
    if (feedback !== null) {
      clearAdvanceTimer();
      finishOrAdvance(outcomesRef.current, questionIndex);
      return;
    }
    if (inputValue.trim() === '') return;
    const parsed = Number.parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) return;
    resolveAnswer(parsed, false);
  }, [feedback, finishOrAdvance, inputValue, questionIndex, resolveAnswer]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (feedback !== null) return;
      setInputValue((prev) => {
        if (prev.length >= 3) return prev;
        if (prev === '0') return digit;
        return prev + digit;
      });
    },
    [feedback]
  );

  const handleBackspace = useCallback(() => {
    if (feedback !== null) return;
    setInputValue((prev) => prev.slice(0, -1));
  }, [feedback]);

  // Physical keyboard listener during active play
  useEffect(() => {
    if (phase !== 'playing') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBackspace, handleDigit, handleSubmit, phase]);

  const toggleOperation = (op: OperationType) => {
    const exists = settings.operations.includes(op);
    if (exists && settings.operations.length === 1) return; // Always keep at least 1
    const nextOps = exists
      ? settings.operations.filter((item) => item !== op)
      : [...settings.operations, op];
    onUpdateSettings({ ...settings, operations: nextOps });
  };

  // Dynamic preview equation reflecting current settings
  const previewExample = useMemo(() => {
    const hasMul = settings.operations.includes('mul');
    const hasDiff = settings.operations.includes('diff');
    const isIndirect = settings.questionMode !== 'direct';

    if (hasMul && isIndirect) {
      return {
        left: '2',
        op: '×',
        right: '?',
        result: '6',
        missing: 'second' as const,
        hint: '2 per un nombre dona 6. Quin nombre falta? (3)',
      };
    }
    if (hasDiff && isIndirect) {
      return {
        left: '9',
        op: '−',
        right: '?',
        result: '4',
        missing: 'second' as const,
        hint: 'Si a 9 li treus quin nombre queda 4? (5)',
      };
    }
    if (isIndirect) {
      return {
        left: '?',
        op: '+',
        right: '4',
        result: '11',
        missing: 'first' as const,
        hint: 'Quin nombre més 4 dona 11? (7)',
      };
    }
    if (hasMul) {
      return {
        left: '6',
        op: '×',
        right: '4',
        result: '?',
        missing: 'result' as const,
        hint: 'Quant és 6 per 4? (24)',
      };
    }
    return {
      left: '7',
      op: '+',
      right: '5',
      result: '?',
      missing: 'result' as const,
      hint: 'Quant és 7 més 5? (12)',
    };
  }, [settings.operations, settings.questionMode]);

  const timeRatio = limitMs > 0 ? Math.max(0, Math.min(1, remainingMs / limitMs)) : 0;
  const isUrgent = timeRatio <= 0.25;
  const isWarning = timeRatio <= 0.5 && timeRatio > 0.25;

  const renderEquation = (q: MathQuestion, currentInput: string, showAnswerOnFeedback: boolean) => {
    const slotBox = (content: string, isMissing: boolean) => {
      if (!isMissing) {
        return <span className="text-slate-900">{content}</span>;
      }

      const displayVal = showAnswerOnFeedback
        ? String(q.correctAnswer)
        : currentInput.length > 0
          ? currentInput
          : '?';

      const boxStyle = showAnswerOnFeedback
        ? feedback?.isCorrect
          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
          : 'border-rose-500 bg-rose-50 text-rose-800'
        : currentInput.length > 0
          ? 'border-sky-600 bg-sky-50 text-sky-900'
          : 'border-sky-400 bg-white text-sky-600';

      return (
        <span
          className={`inline-flex items-center justify-center min-w-[76px] sm:min-w-[92px] h-16 sm:h-20 px-3 rounded-xl border-2 transition-colors ${boxStyle}`}
        >
          {displayVal}
        </span>
      );
    };

    return (
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 font-mono tabular-nums text-4xl sm:text-5xl font-bold tracking-tight">
        {slotBox(String(q.leftOperand), q.missingSlot === 'first')}
        <span className="text-slate-500 font-semibold">{OPERATION_SYMBOLS[q.operation]}</span>
        {slotBox(String(q.rightOperand), q.missingSlot === 'second')}
        <span className="text-slate-400 font-semibold">=</span>
        {slotBox(String(q.result), q.missingSlot === 'result')}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT / MAIN INTERACTIVE STAGE (7 cols) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        {phase === 'idle' && (
          <div className="space-y-8">
            {/* Active Student Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <EmblemAvatar emblemId={profile.equippedEmblemId} size="md" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{profile.name}</h2>
                  <p className="text-sm text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="font-mono tabular-nums font-medium text-slate-700">
                      Nivell {activeTier.id} · {activeTier.name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {activeTier.secondsPerQuestion.toFixed(1)} s / pregunta
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-amber-700 font-medium">
                      {profile.starsBalance} estrelles
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Central Practice Preview */}
            <div className="py-6 px-4 sm:px-8 bg-slate-50 border border-slate-200/80 rounded-xl text-center space-y-5">
              <p className="text-xs font-medium text-slate-500">
                Exemple del mode seleccionat · Nombres menors que 12 (1–{settings.maxOperand})
              </p>

              <div className="flex items-center justify-center gap-3 sm:gap-5 font-mono tabular-nums text-3xl sm:text-5xl font-bold text-slate-900">
                <span
                  className={
                    previewExample.missing === 'first'
                      ? 'inline-flex items-center justify-center min-w-[68px] h-14 sm:h-16 px-3 rounded-xl border-2 border-sky-400 bg-white text-sky-600'
                      : ''
                  }
                >
                  {previewExample.left}
                </span>
                <span className="text-slate-500">{previewExample.op}</span>
                <span
                  className={
                    previewExample.missing === 'second'
                      ? 'inline-flex items-center justify-center min-w-[68px] h-14 sm:h-16 px-3 rounded-xl border-2 border-sky-400 bg-white text-sky-600'
                      : ''
                  }
                >
                  {previewExample.right}
                </span>
                <span className="text-slate-400">=</span>
                <span
                  className={
                    previewExample.missing === 'result'
                      ? 'inline-flex items-center justify-center min-w-[68px] h-14 sm:h-16 px-3 rounded-xl border-2 border-sky-400 bg-white text-sky-600'
                      : ''
                  }
                >
                  {previewExample.result}
                </span>
              </div>

              <p className="text-sm text-slate-600 max-w-md mx-auto">{previewExample.hint}</p>
            </div>

            {/* Primary CTA + Quick Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="text-sm text-slate-600 space-y-1">
                <p>
                  <span className="font-semibold text-slate-900">
                    {settings.questionsPerRound} preguntes
                  </span>{' '}
                  ·{' '}
                  {settings.operations.map((op) => OPERATION_LABELS[op]).join(', ')}
                </p>
                <p className="text-xs text-slate-500">
                  Pots respondre amb el teclat numèric o tocant els botons en pantalla.
                </p>
              </div>
              <button
                type="button"
                onClick={startRound}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-sky-600 text-white font-semibold text-base hover:bg-sky-700 active:scale-[0.99] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Començar ronda</span>
              </button>
            </div>
          </div>
        )}

        {phase === 'playing' && currentQuestion && (
          <div className="space-y-6">
            {/* Round Telemetry Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 font-mono tabular-nums">
                <span className="font-semibold text-slate-900">
                  Pregunta {questionIndex + 1} / {settings.questionsPerRound}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  |
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Ratxa {streak}
                </span>
                <span aria-hidden="true" className="text-slate-300">
                  |
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  +{roundStars}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearAdvanceTimer();
                  setPhase('idle');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Aturar</span>
              </button>
            </div>

            {/* Dual-Coded Countdown Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">
                  Nivell {activeTier.id} · {activeTier.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 font-mono tabular-nums ${
                    isUrgent
                      ? 'text-rose-700 font-semibold'
                      : isWarning
                        ? 'text-amber-700 font-semibold'
                        : 'text-slate-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{(remainingMs / 1000).toFixed(1)} s</span>
                  {isUrgent && <span>· Poc temps</span>}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full origin-left transition-colors duration-150 ${
                    isUrgent ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-sky-600'
                  }`}
                  style={{ transform: `scaleX(${timeRatio})` }}
                />
              </div>
            </div>

            {/* Equation Focal Area */}
            <div className="py-8 px-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-4">
              <p className="text-xs font-medium text-slate-500">
                {currentQuestion.isIndirect ? 'Pregunta indirecta · Troba el nombre ocult' : 'Càlcul directe'}
              </p>

              {renderEquation(currentQuestion, inputValue, feedback !== null)}

              {settings.showVerbalHint && (
                <p className="text-sm text-slate-600 max-w-md mx-auto min-h-[20px]">
                  {currentQuestion.verbalPrompt}
                </p>
              )}
            </div>

            {/* Feedback Banner OR Tactile Keypad */}
            {feedback !== null ? (
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  feedback.isCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {feedback.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">
                      {feedback.isCorrect
                        ? 'Correcte!'
                        : feedback.timedOut
                          ? 'Temps esgotat'
                          : 'Resposta incorrecta'}
                    </p>
                    <p className="text-xs opacity-90 font-mono tabular-nums mt-0.5">
                      {feedback.isCorrect
                        ? `${(feedback.responseTimeMs / 1000).toFixed(2)} s · +${feedback.starsEarned} estrelles`
                        : `La resposta correcta era ${feedback.question.correctAnswer}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Següent</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="max-w-xs mx-auto grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigit(digit)}
                    className="h-13 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono tabular-nums text-xl font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Esborrar dígit"
                  className="h-13 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="h-13 rounded-xl border border-slate-200 bg-white text-slate-900 font-mono tabular-nums text-xl font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={inputValue === ''}
                  className="h-13 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 cursor-pointer"
                >
                  Comprovar
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'summary' && summary && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Ronda completada</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Nivell {summary.roundRecord.tierUsed} ·{' '}
                  {getSpeedTier(summary.roundRecord.tierUsed).name} ({summary.roundRecord.timeLimitSeconds.toFixed(1)} s)
                </p>
              </div>
              <button
                type="button"
                onClick={startRound}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nova ronda</span>
              </button>
            </div>

            {/* Key Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <p className="text-xs text-slate-500">Encerts</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {summary.roundRecord.correctCount}/{summary.roundRecord.totalQuestions}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <p className="text-xs text-slate-500">Temps mitjà</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {(summary.roundRecord.avgResponseTimeMs / 1000).toFixed(2)} s
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <p className="text-xs text-slate-500">Millor ratxa</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {summary.roundRecord.bestStreak}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <p className="text-xs text-amber-800">Estrelles guanyades</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                  +{summary.roundRecord.starsEarned}
                </p>
              </div>
            </div>

            {/* Time Progression Notification */}
            {summary.promotedToTier ? (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-sky-700 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sky-950 text-sm">
                    Progressió temporal assolida: Nivell {summary.promotedToTier} —{' '}
                    {getSpeedTier(summary.promotedToTier).name}
                  </p>
                  <p className="text-xs text-sky-800 mt-1">
                    A la propera ronda disposaràs de{' '}
                    <span className="font-mono font-semibold">
                      {getSpeedTier(summary.promotedToTier).secondsPerQuestion.toFixed(1)} s
                    </span>{' '}
                    per pregunta per continuar automatitzant el càlcul.
                  </p>
                </div>
              </div>
            ) : (
              summary.roundRecord.tierUsed < 5 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    Aconsegueix almenys un{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {Math.round(getSpeedTier(summary.roundRecord.tierUsed).promotionAccuracy * 100)}%
                    </span>{' '}
                    d’encerts dins del temps límit per pujar al Nivell {summary.roundRecord.tierUsed + 1}.
                  </span>
                </div>
              )
            )}

            {/* Newly Unlocked Badges */}
            {summary.newlyUnlockedBadges.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <p className="text-sm font-semibold text-amber-950">Noves medalles desbloquejades</p>
                <div className="flex flex-wrap gap-3">
                  {summary.newlyUnlockedBadges.map((badgeId) => {
                    const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
                    if (!badge) return null;
                    return (
                      <div
                        key={badgeId}
                        className="px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs"
                      >
                        <p className="font-semibold text-slate-900">{badge.title}</p>
                        <p className="text-slate-500">{badge.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Question Review List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex justify-between">
                <span>Repàs de la ronda</span>
                <span>Temps i resultat</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {summary.outcomes.map((item, idx) => {
                  const q = item.question;
                  const leftText = q.missingSlot === 'first' ? `[${q.leftOperand}]` : q.leftOperand;
                  const rightText = q.missingSlot === 'second' ? `[${q.rightOperand}]` : q.rightOperand;
                  const resText = q.missingSlot === 'result' ? `[${q.result}]` : q.result;

                  return (
                    <div
                      key={q.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-mono tabular-nums w-5">
                          {idx + 1}.
                        </span>
                        <span className="font-mono tabular-nums font-medium text-slate-900">
                          {leftText} {OPERATION_SYMBOLS[q.operation]} {rightText} = {resText}
                        </span>
                        {q.isIndirect && (
                          <span className="text-xs text-sky-700">Indirecta</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 font-mono tabular-nums text-xs">
                        <span className="text-slate-500">
                          {(item.responseTimeMs / 1000).toFixed(2)} s
                        </span>
                        {item.isCorrect ? (
                          <span className="text-emerald-700 font-semibold">Correcte</span>
                        ) : item.timedOut ? (
                          <span className="text-rose-700 font-semibold">Temps</span>
                        ) : (
                          <span className="text-rose-700 font-semibold">
                            Vas dir {item.userAnswer}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT / CONFIGURATION & TIME LADDER DECK (5 cols) */}
      <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Configuració de la pràctica</h3>
          <span className="text-xs text-slate-500">Nombres &lt; 12</span>
        </div>

        {/* Operations Selector */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-slate-700">
            Operacions actives
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['sum', 'diff', 'mul'] as OperationType[]).map((op) => {
              const active = settings.operations.includes(op);
              return (
                <button
                  key={op}
                  type="button"
                  disabled={phase === 'playing'}
                  onClick={() => toggleOperation(op)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    active
                      ? 'bg-sky-50 border-sky-300 text-sky-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {OPERATION_LABELS[op]} ({OPERATION_SYMBOLS[op]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Mode (Direct vs Indirect vs Mixed) */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-slate-700">
            Tipus de preguntes
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
            {(
              [
                { id: 'direct', label: 'Directes' },
                { id: 'indirect', label: 'Indirectes' },
                { id: 'mixed', label: 'Mixtes' },
              ] as { id: QuestionMode; label: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                disabled={phase === 'playing'}
                onClick={() => onUpdateSettings({ ...settings, questionMode: mode.id })}
                className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 ${
                  settings.questionMode === mode.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Les preguntes indirectes amaguen un terme (p. ex.{' '}
            <span className="font-mono text-slate-700">2 × ? = 6</span>) perquè l’alumne dedueixi el{' '}
            <span className="font-mono text-slate-700">3</span>.
          </p>
        </div>

        {/* Max Operand Slider (Strictly < 12) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="max-operand-range" className="font-semibold text-slate-700">
              Nombre màxim dels termes
            </label>
            <span className="font-mono tabular-nums font-semibold text-sky-700">
              Fins a {settings.maxOperand} (sempre &lt; 12)
            </span>
          </div>
          <input
            id="max-operand-range"
            type="range"
            min={5}
            max={11}
            step={1}
            disabled={phase === 'playing'}
            value={settings.maxOperand}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                maxOperand: Number(e.target.value),
              })
            }
            className="w-full accent-sky-600 cursor-pointer disabled:opacity-60"
          />
          <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
            <span>5</span>
            <span>7</span>
            <span>9</span>
            <span>11 (màx &lt; 12)</span>
          </div>
        </div>

        {/* Time Progression Ladder */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Progressió respecte el temps
            </span>
            <button
              type="button"
              disabled={phase === 'playing'}
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  adaptiveProgression: !settings.adaptiveProgression,
                })
              }
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer disabled:opacity-60 ${
                settings.adaptiveProgression
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {settings.adaptiveProgression ? 'Automàtica: Activa' : 'Selecció manual'}
            </button>
          </div>

          <div className="space-y-1.5">
            {SPEED_TIERS.map((tier) => {
              const unlocked = tier.id <= profile.highestUnlockedTier;
              const isSelected = activeTierId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  disabled={phase === 'playing' || !unlocked}
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      adaptiveProgression: false,
                      selectedTier: tier.id,
                    })
                  }
                  className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? 'bg-sky-50 border-sky-300 text-sky-950'
                      : unlocked
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
                        : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      Nivell {tier.id} · {tier.name}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-semibold shrink-0">
                    {unlocked ? `${tier.secondsPerQuestion.toFixed(1)} s` : 'Bloquejat'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Round Length & Verbal Hint Toggle */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-600 mr-1">Ronda:</span>
            {([10, 15, 20] as const).map((count) => (
              <button
                key={count}
                type="button"
                disabled={phase === 'playing'}
                onClick={() => onUpdateSettings({ ...settings, questionsPerRound: count })}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums font-semibold border transition-colors cursor-pointer disabled:opacity-60 ${
                  settings.questionsPerRound === count
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {count}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ ...settings, showVerbalHint: !settings.showVerbalHint })
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guia verbal: {settings.showVerbalHint ? 'Sí' : 'No'}</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
