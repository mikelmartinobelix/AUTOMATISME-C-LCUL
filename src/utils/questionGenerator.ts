import { getSpeedTier } from '../data/progression';
import {
  MathQuestion,
  MissingSlot,
  OperationType,
  PracticeSettings,
  SpeedTierId,
} from '../types/math';

export const OPERATION_LABELS: Record<OperationType, string> = {
  sum: 'Sumes',
  diff: 'Diferències',
  mul: 'Multiplicacions',
};

export const OPERATION_SYMBOLS: Record<OperationType, string> = {
  sum: '+',
  diff: '−',
  mul: '×',
};

function randomInt(min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOperand(min: number, max: number, tierId: SpeedTierId): number {
  const safeMin = Math.max(1, Math.min(10, min));
  const safeMax = Math.max(safeMin, Math.min(11, max));

  // In lower tiers, occasionally allow 1; in higher tiers favor 2..11
  if (safeMin === 1 && safeMax >= 4 && tierId >= 2 && Math.random() < 0.9) {
    return randomInt(2, safeMax);
  }
  return randomInt(safeMin, safeMax);
}

function buildVerbalPrompt(
  operation: OperationType,
  left: number,
  right: number,
  result: number,
  missingSlot: MissingSlot
): string {
  if (missingSlot === 'result') {
    if (operation === 'sum') return `Quant és ${left} més ${right}?`;
    if (operation === 'diff') return `Quina diferència hi ha entre ${left} i ${right}?`;
    return `Quant és ${left} per ${right}?`;
  }

  if (operation === 'sum') {
    if (missingSlot === 'second') {
      return `${left} més quin nombre dona ${result}?`;
    }
    return `Quin nombre més ${right} dona ${result}?`;
  }

  if (operation === 'diff') {
    if (missingSlot === 'second') {
      return `Si a ${left} li treus quin nombre queda ${result}?`;
    }
    return `A quin nombre li has de treure ${right} per obtenir ${result}?`;
  }

  if (missingSlot === 'second') {
    return `${left} per un nombre dona ${result}. Quin nombre falta?`;
  }
  return `Un nombre per ${right} dona ${result}. Quin nombre falta?`;
}

export function generateQuestion(
  settings: PracticeSettings,
  tierId: SpeedTierId = 1,
  previousSignature?: string
): { question: MathQuestion; signature: string } {
  const tier = getSpeedTier(tierId);

  const minOp = settings.useDifficultyComplexity ? tier.minOperand : 1;
  const maxOp = settings.useDifficultyComplexity
    ? Math.min(11, tier.maxOperand)
    : Math.max(4, Math.min(11, Math.floor(settings.maxOperand))); // strictly < 12
  const maxMulProduct = settings.useDifficultyComplexity ? tier.maxMulProduct : 121;
  const allowFirstSlot = settings.useDifficultyComplexity ? tier.allowFirstSlotIndirect : true;
  const mixedIndirectRate = settings.useDifficultyComplexity ? tier.mixedIndirectRate : 0.5;

  const activeOps: OperationType[] =
    settings.operations.length > 0 ? settings.operations : ['sum', 'diff', 'mul'];

  for (let attempt = 0; attempt < 20; attempt++) {
    const operation = activeOps[randomInt(0, activeOps.length - 1)];

    let leftOperand = 1;
    let rightOperand = 1;
    let result = 2;

    if (operation === 'sum') {
      leftOperand = pickOperand(minOp, maxOp, tierId);
      rightOperand = pickOperand(minOp, maxOp, tierId);
      result = leftOperand + rightOperand;
    } else if (operation === 'diff') {
      // Ensure leftOperand <= 11, rightOperand < leftOperand, result >= 1
      const minLeft = Math.max(3, minOp + 1);
      const effectiveMaxLeft = Math.min(11, Math.max(minLeft, maxOp));
      leftOperand = randomInt(minLeft, effectiveMaxLeft);
      const minRight = Math.min(leftOperand - 1, Math.max(1, Math.floor(minOp / 2)));
      rightOperand = randomInt(minRight, leftOperand - 1);
      result = leftOperand - rightOperand;
    } else {
      leftOperand = pickOperand(minOp, maxOp, tierId);
      rightOperand = pickOperand(minOp, maxOp, tierId);
      // Enforce tier's product complexity cap while ensuring factors stay < 12
      if (leftOperand * rightOperand > maxMulProduct) {
        const cappedRight = Math.max(1, Math.min(11, Math.floor(maxMulProduct / leftOperand)));
        rightOperand = randomInt(Math.min(minOp, cappedRight), cappedRight);
      }
      result = leftOperand * rightOperand;
    }

    // Determine whether question is indirect and which operand is hidden
    let isIndirect = false;
    if (settings.questionMode === 'indirect') {
      isIndirect = true;
    } else if (settings.questionMode === 'mixed') {
      isIndirect = Math.random() < mixedIndirectRate;
    }

    let missingSlot: MissingSlot = 'result';
    if (isIndirect) {
      if (!allowFirstSlot) {
        missingSlot = 'second';
      } else {
        // Higher tiers introduce more first-slot unknowns (e.g. ? - 4 = 7, ? x 8 = 72)
        const firstSlotProbability = tierId >= 4 ? 0.52 : 0.4;
        missingSlot = Math.random() < firstSlotProbability ? 'first' : 'second';
      }
    }

    const correctAnswer =
      missingSlot === 'first'
        ? leftOperand
        : missingSlot === 'second'
          ? rightOperand
          : result;

    // Guarantee every operand is strictly < 12
    if (leftOperand >= 12 || rightOperand >= 12) {
      continue;
    }

    const signature = `${operation}:${leftOperand}:${rightOperand}:${missingSlot}`;
    if (signature !== previousSignature || attempt === 19) {
      return {
        signature,
        question: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          operation,
          leftOperand,
          rightOperand,
          result,
          missingSlot,
          correctAnswer,
          isIndirect: missingSlot !== 'result',
          verbalPrompt: buildVerbalPrompt(
            operation,
            leftOperand,
            rightOperand,
            result,
            missingSlot
          ),
        },
      };
    }
  }

  return {
    signature: 'mul:2:3:second',
    question: {
      id: `${Date.now()}-fallback`,
      operation: 'mul',
      leftOperand: 2,
      rightOperand: 3,
      result: 6,
      missingSlot: 'second',
      correctAnswer: 3,
      isIndirect: true,
      verbalPrompt: '2 per un nombre dona 6. Quin nombre falta?',
    },
  };
}
