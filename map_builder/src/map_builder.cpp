#include <iostream>
#include <boost/program_options.hpp>
#include <sstream>
#include "bitmap.hpp"
#include "json.hpp"
#include "span.hpp"

#define EXCEPTION(msg) { \
  std::stringstream ss; \
  ss << msg; \
  throw std::runtime_error(ss.str()); \
}

namespace po = boost::program_options;

using std::make_unique;

static const std::string DESCRIPTION = "Terrestria map builder";

const int BLOCK_SZ = 64;

const int WALL = 0xdbdbdb;
const int METAL_WALL = 0x777777;
const int GRAVITY_REGION = 0x00038c;
const int GRAVITY_REGION_ALT = 0x383872;
const int SPAWN_POINT = 0x009200;
const int GEM_BANK = 0x00d0ca;
const int TROPHY = 0xffff00;
const int BLIMP = 0xc000ff;
const int DIG_REGION = 0x643200;
const int DIG_REGION_ALT = 0x66523f;

const std::set<int> digRegionItems{
  DIG_REGION,
  DIG_REGION_ALT,
  WALL,
  METAL_WALL,
  GEM_BANK,
  TROPHY
};

const std::set<int> gravRegionItems{
  GRAVITY_REGION,
  GRAVITY_REGION_ALT,
  SPAWN_POINT,
  BLIMP
};

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

pJsonEntity_t generateSimpleGridModeItem(int x,
                                         int y,
                                         const std::string& type) {
  pJsonObject_t json = make_unique<JsonObject>();
 
  pJsonObject_t data = make_unique<JsonObject>();
  data->add("x", make_unique<JsonNumber>(x * BLOCK_SZ));
  data->add("y", make_unique<JsonNumber>(y * BLOCK_SZ));

  json->add("type", make_unique<JsonString>(type));
  json->add("data", std::move(data));
  json->add("clearSpace", makeClearSpaceJson(x, y, 1, 1));

  return json;
}

pJsonEntity_t generateSpawnPoint(int x, int y) {
  pJsonObject_t json = make_unique<JsonObject>();
 
  json->add("x", make_unique<JsonNumber>(x * BLOCK_SZ));
  json->add("y", make_unique<JsonNumber>(y * BLOCK_SZ));

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

pJsonEntity_t generateSimpleFreeModeItem(int x,
                                         int y,
                                         const std::string& type) {
  pJsonObject_t json = make_unique<JsonObject>();
 
  pJsonObject_t data = make_unique<JsonObject>();
  data->add("x", make_unique<JsonNumber>(x * BLOCK_SZ));
  data->add("y", make_unique<JsonNumber>(y * BLOCK_SZ));

  json->add("type", make_unique<JsonString>(type));
  json->add("data", std::move(data));

  return json;
}

// x and y in grid coords
pJsonEntity_t generateItem(int id, int x, int y) {
  switch (id) {
    case WALL: return generateSimpleGridModeItem(x, y, "WALL");
    case METAL_WALL: return generateSimpleGridModeItem(x, y, "METAL_WALL");
    case TROPHY: return generateSimpleGridModeItem(x, y, "TROPHY");
    case GEM_BANK: return generateGemBank(x, y);
    case BLIMP: return generateSimpleFreeModeItem(x, y, "BLIMP");
    default:
      EXCEPTION("Unrecognised item type at " << x << ", " << y << ": " <<
                std::hex << id);
  }
}

void generateMapData(ContigMultiArray<uint8_t, 3>& data,
                     size_t numRoundRocks,
                     size_t numSquareRocks,
                     size_t numGems,
                     std::ostream& out) {

  pJsonObject_t mapData = make_unique<JsonObject>();
  pJsonArray_t items = make_unique<JsonArray>();
  pJsonArray_t spawnPoints = make_unique<JsonArray>();

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

      switch (pixel) {
        case SPAWN_POINT: {
          spawnPoints->add(generateSpawnPoint(x, y));
          break;
        }
        default: {
          items->add(generateItem(pixel, x, y));
          break;
        }
        case GRAVITY_REGION:
        case GRAVITY_REGION_ALT:
        case DIG_REGION:
        case DIG_REGION_ALT:
        break;
      }

      if (digRegionItems.count(pixel)) {
        digRegion.nextX(x);
      }
      else if (gravRegionItems.count(pixel)) {
        gravRegion.nextX(x);
      }
      else {
        EXCEPTION("Item at " << x << ", " << y << " of type " << std::hex <<
                  pixel << " does not belong to dig region or gravity region");
      }
    }
  }

  mapData->add("width", make_unique<JsonNumber>(size[0]));
  mapData->add("height", make_unique<JsonNumber>(size[1]));
  mapData->add("numRoundRocks", make_unique<JsonNumber>(numRoundRocks));
  mapData->add("numSquareRocks", make_unique<JsonNumber>(numSquareRocks));
  mapData->add("numGems", make_unique<JsonNumber>(numGems));
  mapData->add("gravRegion", generateGravityRegion(gravRegion.span2d));
  mapData->add("digRegion", generateGravityRegion(digRegion.span2d));
  mapData->add("spawnPoints", std::move(spawnPoints));
  mapData->add("items", std::move(items));

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
