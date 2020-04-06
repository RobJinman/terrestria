#ifndef MAP_BUILDER_SPAN_HPP
#define MAP_BUILDER_SPAN_HPP

#include "json.hpp"

struct Span {
  size_t a;
  size_t b;

  Span(size_t a, size_t b);

  pJsonObject_t toJsonObject() const;
};

struct Span2d {
  std::vector<std::vector<Span>> spans;

  pJsonArray_t toJsonArray() const;
};

struct SpanBuilder {
  Span2d span2d;

  void nextX(size_t x);
  void nextY();
};

#endif
