#include <iostream>
#include <boost/program_options.hpp>
#include "bitmap.hpp"

namespace po = boost::program_options;

static const std::string DESCRIPTION = "Terrestria map builder";

const int DIG_REGION = 0x920092;
const int WALL = 0xdbdbdb;
const int GRAVITY_REGION = 0x000000;
const int RESPAWN_REGION = 0x009200;
const int GEM_BANK = 0x0000db;

int toColour(const ContigMultiArray<uint8_t, 1>& pixel) {
  return (pixel[2] << 16) + (pixel[1] << 8) + pixel[0];
}

void generateItem(int id, std::ostream& out) {
  switch (id) {
    case DIG_REGION: out << "DIG_REGION" << std::endl; break;
    case WALL: out << "WALL" << std::endl; break;
    case GRAVITY_REGION: out << "GRAVITY_REGION" << std::endl; break;
    case RESPAWN_REGION: out << "RESPAWN_REGION" << std::endl; break;
    case GEM_BANK: out << "GEM_BANK" << std::endl; break;
    default: throw std::runtime_error("Unrecognised item type");
  }
}

void generateMapData(ContigMultiArray<uint8_t, 3>& data, std::ostream& out) {
  const size_t* size = data.size();

  for (size_t i = 0; i < size[0]; ++i) {
    for (size_t j = 0; j < size[1]; ++j) {
      generateItem(toColour(data[i][j]), out);
    }
  }
}

int main(int argc, char** argv) {
  try {
    po::options_description desc{DESCRIPTION};
    desc.add_options()
      ("help,h", "Show help")
      ("file,f", po::value<std::string>()->required(), "Bitmap image file");

    po::variables_map vm;
    po::store(po::parse_command_line(argc, argv, desc), vm);

    if (vm.count("help")) {
      std::cout << desc << std::endl;
      return 0;
    }

    po::notify(vm);

    std::string filePath = vm["file"].as<std::string>();

    auto bitmap = loadBitmap(filePath);
    generateMapData(bitmap, std::cout);
  }
  catch (const po::error& e) {
    std::cerr << e.what() << std::endl;
    return 1;
  }

  return 0;
}
