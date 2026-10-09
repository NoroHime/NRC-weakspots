export type TypeId = string;

export type Effect = 'strong' | 'neutral' | 'weak';

export interface TypeDefinition {
  id: TypeId;
  name: string;
  color: string;
}

export interface SourceEntry {
  name: string;
  url: string;
  accessedAt: string;
  description?: string;
}

export interface TypeChartData {
  version: string;
  updatedAt: string;
  source: SourceEntry[];
  notes: string[];
  matrixAxes: {
    rows: 'attack' | 'defense';
    columns: 'attack' | 'defense';
  };
  types: TypeDefinition[];
  matrix: Record<TypeId, Record<TypeId, Effect>>;
}

export interface AttackDetail {
  typeId: TypeId;
  strongTargets: TypeId[];
  resistedTargets: TypeId[];
  independentTargets: TypeId[];
}

export interface AttackAnalysis {
  selected: TypeId[];
  perAttack: AttackDetail[];
  coverage: TypeId[];
  uncovered: TypeId[];
  allResisted: TypeId[];
  sourceCounts: Record<TypeId, number>;
}

export interface DefenseDetail {
  typeId: TypeId;
  weaknesses: TypeId[];
  resistances: TypeId[];
}

export interface DefenseAnalysis {
  selected: TypeId[];
  perDefense: DefenseDetail[];
  sharedWeaknesses: TypeId[];
  sharedResistances: TypeId[];
}

export interface CoverageRecommendation {
  added: TypeId[];
  newCoverage: TypeId[];
  repeatedCoverage: TypeId[];
  uncovered: TypeId[];
  complete: boolean;
  balanceScore: number;
}

export interface RecommendationResult {
  maxAdditional: number;
  canFullyCoverWithinLimit: boolean;
  minimumAdditional: number | null;
  recommendations: CoverageRecommendation[];
}
