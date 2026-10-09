import type {
  AttackAnalysis,
  CoverageRecommendation,
  DefenseAnalysis,
  Effect,
  RecommendationResult,
  TypeChartData,
  TypeId,
} from '../types';

export const MAX_ADDITIONS = 10;
export const RECOMMENDATION_LIMIT = 10;

export function getTypeDefinition(
  data: TypeChartData,
  typeId: TypeId,
) {
  return data.types.find((type) => type.id === typeId);
}

export function getEffect(
  data: TypeChartData,
  attackId: TypeId,
  defenseId: TypeId,
): Effect {
  return data.matrix[attackId]?.[defenseId] ?? 'neutral';
}

export function getEffectLabel(effect: Effect): string {
  switch (effect) {
    case 'strong':
      return '克制';
    case 'weak':
      return '抵抗';
    default:
      return '普通';
  }
}

export function getEffectSymbol(effect: Effect): string {
  switch (effect) {
    case 'strong':
      return '2×';
    case 'weak':
      return '½×';
    default:
      return '1×';
  }
}

export function getTargetsByEffect(
  data: TypeChartData,
  attackId: TypeId,
  effect: Effect,
): TypeId[] {
  return data.types
    .filter((defenseType) => getEffect(data, attackId, defenseType.id) === effect)
    .map((defenseType) => defenseType.id);
}

/**
 * 防守视角查询：
 * 直接读取 matrix[attackId][defenseId]，
 * 不生成 matrix 的转置矩阵。
 */
export function getAttackersByEffect(
  data: TypeChartData,
  defenseId: TypeId,
  effect: Effect,
): TypeId[] {
  return data.types
    .filter((attackType) => getEffect(data, attackType.id, defenseId) === effect)
    .map((attackType) => attackType.id);
}

export function analyzeAttackSelection(
  data: TypeChartData,
  selectedAttackIds: TypeId[],
): AttackAnalysis {
  const validIds = new Set(data.types.map((type) => type.id));

  const selected = [
    ...new Set(selectedAttackIds.filter((id) => validIds.has(id))),
  ];

  const sourceMap = Object.fromEntries(
    data.types.map((type) => [type.id, [] as TypeId[]]),
  ) as Record<TypeId, TypeId[]>;

  for (const attackId of selected) {
    const strongTargets = getTargetsByEffect(data, attackId, 'strong');

    for (const targetId of strongTargets) {
      sourceMap[targetId].push(attackId);
    }
  }

  const sourceCounts = Object.fromEntries(
    data.types.map((type) => [type.id, sourceMap[type.id].length]),
  ) as Record<TypeId, number>;

  const perAttack = selected.map((attackId) => {
    const strongTargets = getTargetsByEffect(data, attackId, 'strong');
    const resistedTargets = getTargetsByEffect(data, attackId, 'weak');

    return {
      typeId: attackId,
      strongTargets,
      resistedTargets,
      independentTargets: strongTargets.filter(
        (targetId) => sourceMap[targetId].length === 1,
      ),
    };
  });

  const coverage = data.types
    .filter((type) => sourceCounts[type.id] > 0)
    .map((type) => type.id);

  const uncovered = data.types
    .filter((type) => sourceCounts[type.id] === 0)
    .map((type) => type.id);

  const allResisted =
    selected.length === 0
      ? []
      : data.types
          .filter((defenseType) =>
            selected.every(
              (attackId) =>
                getEffect(data, attackId, defenseType.id) === 'weak',
            ),
          )
          .map((defenseType) => defenseType.id);

  return {
    selected,
    perAttack,
    coverage,
    uncovered,
    allResisted,
    sourceCounts,
  };
}

export function analyzeDefenseSelection(
  data: TypeChartData,
  selectedDefenseIds: TypeId[],
): DefenseAnalysis {
  const validIds = new Set(data.types.map((type) => type.id));

  const selected = [
    ...new Set(selectedDefenseIds.filter((id) => validIds.has(id))),
  ];

  const perDefense = selected.map((defenseId) => ({
    typeId: defenseId,
    weaknesses: getAttackersByEffect(data, defenseId, 'strong'),
    resistances: getAttackersByEffect(data, defenseId, 'weak'),
  }));

  const sharedWeaknesses =
    selected.length === 0
      ? []
      : data.types
          .filter((attackType) =>
            selected.every(
              (defenseId) =>
                getEffect(data, attackType.id, defenseId) === 'strong',
            ),
          )
          .map((attackType) => attackType.id);

  const sharedResistances =
    selected.length === 0
      ? []
      : data.types
          .filter((attackType) =>
            selected.every(
              (defenseId) =>
                getEffect(data, attackType.id, defenseId) === 'weak',
            ),
          )
          .map((attackType) => attackType.id);

  return {
    selected,
    perDefense,
    sharedWeaknesses,
    sharedResistances,
  };
}

function calculateBalanceScore(counts: number[]): number {
  if (counts.length === 0) {
    return 0;
  }

  const average =
    counts.reduce((total, count) => total + count, 0) / counts.length;

  const variance =
    counts.reduce(
      (total, count) => total + (count - average) ** 2,
      0,
    ) / counts.length;

  return 1 / (1 + variance);
}

function compareRecommendations(
  left: CoverageRecommendation,
  right: CoverageRecommendation,
): number {
  if (left.complete !== right.complete) {
    return left.complete ? -1 : 1;
  }

  if (left.added.length !== right.added.length) {
    return left.added.length - right.added.length;
  }

  if (left.newCoverage.length !== right.newCoverage.length) {
    return right.newCoverage.length - left.newCoverage.length;
  }

  if (
    left.repeatedCoverage.length !== right.repeatedCoverage.length
  ) {
    return (
      left.repeatedCoverage.length -
      right.repeatedCoverage.length
    );
  }

  if (left.balanceScore !== right.balanceScore) {
    return right.balanceScore - left.balanceScore;
  }

  return left.added.join(',').localeCompare(right.added.join(','));
}

function pushTopRecommendations(
  target: CoverageRecommendation[],
  item: CoverageRecommendation,
): void {
  target.push(item);
  target.sort(compareRecommendations);

  if (target.length > RECOMMENDATION_LIMIT) {
    target.length = RECOMMENDATION_LIMIT;
  }
}

export function findCoverageRecommendations(
  data: TypeChartData,
  selectedAttackIds: TypeId[],
  maxAdditional = MAX_ADDITIONS,
): RecommendationResult {
  const typeIds = data.types.map((type) => type.id);
  const attackMasks = new Map<TypeId, number>();

  for (const attackId of typeIds) {
    let mask = 0;

    data.types.forEach((defenseType, index) => {
      if (getEffect(data, attackId, defenseType.id) === 'strong') {
        mask |= 1 << index;
      }
    });

    attackMasks.set(attackId, mask);
  }

  const selected = [
    ...new Set(
      selectedAttackIds.filter((attackId) => attackMasks.has(attackId)),
    ),
  ];

  const candidateIds = typeIds.filter(
    (typeId) => !selected.includes(typeId),
  );

  const fullMask = (1 << data.types.length) - 1;

  let baseMask = 0;

  for (const attackId of selected) {
    baseMask |= attackMasks.get(attackId) ?? 0;
  }

  const countSources = (attackIds: TypeId[]): number[] => {
    const counts = data.types.map(() => 0);

    for (const attackId of attackIds) {
      const mask = attackMasks.get(attackId) ?? 0;

      data.types.forEach((_, index) => {
        if ((mask & (1 << index)) !== 0) {
          counts[index] += 1;
        }
      });
    }

    return counts;
  };

  const buildRecommendation = (
    added: TypeId[],
    combinedMask: number,
  ): CoverageRecommendation => {
    const counts = countSources([...selected, ...added]);

    const newCoverage = typeIds.filter(
      (_, index) =>
        (baseMask & (1 << index)) === 0 && counts[index] > 0,
    );

    const repeatedCoverage = typeIds.filter(
      (_, index) => counts[index] > 1,
    );

    const uncovered = typeIds.filter(
      (_, index) => counts[index] === 0,
    );

    return {
      added,
      newCoverage,
      repeatedCoverage,
      uncovered,
      complete: combinedMask === fullMask,
      balanceScore: calculateBalanceScore(counts),
    };
  };

  if (baseMask === fullMask) {
    return {
      maxAdditional: 0,
      canFullyCoverWithinLimit: true,
      minimumAdditional: 0,
      recommendations: [
        buildRecommendation([], baseMask),
      ],
    };
  }

  const limit = Math.max(
    0,
    Math.min(maxAdditional, candidateIds.length),
  );

  const fullRecommendations: CoverageRecommendation[] = [];
  const partialRecommendations: CoverageRecommendation[] = [];

  let minimumFull = Number.POSITIVE_INFINITY;

  function visit(
    startIndex: number,
    added: TypeId[],
    combinedMask: number,
  ): void {
    if (combinedMask === fullMask) {
      const recommendation = buildRecommendation(
        added,
        combinedMask,
      );

      if (added.length < minimumFull) {
        minimumFull = added.length;
        fullRecommendations.length = 0;
      }

      if (added.length === minimumFull) {
        pushTopRecommendations(
          fullRecommendations,
          recommendation,
        );
      }

      return;
    }

    if (
      added.length >= limit ||
      added.length >= minimumFull
    ) {
      return;
    }

    for (
      let index = startIndex;
      index < candidateIds.length;
      index += 1
    ) {
      const nextAdded = [...added, candidateIds[index]];
      const nextMask =
        combinedMask |
        (attackMasks.get(candidateIds[index]) ?? 0);

      if (nextMask === fullMask) {
        const recommendation = buildRecommendation(
          nextAdded,
          nextMask,
        );

        if (nextAdded.length < minimumFull) {
          minimumFull = nextAdded.length;
          fullRecommendations.length = 0;
        }

        if (nextAdded.length === minimumFull) {
          pushTopRecommendations(
            fullRecommendations,
            recommendation,
          );
        }
      } else {
        pushTopRecommendations(
          partialRecommendations,
          buildRecommendation(nextAdded, nextMask),
        );

        visit(index + 1, nextAdded, nextMask);
      }
    }
  }

  visit(0, [], baseMask);

  const canFullyCoverWithinLimit =
    Number.isFinite(minimumFull);

  return {
    maxAdditional: limit,
    canFullyCoverWithinLimit,
    minimumAdditional: canFullyCoverWithinLimit
      ? minimumFull
      : null,
    recommendations: canFullyCoverWithinLimit
      ? fullRecommendations
      : partialRecommendations,
  };
}
