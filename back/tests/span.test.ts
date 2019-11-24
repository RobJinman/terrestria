import "jasmine";
import { Span, Span2d, getOutsideEdges,
         getPerimeter, spansOverlap } from "../src/common/span";

describe("Span", () => {
  describe("Span iterator", () => {
    it("should not be done initially", () => {
      const span = new Span(0, 0);
      const i = span[Symbol.iterator]();

      const res = i.next();

      expect(res.done).toBe(false);
    });

    it("should be done after last value has been extracted", () => {
      const span = new Span(0, 0);
      const i = span[Symbol.iterator]();

      i.next();
      const res = i.next();
  
      expect(res.done).toBe(true);
    });

    it("should extract values in order", () => {
      const span = new Span(0, 2);
      const i = span[Symbol.iterator]();

      let res = i.next();
      expect(res.value).toBe(0);
      res = i.next();
      expect(res.value).toBe(1);
      res = i.next();
      expect(res.value).toBe(2);
    });

    it("should work with for..of construct", () => {
      const span = new Span(0, 3);
      const i = span[Symbol.iterator]();

      const values = [];
      for (let x of span) {
        values.push(x);
      }
  
      expect(values).toEqual([0, 1, 2, 3]);
    });
  });

  describe("spansOverlap", () => {
    it("should return false for 2 touching spans", () => {
      const span1 = new Span(4, 9);
      const span2 = new Span(10, 15);

      expect(spansOverlap(span1, span2)).toEqual(false);
    })
  });
});

describe("Span2d", () => {
  describe("Span2d iterator", () => {
    it("should not be done initially", () => {
      const span2d = new Span2d();

      const span = new Span(0, 0);
      span2d.addHorizontalSpan(0, span);

      const i = span2d[Symbol.iterator]();
  
      const res = i.next();

      expect(res.done).toBe(false);
    });

    it("should be done after last value has been extracted", () => {
      const span2d = new Span2d();

      const span = new Span(0, 0);
      span2d.addHorizontalSpan(0, span);

      const i = span2d[Symbol.iterator]();
  
      i.next();
      const res = i.next();

      expect(res.done).toBe(true);
    });

    it("should extract single value", () => {
      const span2d = new Span2d();

      const span = new Span(7, 7);
      span2d.addHorizontalSpan(4, span);

      const i = span2d[Symbol.iterator]();

      const res = i.next();

      expect(res.value).toEqual({
        x: 7,
        y: 4
      });
    });

    it("should extract multiple values from single span", () => {
      const span2d = new Span2d();

      const span = new Span(7, 9);
      span2d.addHorizontalSpan(4, span);

      const i = span2d[Symbol.iterator]();

      let res = i.next();
      expect(res.value).toEqual({
        x: 7,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 8,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 9,
        y: 4
      });
    });

    it("should extract values from multiple spans on single row", () => {
      const span2d = new Span2d();

      const span1 = new Span(7, 9);
      const span2 = new Span(11, 12);
      span2d.addHorizontalSpan(4, span1);
      span2d.addHorizontalSpan(4, span2);

      const i = span2d[Symbol.iterator]();

      let res = i.next();
      expect(res.value).toEqual({
        x: 7,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 8,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 9,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 11,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 12,
        y: 4
      });
    });

    it("should extract values from multiple spans on different rows", () => {
      const span2d = new Span2d();

      const span1 = new Span(7, 9);
      const span2 = new Span(11, 12);
      span2d.addHorizontalSpan(4, span1);
      span2d.addHorizontalSpan(6, span2);

      const i = span2d[Symbol.iterator]();

      let res = i.next();
      expect(res.value).toEqual({
        x: 7,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 8,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 9,
        y: 4
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 11,
        y: 6
      });

      res = i.next();
      expect(res.value).toEqual({
        x: 12,
        y: 6
      });
    });
  });

  describe("getOutsideEdges", () => {
    it("should return all 4 edges of single number span", () => {
      const span = new Span(4, 4);
      const span2d = new Span2d();
      span2d.addHorizontalSpan(9, span);

      const edges = new Set(getOutsideEdges(span2d));

      expect(edges).toEqual(new Set([
        // Top
        {
          A: { x: 4, y: 9 },
          B: { x: 5, y: 9 }
        },
        // Right
        {
          A: { x: 5, y: 9 },
          B: { x: 5, y: 10 }
        },
        // Bottom
        {
          A: { x: 5, y: 10 },
          B: { x: 4, y: 10 }
        },
        // Left
        {
          A: { x: 4, y: 10 },
          B: { x: 4, y: 9 }
        },
      ]));
    });
  });

  describe("getPerimeter", () => {
    it("should return all 4 edges of single number span", () => {
      const span = new Span(4, 4);
      const span2d = new Span2d();
      span2d.addHorizontalSpan(9, span);

      const edges = new Set(getPerimeter(span2d));

      expect(edges).toEqual(new Set([
        // Top
        {
          A: { x: 4, y: 9 },
          B: { x: 5, y: 9 }
        },
        // Right
        {
          A: { x: 5, y: 9 },
          B: { x: 5, y: 10 }
        },
        // Bottom
        {
          A: { x: 5, y: 10 },
          B: { x: 4, y: 10 }
        },
        // Left
        {
          A: { x: 4, y: 10 },
          B: { x: 4, y: 9 }
        },
      ]));
    });

    it("should return all 4 edges of a single row span2d", () => {
      const span = new Span(4, 6);
      const span2d = new Span2d();
      span2d.addHorizontalSpan(9, span);
  
      const edges = new Set(getPerimeter(span2d));
  
      expect(edges).toEqual(new Set([
        // Top
        {
          A: { x: 4, y: 9 },
          B: { x: 7, y: 9 }
        },
        // Right
        {
          A: { x: 7, y: 9 },
          B: { x: 7, y: 10 }
        },
        // Bottom
        {
          A: { x: 7, y: 10 },
          B: { x: 4, y: 10 }
        },
        // Left
        {
          A: { x: 4, y: 10 },
          B: { x: 4, y: 9 }
        },
      ]));
    });
  
    it("should return all 8 edges of a single row (2 span) span2d", () => {
      const span1 = new Span(4, 6);
      const span2 = new Span(9, 13);
      const span2d = new Span2d();
      span2d.addHorizontalSpan(9, span1);
      span2d.addHorizontalSpan(9, span2);
  
      const edges = new Set(getPerimeter(span2d));
  
      expect(edges).toEqual(new Set([
        // === Left span ===
        //
        // Top
        {
          A: { x: 4, y: 9 },
          B: { x: 7, y: 9 }
        },
        // Right
        {
          A: { x: 7, y: 9 },
          B: { x: 7, y: 10 }
        },
        // Bottom
        {
          A: { x: 7, y: 10 },
          B: { x: 4, y: 10 }
        },
        // Left
        {
          A: { x: 4, y: 10 },
          B: { x: 4, y: 9 }
        },
        // === Right span ===
        // Top
        {
          A: { x: 9, y: 9 },
          B: { x: 14, y: 9 }
        },
        // Right
        {
          A: { x: 14, y: 9 },
          B: { x: 14, y: 10 }
        },
        // Bottom
        {
          A: { x: 14, y: 10 },
          B: { x: 9, y: 10 }
        },
        // Left
        {
          A: { x: 9, y: 10 },
          B: { x: 9, y: 9 }
        },
      ]));
    });
  
    it("should return all 4 edges of 2 touching spans on single row", () => {
      const span1 = new Span(4, 6);
      const span2 = new Span(7, 13);
      const span2d = new Span2d();
      span2d.addHorizontalSpan(9, span1);
      span2d.addHorizontalSpan(9, span2);
  
      const edges = new Set(getPerimeter(span2d));
  
      expect(edges).toEqual(new Set([
        // Top
        {
          A: { x: 4, y: 9 },
          B: { x: 14, y: 9 }
        },
        // Right
        {
          A: { x: 14, y: 9 },
          B: { x: 14, y: 10 }
        },
        // Bottom
        {
          A: { x: 14, y: 10 },
          B: { x: 4, y: 10 }
        },
        // Left
        {
          A: { x: 4, y: 10 },
          B: { x: 4, y: 9 }
        }
      ]));
    });
  
    it("should return all 4 edges of 2 touching spans on 2 rows", () => {
      const span1 = new Span(4, 6);
      const span2 = new Span(4, 6);
      const span2d = new Span2d();
      span2d.addHorizontalSpan(9, span1);
      span2d.addHorizontalSpan(10, span2);
  
      const edges = new Set(getPerimeter(span2d));
  
      expect(edges).toEqual(new Set([
        // Top
        {
          A: { x: 4, y: 9 },
          B: { x: 7, y: 9 }
        },
        // Right
        {
          A: { x: 7, y: 9 },
          B: { x: 7, y: 11 }
        },
        // Bottom
        {
          A: { x: 7, y: 11 },
          B: { x: 4, y: 11 }
        },
        // Left
        {
          A: { x: 4, y: 11 },
          B: { x: 4, y: 9 }
        }
      ]));
    });
  });
});
