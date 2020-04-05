#include <fstream>
#include <cmath>
#include "bitmap.hpp"

ContigMultiArray<uint8_t, 3> loadBitmap(const std::string& path) {
  BmpHeader bmpHeader(0, 0);

  size_t headerSize = sizeof(BmpHeader);

  std::ifstream fin(path);
  fin.read(reinterpret_cast<char*>(&bmpHeader), headerSize);

  size_t size[3];
  size[0] = bmpHeader.imgHdr.width;
  size[1] = bmpHeader.imgHdr.height;
  size[2] = 3;

  size_t bytes = size[0] * size[1] * size[2];
  uint8_t* data = new uint8_t[bytes];

  fin.seekg(bmpHeader.fileHdr.offset);

  size_t rowBytes = size[0] * 3;
  size_t paddedRowBytes = ceil(0.25 * rowBytes) * 4;
  size_t rowPadding = paddedRowBytes - rowBytes;

  char* ptr = reinterpret_cast<char*>(data);
  for (size_t row = 0; row < size[1]; ++row) {
    fin.read(ptr, rowBytes);
    fin.ignore(rowPadding);
    ptr += rowBytes;
  }

  return ContigMultiArray<uint8_t, 3>(data, size);
}
