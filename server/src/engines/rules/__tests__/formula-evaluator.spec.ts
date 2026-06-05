import { describe, it, expect } from 'vitest';
import { FormulaEvaluator } from '../formula-evaluator';

describe('FormulaEvaluator', () => {
  const evaluator = new FormulaEvaluator();

  describe('arithmetic expressions', () => {
    it('evaluates simple arithmetic', () => {
      expect(evaluator.evaluate('(85 / 100) * 100', {})).toBe(85);
      expect(evaluator.evaluate('5 + 3 * 2', {})).toBe(11);
    });

    it('substitutes context fields (quoted)', () => {
      expect(evaluator.evaluate("('score' / 'max_score') * 100", { score: 85, max_score: 100 })).toBe(85);
    });
  });

  describe('SUM', () => {
    it('sums array of numbers', () => {
      const ctx = { scores: [10, 20, 30] };
      expect(evaluator.evaluate('SUM(scores)', ctx)).toBe(60);
    });

    it('sums field from array of objects', () => {
      const ctx = { subjects: [{ score: 10 }, { score: 20 }, { score: 30 }] };
      expect(evaluator.evaluate("SUM(subjects, 'score')", ctx)).toBe(60);
    });

    it('sums computed field expressions', () => {
      const ctx = {
        subjects: [
          { score: 80, credit_hours: 4 },
          { score: 70, credit_hours: 3 },
        ],
      };
      expect(evaluator.evaluate("SUM(subjects, 'score * credit_hours')", ctx)).toBe(530);
    });
  });

  describe('AVG', () => {
    it('averages array of numbers', () => {
      const ctx = { scores: [10, 20, 30] };
      expect(evaluator.evaluate('AVG(scores)', ctx)).toBe(20);
    });

    it('averages field from objects', () => {
      const ctx = { items: [{ val: 10 }, { val: 20 }] };
      expect(evaluator.evaluate("AVG(items, 'val')", ctx)).toBe(15);
    });
  });

  describe('COUNT', () => {
    it('counts array length', () => {
      expect(evaluator.evaluate('COUNT(items)', { items: [1, 2, 3] })).toBe(3);
      expect(evaluator.evaluate('COUNT(items)', { items: [] })).toBe(0);
    });

    it('counts with WHERE clause', () => {
      const ctx = {
        records: [
          { status: 'ABSENT' },
          { status: 'PRESENT' },
          { status: 'ABSENT' },
        ],
      };
      expect(evaluator.evaluate("COUNT(records WHERE status = 'ABSENT')", ctx)).toBe(2);
    });
  });

  describe('MIN / MAX', () => {
    it('finds minimum', () => {
      expect(evaluator.evaluate('MIN(scores)', { scores: [5, 10, 3] })).toBe(3);
    });

    it('finds maximum', () => {
      expect(evaluator.evaluate('MAX(scores)', { scores: [5, 10, 3] })).toBe(10);
    });

    it('min/max from field in objects', () => {
      const ctx = { items: [{ val: 5 }, { val: 10 }, { val: 3 }] };
      expect(evaluator.evaluate("MIN(items, 'val')", ctx)).toBe(3);
      expect(evaluator.evaluate("MAX(items, 'val')", ctx)).toBe(10);
    });
  });

  describe('ROUND / FLOOR / CEIL / ABS', () => {
    it('ROUND to specified decimals', () => {
      expect(evaluator.evaluate('ROUND(3.567, 2)', {})).toBe(3.57);
      expect(evaluator.evaluate('ROUND(3.567, 0)', {})).toBe(4);
    });

    it('FLOOR / CEIL', () => {
      expect(evaluator.evaluate('FLOOR(3.9)', {})).toBe(3);
      expect(evaluator.evaluate('CEIL(3.1)', {})).toBe(4);
    });

    it('ABS', () => {
      expect(evaluator.evaluate('ABS(-5)', {})).toBe(5);
      expect(evaluator.evaluate('ABS(5)', {})).toBe(5);
    });
  });

  describe('IF', () => {
    it('returns then if condition true', () => {
      expect(evaluator.evaluate('IF(score >= 40, 1, 0)', { score: 50 })).toBe(1);
    });

    it('returns else if condition false', () => {
      expect(evaluator.evaluate('IF(score >= 40, 1, 0)', { score: 30 })).toBe(0);
    });
  });

  describe('COALESCE', () => {
    it('returns first non-null value', () => {
      expect(evaluator.evaluate('COALESCE(null_val, score)', { null_val: null, score: 85 })).toBe(85);
      expect(evaluator.evaluate('COALESCE(first, second)', { first: 10, second: 20 })).toBe(10);
    });
  });

  describe('WEIGHTED_AVG', () => {
    it('calculates weighted average', () => {
      const ctx = {
        subjects: [
          { grade_point: 4.0, credit_hours: 4 },
          { grade_point: 3.0, credit_hours: 3 },
        ],
      };
      const result = evaluator.evaluate("WEIGHTED_AVG(subjects, 'grade_point', 'credit_hours')", ctx);
      // (4*4 + 3*3) / (4+3) = 25/7 ≈ 3.5714
      expect(result).toBeCloseTo(3.5714, 2);
    });
  });

  describe('integration examples from spec', () => {
    it('GPA calculation — School C', () => {
      const ctx = {
        subjects: [
          { grade_point: 4.0, credit_hours: 4 },
          { grade_point: 3.0, credit_hours: 3 },
        ],
      };
      const result = evaluator.evaluate(
        "ROUND(WEIGHTED_AVG(subjects, 'grade_point', 'credit_hours'), 2)",
        ctx,
      );
      expect(result).toBe(3.57);
    });

    it('Attendance rate formula', () => {
      const ctx = {
        records: [
          { weight: 1.0, counts_toward_attendance: true },
          { weight: 1.0, counts_toward_attendance: true },
          { weight: 0.5, counts_toward_attendance: true },
          { weight: 0.0, counts_toward_attendance: true },
        ],
      };
      const sumWeight = evaluator.evaluate("SUM(records, 'weight')", ctx);
      const count = evaluator.evaluate("COUNT(records WHERE counts_toward_attendance = 'true')", ctx);
      // Note: counts_toward_attendance is boolean true in our context
      expect(sumWeight).toBe(2.5);
      // 2.5 / 4 = 0.625 = 62.5%
    });
  });
});
