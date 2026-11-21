import { BadgeDefinition, EmblemDefinition, SpeedTier, SpeedTierId } from '../types/math';

export const SPEED_TIERS: SpeedTier[] = [
  {
    id: 1,
    name: 'Explorador',
    secondsPerQuestion: 10.0,
    description: 'Ritme tranquil per consolidar el càlcul amb seguretat.',
    promotionAccuracy: 0.8,
    minQuestionsForPromotion: 10,
  },
  {
    id: 2,
    name: 'Àgil',
    secondsPerQuestion: 7.5,
    description: 'Primer salt cap a la resposta automàtica sense comptar.',
    promotionAccuracy: 0.8,
    minQuestionsForPromotion: 10,
  },
  {
    id: 3,
    name: 'Ràpid',
    secondsPerQuestion: 5.5,
    description: 'Temps ajustat que entrena el reflex numèric immediat.',
    promotionAccuracy: 0.8,
    minQuestionsForPromotion: 10,
  },
  {
    id: 4,
    name: 'Llampec',
    secondsPerQuestion: 4.0,
    description: 'Velocitat alta per a operacions i incògnites dominades.',
    promotionAccuracy: 0.85,
    minQuestionsForPromotion: 10,
  },
  {
    id: 5,
    name: 'Mestre',
    secondsPerQuestion: 2.8,
    description: 'Automatisme pur d’elit sota pressió temporal.',
    promotionAccuracy: 0.9,
    minQuestionsForPromotion: 10,
  },
];

export function getSpeedTier(id: SpeedTierId): SpeedTier {
  return SPEED_TIERS.find((tier) => tier.id === id) ?? SPEED_TIERS[0];
}

export const COLLECTIBLE_EMBLEMS: EmblemDefinition[] = [
  {
    id: 'compass',
    name: 'Compàs de Precisió',
    subtitle: 'Emblema inicial d’exploració matemàtica',
    costStars: 0,
    imagePath: '/src/assets/images/reward_compass_bronze_1795263118129.jpg',
    fallbackColor: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    id: 'abacus',
    name: 'Àbac de Domini',
    subtitle: 'Desbloquejat amb constància en el càlcul',
    costStars: 120,
    imagePath: '/src/assets/images/reward_abacus_silver_1795263119487.jpg',
    fallbackColor: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'owl',
    name: 'Mussol d’Estratègia',
    subtitle: 'Símbol de raonament directe i indirecte',
    costStars: 260,
    imagePath: '/src/assets/images/reward_owl_scholar_1795263164867.jpg',
    fallbackColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'rocket',
    name: 'Coet Supersonic',
    subtitle: 'Reservat per als automatismes més veloços',
    costStars: 450,
    imagePath: '/src/assets/images/reward_rocket_master_1795263118564.jpg',
    fallbackColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_round',
    title: 'Primer Pas',
    description: 'Completa la teva primera ronda de pràctica.',
    category: 'precisio',
    target: 1,
    getProgress: (p) => Math.min(1, p.roundHistory.length),
  },
  {
    id: 'indirect_detective',
    title: 'Detectiu d’Incògnites',
    description: 'Encerta 15 preguntes indirectes (p. ex. 2 × ? = 6).',
    category: 'indirectes',
    target: 15,
    getProgress: (p) => Math.min(15, p.indirectCorrect),
  },
  {
    id: 'indirect_master',
    title: 'Mestre del Factor Ocult',
    description: 'Encerta 50 preguntes indirectes amb seguretat.',
    category: 'indirectes',
    target: 50,
    getProgress: (p) => Math.min(50, p.indirectCorrect),
  },
  {
    id: 'perfect_round',
    title: 'Ronda Impecable',
    description: 'Completa una ronda sencera sense cap errada.',
    category: 'precisio',
    target: 1,
    getProgress: (p) => Math.min(1, p.perfectRounds),
  },
  {
    id: 'streak_12',
    title: 'Ratxa Imparable',
    description: 'Aconsegueix 12 encerts consecutius dins del temps.',
    category: 'precisio',
    target: 12,
    getProgress: (p) => Math.min(12, p.bestStreak),
  },
  {
    id: 'tier_3',
    title: 'Reflex Ràpid',
    description: 'Desbloqueja el Nivell 3 de temps (5.5 segons).',
    category: 'velocitat',
    target: 3,
    getProgress: (p) => Math.min(3, p.highestUnlockedTier),
  },
  {
    id: 'tier_5',
    title: 'Mestre del Temps',
    description: 'Arriba al Nivell 5 d’automatisme (2.8 segons).',
    category: 'velocitat',
    target: 5,
    getProgress: (p) => Math.min(5, p.highestUnlockedTier),
  },
  {
    id: 'sum_expert',
    title: 'Domini de les Sumes',
    description: 'Encerta 40 sumes amb nombres menors que 12.',
    category: 'operacions',
    target: 40,
    getProgress: (p) => Math.min(40, p.operationStats.sum.correct),
  },
  {
    id: 'diff_expert',
    title: 'Domini de les Diferències',
    description: 'Encerta 40 diferències amb nombres menors que 12.',
    category: 'operacions',
    target: 40,
    getProgress: (p) => Math.min(40, p.operationStats.diff.correct),
  },
  {
    id: 'mul_expert',
    title: 'Domini de les Multiplicacions',
    description: 'Encerta 40 multiplicacions amb factors menors que 12.',
    category: 'operacions',
    target: 40,
    getProgress: (p) => Math.min(40, p.operationStats.mul.correct),
  },
];
