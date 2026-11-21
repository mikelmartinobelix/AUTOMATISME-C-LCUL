import { MathQuestion, MissingSlot, OperationType, PracticeSettings } from '../types/math';

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
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeightedOperand(min: number, max: number): number {
  if (max <= min) return min;
  // Slightly reduce trivial `1` frequency when higher operands are available
  if (min === 1 && max >= 4 && Math.random() < 0.88) {
    return randomInt(2, max);
  }
  return randomInt(min, max);
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

  // Multiplication indirect
  if (missingSlot === 'second') {
    return `${left} per un nombre dona ${result}. Quin nombre falta?`;
  }
  return `Un nombre per ${right} dona ${result}. Quin nombre falta?`;
}

export function generateQuestion(
  settings: PracticeSettings,
  previousSignature?: string
): { question: MathQuestion; signature: string } {
  const safeMax = Math.max(4, Math.min(11, Math.floor(settings.maxOperand))); // strictly < 12
  const activeOps: OperationType[] =
    settings.operations.length > 0 ? settings.operations : ['sum', 'diff', 'mul'];

  for (let attempt = 0; attempt < 12; attempt++) {
    const operation = activeOps[randomInt(0, activeOps.length - 1)];

    let leftOperand = 1;
    let rightOperand = 1;
    let result = 2;

    if (operation === 'sum') {
      leftOperand = pickWeightedOperand(1, safeMax);
      rightOperand = pickWeightedOperand(1, safeMax);
      result = leftOperand + rightOperand;
    } else if (operation === 'diff') {
      // Ensure leftOperand <= 11, rightOperand < leftOperand, result >= 1
      leftOperand = randomInt(2, safeMax);
      rightOperand = randomInt(1, leftOperand - 1);
      result = leftOperand - rightOperand;
    } else {
      leftOperand = pickWeightedOperand(1, safeMax);
      rightOperand = pickWeightedOperand(1, safeMax);
      result = leftOperand * rightOperand;
    }

    let missingSlot: MissingSlot = 'result';
    if (settings.questionMode === 'indirect') {
      missingSlot = Math.random() < 0.5 ? 'second' : 'first';
    } else if (settings.questionMode === 'mixed') {
      if (Math.random() < 0.5) {
        missingSlot = Math.random() < 0.5 ? 'second' : 'first';
      }
    }

    const correctAnswer =
      missingSlot === 'first'
        ? leftOperand
        : missingSlot === 'second'
          ? rightOperand
          : result;

    const signature = `${operation}:${leftOperand}:${rightOperand}:${missingSlot}`;
    if (signature !== previousSignature || attempt === 11) {
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

  // Unreachable fallback
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
