import { GameError } from "./error";

// Represents a range from A to B, inclusive
export class Span {
  a: number;
  b: number;

  constructor(a: number, b: number) {
    if (b < a) {
      throw new GameError("b cannot be smaller than a");
    }

    this.a = a;
    this.b = b;
  }

  contains(x: number): boolean {
    return this.a <= x && x <= this.b;
  }

  size() {
    return this.b - this.a + 1;
  }
}

export class Span2d {
  private _spans = new Map<number, Span[]>();

  addHorizontalSpan(y: number, span: Span) {
    let row = this._spans.get(y);
    if (row && this._overlap(row, span)) {
      throw new GameError("Error adding span; Span overlaps other spans");
    }

    if (!row) {
      row = [];
      this._spans.set(y, row);
    }

    row.push(span);
  }

  contains(x: number, y: number): boolean {
    const row = this._spans.get(y);
    if (row && this._contain(row, x)) {
      return true;
    }
    return false;
  }

  private _overlap(spans: Span[], span: Span): boolean {
    return spans.some(val => spansOverlap(val, span));
  }

  private _contain(spans: Span[], x: number): boolean {
    return spans.some(span => span.contains(x));
  }
}

export function spansOverlap(a: Span, b: Span): boolean {
  return Math.max(a.b, b.b) - Math.min(a.a, b.a) + 1 <= a.size() + b.size();
}
