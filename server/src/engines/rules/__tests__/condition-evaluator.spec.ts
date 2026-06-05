import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConditionEvaluator } from '../condition-evaluator';

describe('ConditionEvaluator', () => {
  const evaluator = new ConditionEvaluator();

  describe('leaf operators', () => {
    it('equals — matches when values are equal', () => {
      expect(evaluator.evaluate({ operator: 'equals', field: 'grade', value: 'A' }, { grade: 'A' })).toBe(true);
      expect(evaluator.evaluate({ operator: 'equals', field: 'grade', value: 'B' }, { grade: 'A' })).toBe(false);
    });

    it('not_equals — matches when values differ', () => {
      expect(evaluator.evaluate({ operator: 'not_equals', field: 'grade', value: 'F' }, { grade: 'A' })).toBe(true);
      expect(evaluator.evaluate({ operator: 'not_equals', field: 'grade', value: 'A' }, { grade: 'A' })).toBe(false);
    });

    it('gte/lte — numeric comparisons', () => {
      expect(evaluator.evaluate({ operator: 'gte', field: 'score', value: 80 }, { score: 85 })).toBe(true);
      expect(evaluator.evaluate({ operator: 'gte', field: 'score', value: 80 }, { score: 75 })).toBe(false);
      expect(evaluator.evaluate({ operator: 'lte', field: 'score', value: 100 }, { score: 95 })).toBe(true);
    });

    it('between — inclusive range check', () => {
      expect(evaluator.evaluate({ operator: 'between', field: 'score', value: [60, 79] }, { score: 75 })).toBe(true);
      expect(evaluator.evaluate({ operator: 'between', field: 'score', value: [60, 79] }, { score: 59 })).toBe(false);
      expect(evaluator.evaluate({ operator: 'between', field: 'score', value: [60, 79] }, { score: 80 })).toBe(false);
    });

    it('in — checks membership in array', () => {
      expect(evaluator.evaluate({ operator: 'in', field: 'subject', value: ['Math', 'Science'] }, { subject: 'Math' })).toBe(true);
      expect(evaluator.evaluate({ operator: 'in', field: 'subject', value: ['Math', 'Science'] }, { subject: 'English' })).toBe(false);
    });

    it('contains — substring match (case-insensitive)', () => {
      expect(evaluator.evaluate({ operator: 'contains', field: 'remarks', value: 'excellent' }, { remarks: 'Excellent work!' })).toBe(true);
      expect(evaluator.evaluate({ operator: 'contains', field: 'remarks', value: 'poor' }, { remarks: 'Excellent work!' })).toBe(false);
    });

    it('is_null / is_not_null', () => {
      expect(evaluator.evaluate({ operator: 'is_null', field: 'grade' }, { grade: null })).toBe(true);
      expect(evaluator.evaluate({ operator: 'is_not_null', field: 'grade' }, { grade: 'A' })).toBe(true);
      expect(evaluator.evaluate({ operator: 'is_null', field: 'grade' }, { grade: 'A' })).toBe(false);
    });

    it('always — always true', () => {
      expect(evaluator.evaluate({ operator: 'always' }, {})).toBe(true);
    });
  });

  describe('compound operators', () => {
    it('AND — all conditions must match', () => {
      const condition = {
        operator: 'AND',
        conditions: [
          { operator: 'gte', field: 'score', value: 80 },
          { operator: 'lte', field: 'score', value: 100 },
        ],
      } as any;
      expect(evaluator.evaluate(condition, { score: 90 })).toBe(true);
      expect(evaluator.evaluate(condition, { score: 75 })).toBe(false);
    });

    it('OR — any condition must match', () => {
      const condition = {
        operator: 'OR',
        conditions: [
          { operator: 'equals', field: 'status', value: 'excused' },
          { operator: 'gte', field: 'score', value: 60 },
        ],
      } as any;
      expect(evaluator.evaluate(condition, { status: 'absent', score: 65 })).toBe(true);
      expect(evaluator.evaluate(condition, { status: 'absent', score: 50 })).toBe(false);
    });

    it('NOT — inverts condition', () => {
      const condition = {
        operator: 'NOT',
        condition: { operator: 'equals', field: 'status', value: 'suspended' },
      } as any;
      expect(evaluator.evaluate(condition, { status: 'active' })).toBe(true);
      expect(evaluator.evaluate(condition, { status: 'suspended' })).toBe(false);
    });
  });

  describe('nested field resolution', () => {
    it('resolves dot-notation paths', () => {
      const context = { student: { name: 'Rahul', profile: { grade: '10' } } };
      expect(evaluator.evaluate({ operator: 'equals', field: 'student.name', value: 'Rahul' }, context)).toBe(true);
      expect(evaluator.evaluate({ operator: 'equals', field: 'student.profile.grade', value: '10' }, context)).toBe(true);
    });

    it('returns undefined for missing paths', () => {
      expect(evaluator.evaluate({ operator: 'is_null', field: 'student.missing.field' }, { student: {} })).toBe(true);
    });
  });
});

describe('RulesEngine (unit)', () => {
  // Tests for action execution are done via RulesEngine service tests
  // The ConditionEvaluator is the core logic tested above

  it('complex nested condition — AND with OR inside', () => {
    const evaluator = new ConditionEvaluator();
    const condition = {
      operator: 'AND',
      conditions: [
        { operator: 'equals', field: 'subject.is_core', value: true },
        {
          operator: 'OR',
          conditions: [
            { operator: 'gte', field: 'score', value: 90 },
            { operator: 'equals', field: 'score.exemption', value: true },
          ],
        },
        { operator: 'NOT', condition: { operator: 'equals', field: 'student.suspended', value: true } },
      ],
    } as any;

    const ctx1 = { subject: { is_core: true }, score: 85, student: { suspended: false } };
    expect(evaluator.evaluate(condition, ctx1)).toBe(false); // score < 90 and no exemption

    const ctx2 = { subject: { is_core: true }, score: { exemption: true }, student: { suspended: false } };
    expect(evaluator.evaluate(condition, ctx2)).toBe(true); // exemption is true

    const ctx3 = { subject: { is_core: true }, score: 95, student: { suspended: false } };
    expect(evaluator.evaluate(condition, ctx3)).toBe(true); // score >= 90
  });
});
