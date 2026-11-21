import { useCallback, useEffect, useMemo, useState } from 'react';
import { PracticeArena } from './components/PracticeArena';
import { ProfilesView } from './components/ProfilesView';
import { ProgressionView } from './components/ProgressionView';
import { RewardsView } from './components/RewardsView';
import {
  AppTab,
  OperationType,
  PracticeSettings,
  QuestionMode,
  QuestionOutcome,
  SpeedTierId,
} from './types/math';
import {
  applyRoundResults,
  createStudentProfile,
  loadStoredState,
  saveStoredState,
} from './utils/storage';

function loadInitialStateWithQueryParams() {
  const initial = loadStoredState();
  if (typeof window === 'undefined') return initial;

  const params = new URLSearchParams(window.location.search);
  const opsParam = params.get('ops');
  const modeParam = params.get('mode');
  const tierParam = params.get('tier');
  const qParam = params.get('q');

  if (!opsParam && !modeParam && !tierParam && !qParam) {
    return initial;
  }

  const nextSettings = { ...initial.settings };
  if (opsParam) {
    const validOps = opsParam
      .split(',')
      .filter((op): op is OperationType => op === 'sum' || op === 'diff' || op === 'mul');
    if (validOps.length > 0) {
      nextSettings.operations = Array.from(new Set(validOps));
    }
  }
  if (modeParam === 'direct' || modeParam === 'indirect' || modeParam === 'mixed') {
    nextSettings.questionMode = modeParam as QuestionMode;
  }
  if (qParam === '10' || qParam === '15' || qParam === '20') {
    nextSettings.questionsPerRound = Number(qParam) as 10 | 15 | 20;
  }

  let nextProfiles = initial.profiles;
  if (tierParam) {
    const parsedTier = Number(tierParam);
    if (parsedTier >= 1 && parsedTier <= 5) {
      const targetTier = parsedTier as SpeedTierId;
      nextSettings.selectedTier = targetTier;
      nextProfiles = initial.profiles.map((p) =>
        p.id === initial.activeProfileId
          ? {
              ...p,
              highestUnlockedTier: Math.max(p.highestUnlockedTier, targetTier) as SpeedTierId,
              currentTier: targetTier,
            }
          : p
      );
    }
  }

  return {
    ...initial,
    profiles: nextProfiles,
    settings: nextSettings,
  };
}

export default function App() {
  const [store, setStore] = useState(() => loadInitialStateWithQueryParams());
  const [activeTab, setActiveTab] = useState<AppTab>('practice');
  const [startSignal, setStartSignal] = useState(0);

  useEffect(() => {
    saveStoredState(store);
  }, [store]);

  const activeProfile = useMemo(() => {
    return (
      store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0]
    );
  }, [store.activeProfileId, store.profiles]);

  const handleUpdateSettings = useCallback((nextSettings: PracticeSettings) => {
    setStore((prev) => ({
      ...prev,
      settings: nextSettings,
    }));
  }, []);

  const handleCompleteRound = useCallback(
    (outcomes: QuestionOutcome[], tierUsed: SpeedTierId) => {
      const current =
        store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0];
      const result = applyRoundResults(current, outcomes, store.settings, tierUsed);

      setStore((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === current.id ? result.updatedProfile : p
        ),
        settings:
          result.promotedToTier && prev.settings.adaptiveProgression
            ? { ...prev.settings, selectedTier: result.promotedToTier }
            : prev.settings,
      }));

      return {
        roundRecord: result.roundRecord,
        newlyUnlockedBadges: result.newlyUnlockedBadges,
        promotedToTier: result.promotedToTier,
      };
    },
    [store.activeProfileId, store.profiles, store.settings]
  );

  const handleUnlockEmblem = useCallback((emblemId: string, costStars: number) => {
    setStore((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => {
        if (p.id !== prev.activeProfileId) return p;
        if (p.unlockedEmblems.includes(emblemId) || p.starsBalance < costStars) return p;
        return {
          ...p,
          starsBalance: p.starsBalance - costStars,
          unlockedEmblems: [...p.unlockedEmblems, emblemId],
          equippedEmblemId: emblemId,
        };
      }),
    }));
  }, []);

  const handleEquipEmblem = useCallback((emblemId: string) => {
    setStore((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => {
        if (p.id !== prev.activeProfileId) return p;
        if (!p.unlockedEmblems.includes(emblemId)) return p;
        return { ...p, equippedEmblemId: emblemId };
      }),
    }));
  }, []);

  const handleSelectProfile = useCallback((id: string) => {
    setStore((prev) => ({ ...prev, activeProfileId: id }));
  }, []);

  const handleCreateProfile = useCallback((name: string) => {
    const profile = createStudentProfile(name);
    setStore((prev) => ({
      ...prev,
      activeProfileId: profile.id,
      profiles: [...prev.profiles, profile],
    }));
  }, []);

  const handleDeleteProfile = useCallback((id: string) => {
    setStore((prev) => {
      if (prev.profiles.length <= 1) return prev;
      const remaining = prev.profiles.filter((p) => p.id !== id);
      const nextActive =
        prev.activeProfileId === id ? remaining[0].id : prev.activeProfileId;
      return {
        ...prev,
        activeProfileId: nextActive,
        profiles: remaining,
      };
    });
  }, []);

  const handlePrimaryPracticeAction = () => {
    setActiveTab('practice');
    setStartSignal((n) => n + 1);
  };

  const navItems: { id: AppTab; label: string }[] = [
    { id: 'practice', label: 'Practicar' },
    { id: 'progression', label: 'Progressió' },
    { id: 'rewards', label: 'Recompenses' },
    { id: 'profiles', label: 'Perfils' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Brand wordmark — Nav links — 1 primary action */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#practicar"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('practice');
            }}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            CalculaRàpid
          </a>

          <nav className="flex items-center gap-5 sm:gap-7 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    isActive
                      ? 'text-sky-700 border-sky-600 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden sm:flex items-center shrink-0">
            <button
              type="button"
              onClick={handlePrimaryPracticeAction}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Nova ronda
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'practice' && 'Entrenament d’automatismes'}
              {activeTab === 'progression' && 'Progressió temporal i domini'}
              {activeTab === 'rewards' && 'Sistema de recompenses'}
              {activeTab === 'profiles' && 'Gestió de perfils'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            {activeProfile.name} · {activeProfile.starsBalance} estrelles
          </p>
        </div>

        {activeTab === 'practice' && (
          <PracticeArena
            profile={activeProfile}
            settings={store.settings}
            onUpdateSettings={handleUpdateSettings}
            onCompleteRound={handleCompleteRound}
            externalStartSignal={startSignal}
          />
        )}

        {activeTab === 'progression' && <ProgressionView profile={activeProfile} />}

        {activeTab === 'rewards' && (
          <RewardsView
            profile={activeProfile}
            onUnlockEmblem={handleUnlockEmblem}
            onEquipEmblem={handleEquipEmblem}
          />
        )}

        {activeTab === 'profiles' && (
          <ProfilesView
            profiles={store.profiles}
            activeProfileId={activeProfile.id}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateProfile}
            onDeleteProfile={handleDeleteProfile}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>CalculaRàpid · Sumes, diferències i multiplicacions (&lt; 12)</span>
          <span>Progrés guardat localment al navegador</span>
        </div>
      </footer>
    </div>
  );
}
