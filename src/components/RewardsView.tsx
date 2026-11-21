import { Award, Check, Lock, Star } from 'lucide-react';
import { BADGE_DEFINITIONS, COLLECTIBLE_EMBLEMS } from '../data/progression';
import { StudentProfile } from '../types/math';
import { EmblemAvatar } from './EmblemAvatar';

interface RewardsViewProps {
  profile: StudentProfile;
  onUnlockEmblem: (emblemId: string, costStars: number) => void;
  onEquipEmblem: (emblemId: string) => void;
}

export function RewardsView({
  profile,
  onUnlockEmblem,
  onEquipEmblem,
}: RewardsViewProps) {
  const categoryLabels = {
    velocitat: 'Velocitat',
    precisio: 'Precisió',
    indirectes: 'Preguntes indirectes',
    operacions: 'Operacions',
  };

  return (
    <div className="space-y-8">
      {/* Star Balance Banner */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <EmblemAvatar emblemId={profile.equippedEmblemId} size="md" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Recompenses de {profile.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Guanya estrelles responent amb rapidesa, mantenint ratxes i resolent preguntes indirectes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div>
            <p className="text-xs text-slate-500">Estrelles disponibles</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 flex items-center gap-1.5 mt-0.5">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              {profile.starsBalance}
            </p>
          </div>
          <div className="h-10 w-px bg-slate-200" aria-hidden="true" />
          <div>
            <p className="text-xs text-slate-500">Medalles assolides</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {profile.unlockedBadges.length}/{BADGE_DEFINITIONS.length}
            </p>
          </div>
        </div>
      </section>

      {/* Collectible Emblems Showcase */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Emblemes col·leccionables</h3>
          <span className="text-xs text-slate-500">
            Bescanvia les teves estrelles per equipar un nou emblema al perfil
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLLECTIBLE_EMBLEMS.map((emblem) => {
            const isUnlocked = profile.unlockedEmblems.includes(emblem.id);
            const isEquipped = profile.equippedEmblemId === emblem.id;
            const canAfford = profile.starsBalance >= emblem.costStars;

            return (
              <div
                key={emblem.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                  isEquipped ? 'border-sky-400' : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-2">
                    <EmblemAvatar emblemId={emblem.id} size="lg" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-base">{emblem.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{emblem.subtitle}</p>
                  </div>
                </div>

                {isEquipped ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Equipat</span>
                  </div>
                ) : isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onEquipEmblem(emblem.id)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Equipar emblema
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onUnlockEmblem(emblem.id, emblem.costStars)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      canAfford
                        ? 'bg-amber-600 text-white hover:bg-amber-700 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {!canAfford && <Lock className="w-3.5 h-3.5" />}
                    <span className="font-mono tabular-nums">
                      Desbloquejar · {emblem.costStars} estrelles
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Achievement Badges */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Medalles de mèrit</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BADGE_DEFINITIONS.map((badge) => {
            const progress = badge.getProgress(profile);
            const unlocked = profile.unlockedBadges.includes(badge.id) || progress >= badge.target;
            const pct = Math.min(100, Math.round((progress / badge.target) * 100));

            return (
              <div
                key={badge.id}
                className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  unlocked
                    ? 'bg-white border-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    unlocked
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <Award className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-semibold text-slate-900 text-sm">{badge.title}</h4>
                    <span className="text-xs text-slate-500">
                      {categoryLabels[badge.category]} ·{' '}
                      <span className={unlocked ? 'text-emerald-700 font-semibold' : ''}>
                        {unlocked ? 'Aconseguida' : 'En curs'}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{badge.description}</p>

                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          unlocked ? 'bg-emerald-600' : 'bg-sky-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-mono tabular-nums text-slate-500 text-right">
                      {progress} / {badge.target}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
