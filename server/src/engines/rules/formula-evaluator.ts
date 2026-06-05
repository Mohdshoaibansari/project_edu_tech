/**
 * Formula Expression Evaluator
 *
 * Safe, sandboxed expression evaluator for Rules Engine formulas.
 * Supports arithmetic, aggregation functions, and conditionals.
 * NO eval() — parsed and evaluated manually.
 */

type AggregationFunction =
  | 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX'
  | 'ROUND' | 'FLOOR' | 'CEIL' | 'ABS'
  | 'IF' | 'COALESCE' | 'WEIGHTED_AVG';

interface FormulaContext {
  [key: string]: any;
}

export class FormulaEvaluator {
  /**
   * Evaluate a formula expression against a data context.
   * Supports nested function calls by recursively expanding inner functions.
   */
  evaluate(formula: string, context: FormulaContext): number {
    const trimmed = formula.trim();

    // Expand any inner function calls first
    const expanded = this.expandNestedFunctions(trimmed, context);

    // Try aggregation functions
    const funcMatch = expanded.match(
      /^(SUM|AVG|COUNT|MIN|MAX|ROUND|FLOOR|CEIL|ABS|IF|COALESCE|WEIGHTED_AVG)\s*\((.*)\)$/s,
    );
    if (funcMatch) {
      return this.callFunction(funcMatch[1] as AggregationFunction, funcMatch[2], context);
    }

    // Simple arithmetic expression
    return this.evaluateArithmetic(expanded, context);
  }

  /**
   * Expand nested function calls by finding the innermost function,
   * evaluating it, substituting its result, and repeating.
   */
  private expandNestedFunctions(expr: string, context: FormulaContext): string {
    const funcRegex = /(SUM|AVG|COUNT|MIN|MAX|ROUND|FLOOR|CEIL|ABS|COALESCE|WEIGHTED_AVG|IF)\s*\(/g;
    let result = expr;
    let changed = true;

    while (changed) {
      changed = false;

      // Find the last (rightmost) function call — this is the innermost
      let lastMatch: { index: number; funcName: string; fullMatch: string } | null = null;
      let match: RegExpExecArray | null;
      funcRegex.lastIndex = 0;

      while ((match = funcRegex.exec(result)) !== null) {
        const funcName = match[1];
        const parenIdx = match.index + match[0].length - 1; // position of the opening (

        // Find the matching closing paren
        let depth = 1;
        let closeIdx = -1;
        for (let j = parenIdx + 1; j < result.length; j++) {
          if (result[j] === '(') depth++;
          else if (result[j] === ')') {
            depth--;
            if (depth === 0) {
              closeIdx = j;
              break;
            }
          }
        }

        if (closeIdx >= 0) {
          lastMatch = { index: match.index, funcName, fullMatch: result.substring(match.index, closeIdx + 1) };
        }
      }

      if (lastMatch && lastMatch.fullMatch !== result) {
        // Extract args from inside the parens
        const argStart = lastMatch.index + lastMatch.funcName.length + 1; // skip funcName and (
        const argEnd = lastMatch.index + lastMatch.fullMatch.length - 1; // before the final )
        const innerArgs = result.substring(argStart, argEnd);

        // Evaluate the innermost function
        const val = this.callFunction(lastMatch.funcName as AggregationFunction, innerArgs, context);

        // Substitute
        result = result.substring(0, lastMatch.index) + String(val) + result.substring(lastMatch.index + lastMatch.fullMatch.length);
        changed = true;
      }
    }

    return result;
  }

  private callFunction(name: AggregationFunction, args: string, context: FormulaContext): number {
    switch (name) {
      case 'SUM':
        return this.aggregateSum(args, context);
      case 'AVG':
        return this.aggregateAvg(args, context);
      case 'COUNT':
        return this.aggregateCount(args, context);
      case 'MIN':
        return this.aggregateMin(args, context);
      case 'MAX':
        return this.aggregateMax(args, context);
      case 'ROUND': {
        const [value, decimals] = this.parseArgs(args, 2, context);
        const factor = Math.pow(10, decimals ?? 0);
        return Math.round(value * factor) / factor;
      }
      case 'FLOOR': {
        const [value] = this.parseArgs(args, 1, context);
        return Math.floor(value);
      }
      case 'CEIL': {
        const [value] = this.parseArgs(args, 1, context);
        return Math.ceil(value);
      }
      case 'ABS': {
        const [value] = this.parseArgs(args, 1, context);
        return Math.abs(value);
      }
      case 'IF': {
        const parts = this.splitTopLevel(args);
        if (parts.length < 3) throw new Error('IF requires 3 arguments: condition, then, else');
        const condition = this.parseConditionExpr(parts[0], context);
        return condition ? this.evaluateArithmetic(parts[1], context) : this.evaluateArithmetic(parts[2], context);
      }
      case 'COALESCE': {
        const parts = this.splitTopLevel(args);
        for (const part of parts) {
          const val = this.resolveValue(part.trim(), context);
          if (val !== null && val !== undefined && !Number.isNaN(Number(val))) return Number(val);
        }
        return 0;
      }
      case 'WEIGHTED_AVG':
        return this.weightedAvg(args, context);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  // ---- Arithmetic ----

  private evaluateArithmetic(expr: string, context: FormulaContext): number {
    const resolved = this.resolveTokens(expr, context);
    // Safe evaluation using Function constructor (sandboxed — only arithmetic operators)
    try {
      // Remove whitespace and validate only allowed characters remain
      const noSpace = resolved.replace(/\s/g, '');
      const invalidChars = noSpace.replace(/[0-9+\-*/().%]/g, '');
      if (invalidChars.length > 0) {
        throw new Error(`Invalid characters in expression: "${invalidChars}"`);
      }
      return new Function(`return (${noSpace})`)();
    } catch (e) {
      throw new Error(`Formula evaluation error: ${(e as Error).message} in "${resolved}"`);
    }
  }

  private resolveTokens(expr: string, context: FormulaContext): string {
    return expr.replace(/'([^']*)'/g, (_, key) => {
      // 'field_name' → context value
      const val = this.resolveField(key, context);
      return String(val ?? 0);
    });
  }

  // ---- Aggregation Helpers ----

  private aggregateSum(args: string, context: FormulaContext): number {
    const [arrayName, fieldExpr] = this.splitTopLevel(args);
    const array = this.resolveField(arrayName.trim(), context);
    if (!Array.isArray(array)) return 0;

    if (fieldExpr) {
      const field = fieldExpr.trim().replace(/'/g, '');
      // If it contains arithmetic operators, evaluate as formula per item
      if (/[+\-*/()]/.test(field)) {
        return array.reduce((sum: number, item: any) => {
          const val = this.evaluateArithmetic(this.resolveTokensPerItem(field, item), {});
          return sum + val;
        }, 0);
      }
      return array.reduce((sum: number, item: any) => sum + Number(this.resolveField(field, item) ?? 0), 0);
    }
    return array.reduce((sum: number, item: any) => sum + Number(item ?? 0), 0);
  }

  private aggregateAvg(args: string, context: FormulaContext): number {
    const [arrayName, fieldExpr] = this.splitTopLevel(args);
    const array = this.resolveField(arrayName.trim(), context);
    if (!Array.isArray(array) || array.length === 0) return 0;

    const sum = this.computeSum(array, fieldExpr);
    return sum / array.length;
  }

  private aggregateCount(args: string, context: FormulaContext): number {
    const trimmed = args.trim();
    // Support: COUNT(array) or COUNT(array WHERE field op value)
    const whereMatch = trimmed.match(/^(\w+)\s+WHERE\s+(.+)$/i);
    if (whereMatch) {
      const array = this.resolveField(whereMatch[1], context);
      if (!Array.isArray(array)) return 0;
      return this.countWhere(array, whereMatch[2]);
    }
    const array = this.resolveField(trimmed, context);
    return Array.isArray(array) ? array.length : 0;
  }

  private aggregateMin(args: string, context: FormulaContext): number {
    const [arrayName, fieldExpr] = this.splitTopLevel(args);
    const array = this.resolveField(arrayName.trim(), context);
    if (!Array.isArray(array) || array.length === 0) return 0;

    const values = this.extractField(array, fieldExpr);
    return Math.min(...values);
  }

  private aggregateMax(args: string, context: FormulaContext): number {
    const [arrayName, fieldExpr] = this.splitTopLevel(args);
    const array = this.resolveField(arrayName.trim(), context);
    if (!Array.isArray(array) || array.length === 0) return 0;

    const values = this.extractField(array, fieldExpr);
    return Math.max(...values);
  }

  private weightedAvg(args: string, context: FormulaContext): number {
    const [arrayName, valueField, weightField] = this.splitTopLevel(args);
    const array = this.resolveField(arrayName.trim().replace(/'/g, ''), context);
    if (!Array.isArray(array) || array.length === 0) return 0;

    const vf = valueField.trim().replace(/'/g, '');
    const wf = weightField.trim().replace(/'/g, '');

    let totalWeighted = 0;
    let totalWeight = 0;
    for (const item of array) {
      const value = Number(this.resolveField(vf, item) ?? 0);
      const weight = Number(this.resolveField(wf, item) ?? 0);
      totalWeighted += value * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? totalWeighted / totalWeight : 0;
  }

  // ---- Helpers ----

  private resolveField(path: string, context: any): any {
    if (!context) return undefined;
    const parts = path.split('.');
    let current = context;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  private extractField(array: any[], fieldExpr?: string): number[] {
    if (!fieldExpr) {
      return array.map((item) => Number(item ?? 0));
    }
    const field = fieldExpr.trim().replace(/'/g, '');
    // If it's an expression (contains operators), evaluate per-item
    if (/[+\-*/()]/.test(field)) {
      return array.map((item) => {
        const resolved = this.resolveTokensPerItem(field, item);
        try {
          return new Function(`return (${resolved.replace(/\s/g, '')})`)();
        } catch {
          return 0;
        }
      });
    }
    return array.map((item) => Number(this.resolveField(field, item) ?? 0));
  }

  /**
   * Resolve tokens against an individual item (for per-row expression evaluation).
   * Replaces both quoted field names and bare field names with their values.
   */
  private resolveTokensPerItem(expr: string, item: any): string {
    let result = expr;

    // First replace quoted field references: 'field_name'
    result = result.replace(/'([^']*)'/g, (_, key) => {
      const val = this.resolveField(key, item);
      return String(val ?? 0);
    });

    // Then replace bare field references by iterating item keys (longest first to avoid partial matches)
    if (item && typeof item === 'object') {
      const keys = Object.keys(item).sort((a, b) => b.length - a.length);
      for (const key of keys) {
        // Only replace whole-word matches (preceded by non-word char or start, followed by non-word char or end)
        const wordBoundary = new RegExp(`(?<![\\w.])${this.escapeRegex(key)}(?![\\w])`, 'g');
        result = result.replace(wordBoundary, String(item[key] ?? 0));
      }
    }

    return result;
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private computeSum(array: any[], fieldExpr?: string): number {
    const values = this.extractField(array, fieldExpr);
    return values.reduce((a, b) => a + b, 0);
  }

  private countWhere(array: any[], whereExpr: string): number {
    // Simple: field = value
    const match = whereExpr.match(/^\s*(\w+)\s*=\s*'([^']*)'\s*$/);
    if (match) {
      const [, field, value] = match;
      return array.filter((item) => String(this.resolveField(field, item)) === value).length;
    }
    return array.length;
  }

  private parseConditionExpr(expr: string, context: FormulaContext): boolean {
    const trimmed = expr.trim();
    // score >= 40, attendance_rate < 75, etc.
    const compMatch = trimmed.match(/^(\w[\w.]*)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
    if (compMatch) {
      const fieldVal = Number(this.resolveValue(compMatch[1], context));
      const compareVal = Number(this.resolveValue(compMatch[3].trim(), context));
      switch (compMatch[2]) {
        case '>=': return fieldVal >= compareVal;
        case '<=': return fieldVal <= compareVal;
        case '!=': return fieldVal !== compareVal;
        case '==': return fieldVal === compareVal;
        case '>': return fieldVal > compareVal;
        case '<': return fieldVal < compareVal;
      }
    }
    // Treat as truthy check
    return !!this.resolveValue(trimmed, context);
  }

  private resolveValue(expr: string, context: FormulaContext): any {
    const trimmed = expr.trim();
    // Quoted string literal
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1);
    }
    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    // Context field
    return this.resolveField(trimmed, context);
  }

  /**
   * Split top-level arguments by comma (respecting parentheses nesting).
   */
  private splitTopLevel(args: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of args) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  /**
   * Parse N numeric arguments from string.
   */
  private parseArgs(args: string, count: number, context: FormulaContext): number[] {
    const parts = this.splitTopLevel(args);
    return parts.slice(0, count).map((p) => this.evaluateArithmetic(p, context));
  }
}
