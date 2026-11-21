import { FormEvent, useState } from 'react';
import { Check, Plus, Trash2, UserCheck } from 'lucide-react';
import { getSpeedTier } from '../data/progression';
import { StudentProfile } from '../types/math';
import { EmblemAvatar } from './EmblemAvatar';

interface ProfilesViewProps {
  profiles: StudentProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
}

export function ProfilesView({
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
}: ProfilesViewProps) {
  const [newName, setNewName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateProfile(newName.trim());
    setNewName('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Profiles List */}
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Perfils d’alumnat</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Cada alumne manté el seu nivell temporal, les estrelles guanyades i les medalles de forma independent en aquest navegador.
          </p>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const tier = getSpeedTier(p.currentTier);
            const isConfirmingDelete = confirmDeleteId === p.id;

            return (
              <div
                key={p.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isActive ? 'bg-sky-50/50' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <EmblemAvatar emblemId={p.equippedEmblemId} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                      Nivell {tier.id} ({tier.secondsPerQuestion.toFixed(1)} s) · {p.starsBalance} estrelles ·{' '}
                      {p.totalCorrect} encerts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 text-sky-900 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      Actiu
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectProfile(p.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Seleccionar</span>
                    </button>
                  )}

                  {profiles.length > 1 && (
                    <>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteProfile(p.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel·lar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(p.id)}
                          aria-label={`Eliminar perfil ${p.name}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Create New Profile */}
      <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Afegir un nou alumne</h3>
        <p className="text-xs text-slate-500">
          Crea un perfil individual per fer seguiment propi de la progressió temporal i desbloquejar recompenses.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="student-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nom de l’alumne
            </label>
            <input
              id="student-name"
              type="text"
              maxLength={32}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Marta Soler"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={!newName.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear perfil</span>
          </button>
        </form>
      </aside>
    </div>
  );
}
