#ifndef MAP_BUILDER_JSON_HPP
#define MAP_BUILDER_JSON_HPP

#include <map>
#include <memory>
#include <vector>
#include <ostream>

enum class JsonEntityType {
  STRING_VALUE,
  NUMERICAL_VALUE,
  OBJECT,
  ARRAY
};

class JsonEntity {
  public:
    const JsonEntityType type;

    JsonEntity(JsonEntityType type)
      : type(type) {}

    virtual void dump(std::ostream& out) const = 0;

    virtual ~JsonEntity() {}
};

typedef std::unique_ptr<JsonEntity> pJsonEntity_t;

class JsonArray : public JsonEntity {
  public:
    JsonArray() : JsonEntity(JsonEntityType::ARRAY) {}

    void dump(std::ostream& out) const override;
    void add(pJsonEntity_t entity);

  private:
    std::vector<pJsonEntity_t> m_contents;
};

typedef std::unique_ptr<JsonArray> pJsonArray_t;

class JsonObject : public JsonEntity {
  public:
    JsonObject() : JsonEntity(JsonEntityType::OBJECT) {}

    void dump(std::ostream& out) const override;
    void add(const std::string& key, pJsonEntity_t entity);

  private:
    std::map<std::string, pJsonEntity_t> m_contents;
};

typedef std::unique_ptr<JsonObject> pJsonObject_t;

class JsonString : public JsonEntity {
  public:
    JsonString(const std::string& value)
      : JsonEntity(JsonEntityType::STRING_VALUE),
        m_value(value) {}

    void dump(std::ostream& out) const override;

  private:
    std::string m_value;
};

typedef std::unique_ptr<JsonString> pJsonString_t;

class JsonNumber : public JsonEntity {
  public:
    JsonNumber(double value)
      : JsonEntity(JsonEntityType::NUMERICAL_VALUE),
        m_value(value) {}

    void dump(std::ostream& out) const override;

  private:
    double m_value;
};

typedef std::unique_ptr<JsonNumber> pJsonNumber_t;

#endif
