#include <cassert>
#include "span.hpp"

Span::Span(size_t a, size_t b)
  : a(a), b(b) {

  if (a > b) {
    throw std::runtime_error("b must not be less than a");
  }
}

pJsonObject_t Span::toJsonObject() const {
  pJsonObject_t json = std::make_unique<JsonObject>();
  json->add("a", std::make_unique<JsonNumericalValue>(a));
  json->add("b", std::make_unique<JsonNumericalValue>(b));
  return json;
}

pJsonArray_t Span2d::toJsonArray() const {
  pJsonArray_t json = std::make_unique<JsonArray>();
  for (const auto& row : spans) {
    pJsonArray_t rowJson = std::make_unique<JsonArray>();

    for (const auto& span : row) {
      rowJson->add(span.toJsonObject());
    }

    json->add(std::move(rowJson));
  }
  return json;
}

void SpanBuilder::nextX(size_t x) {
  if (span2d.spans.empty()) {
    span2d.spans.push_back(std::vector<Span>());
  }

  std::vector<Span>& row = span2d.spans.back();
  if (row.empty()) {
    row.push_back(Span(x, x));
    return;
  }

  Span& last = row.back();
  if (x == last.b + 1) {
    ++last.b;
  }
  else if (x > last.b + 1) {
    row.push_back(Span(x, x));
  }
  else {
    throw std::runtime_error("Span2d must be constructed in order");
  }
}

void SpanBuilder::nextY() {
  span2d.spans.push_back(std::vector<Span>());
}
