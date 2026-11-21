import { CheckCircle2, Clock, Lock } from 'lucide-react';
import { SPEED_TIERS, getSpeedTier } from '../data/progression';
import { OperationType, StudentProfile } from '../types/math';
import { OPERATION_LABELS, OPERATION_SYMBOLS } from '../utils/questionGenerator';

interface ProgressionViewProps {
  profile: StudentProfile;
}

export function ProgressionView({ profile }: ProgressionViewProps) {
  const globalAccuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.totalCorrect / profile.totalQuestionsAnswered) * 100)
      : 0;

  const indirectAccuracy =
    profile.indirectTotal > 0
      ? Math.round((profile.indirectCorrect / profile.indirectTotal) * 100)
      : 0;

  const currentTier = getSpeedTier(profile.currentTier);

  return (
    <div className="space-y-8">
      {/* Top Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Precisió global</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {globalAccuracy}%
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {profile.totalCorrect} de {profile.totalQuestionsAnswered} respostes
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Preguntes indirectes</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {indirectAccuracy}%
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {profile.indirectCorrect} de {profile.indirectTotal} encerts
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Nivell de temps actual</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-sky-700 mt-1.5">
            {currentTier.secondsPerQuestion.toFixed(1)} s
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Nivell {currentTier.id} · {currentTier.name}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Millor ratxa</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {profile.bestStreak}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {profile.perfectRounds} rondes impecables
          </p>
        </div>
      </div>

      {/* Time Progression Ladder */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Escala de progressió temporal
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              A mesura que consolides la precisió, el temps disponible per resposta es redueix fins a l’automatisme.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SPEED_TIERS.map((tier) => {
            const unlocked = tier.id <= profile.highestUnlockedTier;
            const isCurrent = tier.id === profile.currentTier;

            return (
              <div
                key={tier.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? 'bg-sky-50 border-sky-300'
                    : unlocked
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-200/70 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Nivell {tier.id} · {tier.difficultyLabel}
                  </span>
                  {unlocked ? (
                    <CheckCircle2
                      className={`w-4 h-4 ${isCurrent ? 'text-sky-600' : 'text-emerald-600'}`}
                    />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <div>
                  <p className="text-base font-bold text-slate-900">{tier.name}</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1">
                    {tier.secondsPerQuestion.toFixed(1)} s
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-700">{tier.complexitySummary}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{tier.description}</p>
                </div>

                <p className="text-[11px] font-mono tabular-nums text-slate-500 pt-2 border-t border-slate-100">
                  Objectiu pas: {Math.round(tier.promotionAccuracy * 100)}%
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Operations & Number Mastery (<12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Rendiment per operació</h2>

          <div className="space-y-3">
            {(['sum', 'diff', 'mul'] as OperationType[]).map((op) => {
              const stat = profile.operationStats[op];
              const acc = stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;
              const avgSec =
                stat.attempts > 0 ? (stat.totalTimeMs / stat.attempts / 1000).toFixed(2) : '—';

              return (
                <div key={op} className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">
                      {OPERATION_LABELS[op]} ({OPERATION_SYMBOLS[op]})
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {stat.attempts} preguntes · {avgSec} s mitjana
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600 rounded-full"
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 font-mono tabular-nums">
                    <span>{stat.correct} encerts</span>
                    <span className="font-semibold text-slate-700">{acc}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Domini dels nombres (1–11)</h2>
            <span className="text-xs text-slate-500">Tots els termes són menors que 12</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 11 }, (_, idx) => idx + 1).map((num) => {
              const data = profile.numberMastery[num] ?? {
                attempts: 0,
                correct: 0,
                totalTimeMs: 0,
              };
              const acc =
                data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : null;
              const avgSec =
                data.attempts > 0 ? (data.totalTimeMs / data.attempts / 1000).toFixed(1) : null;

              const statusLabel =
                acc === null
                  ? 'Sense dades'
                  : acc >= 85 && data.attempts >= 5
                    ? 'Consolidat'
                    : acc >= 65
                      ? 'En progrés'
                      : 'A reforçar';

              const statusColor =
                acc === null
                  ? 'border-slate-200 bg-slate-50/70'
                  : acc >= 85 && data.attempts >= 5
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : acc >= 65
                      ? 'border-sky-200 bg-sky-50/40'
                      : 'border-amber-200 bg-amber-50/50';

              return (
                <div key={num} className={`p-3.5 rounded-xl border ${statusColor}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                      {num}
                    </span>
                    <span className="text-xs font-mono tabular-nums font-semibold text-slate-700">
                      {acc !== null ? `${acc}%` : '—'}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 mt-1.5">{statusLabel}</p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                    {data.attempts > 0 ? `${data.attempts} veg · ${avgSec} s` : '0 vegades'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent Rounds Table */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Historial de rondes recents</h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Últimes {profile.roundHistory.length} rondes
          </span>
        </div>

        {profile.roundHistory.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Encara no has completat cap ronda. Inicia una pràctica per registrar la teva progressió temporal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Data</th>
                  <th className="py-3 px-4">Operacions</th>
                  <th className="py-3 px-4">Modalitat</th>
                  <th className="py-3 px-4">Nivell temps</th>
                  <th className="py-3 px-4">Encerts</th>
                  <th className="py-3 px-4">Temps mitjà</th>
                  <th className="py-3 px-6 text-right">Estrelles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-xs sm:text-sm">
                {profile.roundHistory.map((round) => {
                  const formattedDate = new Intl.DateTimeFormat('ca-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(round.timestamp);

                  const modeLabel =
                    round.questionMode === 'direct'
                      ? 'Directes'
                      : round.questionMode === 'indirect'
                        ? 'Indirectes'
                        : 'Mixtes';

                  return (
                    <tr key={round.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-6 text-slate-600 font-sans">{formattedDate}</td>
                      <td className="py-3 px-4 text-slate-800 font-sans">
                        {round.operations.map((op) => OPERATION_SYMBOLS[op]).join(' · ')}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-sans">{modeLabel}</td>
                      <td className="py-3 px-4 text-slate-700">
                        N{round.tierUsed} ({round.timeLimitSeconds.toFixed(1)} s)
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {round.correctCount}/{round.totalQuestions}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {(round.avgResponseTimeMs / 1000).toFixed(2)} s
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-amber-700">
                        +{round.starsEarned}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
