#include <iostream>
#include <boost/program_options.hpp>
#include "bitmap.hpp"
#include "json.hpp"
#include "span.hpp"

namespace po = boost::program_options;

using std::make_unique;

static const std::string DESCRIPTION = "Terrestria map builder";

const int BLOCK_SZ = 64;

const int WALL = 0xdbdbdb;
const int GRAVITY_REGION = 0x920092;
const int RESPAWN_AREA = 0x009200;
const int GEM_BANK = 0x0000db;
const int IGNORE = 0x7b7b7b;
const int EMPTY = 0x000000;

int toColour(const ContigMultiArray<uint8_t, 1>& pixel) {
  return (pixel[2] << 16) + (pixel[1] << 8) + pixel[0];
}

pJsonObject_t makeClearSpaceJson(int x, int y, size_t w, size_t h) {
  pJsonObject_t clearSpace = make_unique<JsonObject>();
  SpanBuilder spanBuilder;
  for (size_t j = 0; j < h; ++j) {
    spanBuilder.nextY();
    for (size_t i = 0; i < w; ++i) {
      spanBuilder.nextX(x + i);
    }
  }
  clearSpace->add("y", make_unique<JsonNumber>(y));
  clearSpace->add("span2d", spanBuilder.span2d.toJsonArray());
  return clearSpace;
}

pJsonEntity_t generateDigRegion(const Span2d& span) {
  return span.toJsonArray();
}

pJsonEntity_t generateGravityRegion(const Span2d& span) {
  return span.toJsonArray();
}

pJsonEntity_t generateWall(int x, int y) {
  pJsonObject_t json = make_unique<JsonObject>();
 
  pJsonObject_t data = make_unique<JsonObject>();
  data->add("x", make_unique<JsonNumber>(x * BLOCK_SZ));
  data->add("y", make_unique<JsonNumber>(y * BLOCK_SZ));

  json->add("type", make_unique<JsonString>("WALL"));
  json->add("data", std::move(data));
  json->add("clearSpace", makeClearSpaceJson(x, y, 1, 1));

  return json;
}

pJsonEntity_t generateRespawnArea(int x, int y) {
  pJsonObject_t json = make_unique<JsonObject>();
 
  pJsonObject_t data = make_unique<JsonObject>();
  data->add("x", make_unique<JsonNumber>(x * BLOCK_SZ));
  data->add("y", make_unique<JsonNumber>(y * BLOCK_SZ));

  json->add("type", make_unique<JsonString>("RESPAWN_AREA"));
  json->add("data", std::move(data));
  json->add("clearSpace", makeClearSpaceJson(x, y, 4, 4));

  return json;
}

pJsonEntity_t generateGemBank(int x, int y) {
  pJsonObject_t json = make_unique<JsonObject>();
 
  pJsonObject_t data = make_unique<JsonObject>();
  data->add("x", make_unique<JsonNumber>(x * BLOCK_SZ));
  data->add("y", make_unique<JsonNumber>(y * BLOCK_SZ));

  json->add("type", make_unique<JsonString>("GEM_BANK"));
  json->add("data", std::move(data));
  json->add("clearSpace", makeClearSpaceJson(x, y, 3, 3));

  return json;
}

// x and y in grid coords
pJsonEntity_t generateItem(int id, int x, int y) {
  switch (id) {
    case WALL: return generateWall(x, y);
    case RESPAWN_AREA: return generateRespawnArea(x, y);
    case GEM_BANK: return generateGemBank(x, y);
    default: throw std::runtime_error("Unrecognised item type");
  }
}

void generateMapData(ContigMultiArray<uint8_t, 3>& data,
                     size_t numRoundRocks,
                     size_t numSquareRocks,
                     size_t numGems,
                     std::ostream& out) {

  pJsonObject_t mapData = make_unique<JsonObject>();
  pJsonArray_t items = make_unique<JsonArray>();

  const size_t* size = data.size();

  SpanBuilder gravRegion;
  SpanBuilder digRegion;

  for (size_t j = 0; j < size[1]; ++j) {
    digRegion.nextY();
    gravRegion.nextY();

    for (size_t i = 0; i < size[0]; ++i) {
      size_t x = i;
      size_t y = j;

      // Flip y-axis when reading pixel
      auto pixel = toColour(data[size[1] - 1 - j][x]);

      if (pixel == GRAVITY_REGION) {
        gravRegion.nextX(x);
      }
      else {
        digRegion.nextX(x);

        if (pixel != EMPTY && pixel != IGNORE) {
          pJsonEntity_t item = generateItem(pixel, x, y);
          items->add(std::move(item));
        }
      }
    }
  }

  mapData->add("width", make_unique<JsonNumber>(size[0]));
  mapData->add("height", make_unique<JsonNumber>(size[1]));
  mapData->add("gravRegion", generateGravityRegion(gravRegion.span2d));
  mapData->add("digRegion", generateGravityRegion(digRegion.span2d));
  mapData->add("items", std::move(items));
  mapData->add("numRoundRocks", make_unique<JsonNumber>(numRoundRocks));
  mapData->add("numSquareRocks", make_unique<JsonNumber>(numSquareRocks));
  mapData->add("numGems", make_unique<JsonNumber>(numGems));

  mapData->dump(out);
}

int main(int argc, char** argv) {
  try {
    po::options_description desc{DESCRIPTION};
    desc.add_options()
      ("help,h", "Show help")
      ("gems,g", po::value<size_t>()->required(), "Number of gems")
      ("round_rocks,r", po::value<size_t>()->required(),
                        "Number of round rocks")
      ("square_rocks,q", po::value<size_t>()->required(),
                         "Number of square rocks")
      ("file,f", po::value<std::string>()->required(), "Bitmap image file");

    po::variables_map vm;
    po::store(po::parse_command_line(argc, argv, desc), vm);

    if (vm.count("help")) {
      std::cout << desc << std::endl;
      return 0;
    }

    po::notify(vm);

    std::string filePath = vm["file"].as<std::string>();
    size_t roundRocks = vm["round_rocks"].as<size_t>();
    size_t squareRocks = vm["square_rocks"].as<size_t>();
    size_t gems = vm["gems"].as<size_t>();

    auto bitmap = loadBitmap(filePath);
    generateMapData(bitmap, roundRocks, squareRocks, gems, std::cout);
  }
  catch (const po::error& e) {
    std::cerr << e.what() << std::endl;
    return 1;
  }
  catch (const std::exception& e) {
    std::cerr << e.what() << std::endl;
    return 1;
  }

  return 0;
}
