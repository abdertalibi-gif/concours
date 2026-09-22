// ============================================================
// ValidatedPayload — type central Phase 2B
// ============================================================
export type FieldStatus = 'AUTO' | 'REVIEW' | 'MISSING' | 'UNSUPPORTED' | 'BLOCKED';

export interface FieldMeta {
  sourceField?: string;
  targetField: string;
  value?: unknown;
  status: FieldStatus;
  reason?: string;
  referenceId?: string | null;
  referenceLabel?: string | null;
  transformedFrom?: unknown;
  evidence?: unknown[];
}

export interface ValidatedPayload {
  entityType: string;
  payload: Record<string, unknown>;
  fields: Record<string, FieldMeta>;
  valid: boolean;
  errors: string[];
  warnings: string[];
  blocked: boolean;
  blockedReasons: string[];
}
