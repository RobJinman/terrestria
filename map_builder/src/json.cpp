#include "json.hpp"

template <typename Iter>
Iter nextIterator(Iter iter) {
  return ++iter;
}

void JsonArray::dump(std::ostream& out) const {
  out << "[";
  for (size_t i = 0; i < m_contents.size(); ++i) {
    m_contents[i]->dump(out);
    if (i + 1 < m_contents.size()) {
      out << ",";
    }
  }
  out << "]";
}

void JsonArray::add(pJsonEntity_t entity) {
  m_contents.push_back(std::move(entity));
}

void JsonObject::dump(std::ostream& out) const {
  out << "{";
  for (auto it = m_contents.begin(); it != m_contents.end(); ++it) {
    out << "\"" << it->first << "\":";
    it->second->dump(out);
    if (nextIterator(it) != m_contents.end()) {
      out << ",";
    }
  }
  out << "}";
}

void JsonObject::add(const std::string& key, pJsonEntity_t entity) {
  m_contents.insert(std::make_pair(key, std::move(entity)));
}

void JsonStringValue::dump(std::ostream& out) const {
  out << "\"" << m_value << "\"";
}

void JsonNumericalValue::dump(std::ostream& out) const {
  out << m_value;
}
