import { GameError } from "./error";
import { Vec2 } from "./geometry";

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

  [Symbol.iterator]() {
    let x = this.a;
    const b = this.b;

    return {
      next() {
        const value = x++;

        return {
          value,
          done: value > b
        };
      }
    };
  }
}

export class Span2d {
  private _spans = new Map<number, Span[]>();
  private _minX = Infinity;
  private _maxX = -Infinity;
  private _minY = Infinity;
  private _maxY = -Infinity;

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

    if (span.a < this._minX) {
      this._minX = span.a;
    }
    if (span.b > this._maxX) {
      this._maxX = span.b;
    }
    if (y < this._minY) {
      this._minY = y;
    }
    if (y > this._maxY) {
      this._maxY = y;
    }
  }

  get minX() {
    return this._minX;
  }

  get maxX() {
    return this._maxX;
  }

  get minY() {
    return this._minY;
  }

  get maxY() {
    return this._maxY;
  }

  contains(x: number, y: number): boolean {
    const row = this._spans.get(y);
    if (row && this._contain(row, x)) {
      return true;
    }
    return false;
  }

  [Symbol.iterator]() {
    const mapIt = this._spans[Symbol.iterator]();
    let spansIt: IterableIterator<Span>|null = null;
    let spanIt: Iterator<number>|null = null;
    let currentY: number = NaN;
    let currentX: number = NaN;

    const advanceMapIt = () => {
      const result = mapIt.next();
      if (result.done) {
        return true;
      }
      currentY = result.value[0];
      const value = result.value[1];
      spansIt = value[Symbol.iterator]();
      return false;
    };

    const advanceSpansIt = () => {
      if (spansIt === null) {
        if (advanceMapIt()) {
          return true;
        }
      }
      if (spansIt === null) {
        return true;
      }
      let result = spansIt.next();
      if (result.done) {
        if (advanceMapIt()) {
          return true;
        }
        result = spansIt.next();
      }
      const value = result.value;
      spanIt = value[Symbol.iterator]();
      return false;
    };

    const advanceSpanIt = () => {
      if (spanIt === null) {
        if (advanceSpansIt()) {
          return true;
        }
      }
      if (spanIt === null) {
        return true;
      }
      const result = spanIt.next();
      if (spanIt === null || result.done) {
        const done = advanceSpansIt();
        currentX = spanIt.next().value;
        return done;
      }
      currentX = result.value;
      return false;
    };

    return {
      next() {
        const done = advanceSpanIt();

        return {
          value: {
            x: currentX,
            y: currentY
          },
          done
        };
      }
    };
  }

  private _overlap(spans: Span[], span: Span): boolean {
    return spans.some(val => spansOverlap(val, span));
  }

  private _contain(spans: Span[], x: number): boolean {
    return spans.some(span => span.contains(x));
  }
}

export function spansOverlap(a: Span, b: Span): boolean {
  return Math.max(a.b, b.b) - Math.min(a.a, b.a) + 1 < a.size() + b.size();
}

export interface Edge {
  A: Vec2;
  B: Vec2;
}

export enum EdgeOrientation {
  VERTICAL,
  HORIZONTAL
}

export function orientation(edge: Edge): EdgeOrientation {
  if (edge.A.x === edge.B.x) {
    return EdgeOrientation.VERTICAL;
  }
  else if (edge.A.y === edge.B.y) {
    return EdgeOrientation.HORIZONTAL;
  }
  throw new GameError("Edge is not vertical or horizontal");
}

export function getOutsideEdges(span2d: Span2d): Edge[] {
  const edges: Edge[] = [];

  for (let square of span2d) {
    // Top
    if (!span2d.contains(square.x, square.y - 1)) {
      edges.push({
        A: { x: square.x, y: square.y },
        B: { x: square.x + 1, y: square.y }
      });
    }
    // Right
    if (!span2d.contains(square.x + 1, square.y)) {
      edges.push({
        A: { x: square.x + 1, y: square.y },
        B: { x: square.x + 1, y: square.y + 1 }
      });
    }
    // Bottom
    if (!span2d.contains(square.x, square.y + 1)) {
      edges.push({
        A: { x: square.x + 1, y: square.y + 1 },
        B: { x: square.x, y: square.y + 1 }
      });
    }
    // Left
    if (!span2d.contains(square.x - 1, square.y)) {
      edges.push({
        A: { x: square.x, y: square.y + 1 },
        B: { x: square.x, y: square.y }
      });
    }
  }

  return edges;
}

function getCorners(span2d: Span2d,
                    notVisited: Set<Edge>,
                    edgeMap: Edge[][][]) {
  const corners: Vec2[] = [];

  const chooseOther = (edges: Edge[], edge: Edge) => {
    if (edges.length != 2) {
      throw new GameError("Expected precisely 2 edges");
    }
    return edges[0] === edge ? edges[1] : edges[0];
  };

  let edge = notVisited.values().next().value;
  while (notVisited.has(edge)) {
    notVisited.delete(edge);

    const joined = edgeMap[edge.B.x - span2d.minX][edge.B.y - span2d.minY];
    const next = chooseOther(joined, edge);

    if (orientation(edge) != orientation(next)) {
      corners.push(edge.B);
    }

    edge = next;
  }

  return corners;
}

export function getPerimeter(span2d: Span2d): Edge[] {
  const perimeter: Edge[] = [];
  const notVisited = new Set(getOutsideEdges(span2d));
  const w = span2d.maxX - span2d.minX + 2;
  const h = span2d.maxY - span2d.minY + 2;

  const edgeMap: Edge[][][] = [];
  for (let i = 0; i < w; ++i) {
    const row = [];
    for (let j = 0; j < h; ++j) {
      row.push([]);
    }
    edgeMap.push(row);
  }

  for (const edge of notVisited) {
    edgeMap[edge.A.x - span2d.minX][edge.A.y - span2d.minY].push(edge);
    edgeMap[edge.B.x - span2d.minX][edge.B.y - span2d.minY].push(edge);
  }

  const cornerLists: Vec2[][] = [];
  while (notVisited.size > 0) {
    cornerLists.push(getCorners(span2d, notVisited, edgeMap));
  }

  for (const corners of cornerLists) {
    for (let i = 0; i < corners.length; ++i) {
      const corner = corners[i];
      const next = corners[(i + 1) % corners.length];

      perimeter.push({
        A: corner,
        B: next
      });
    }
  }

  return perimeter;
}
