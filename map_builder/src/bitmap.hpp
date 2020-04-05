#ifndef MAP_BUILDER_BITMAP_HPP
#define MAP_BUILDER_BITMAP_HPP

#include <cstdint>
#include "array.hpp"

struct __attribute__ ((packed)) BmpFileHeader {
  BmpFileHeader(uint32_t s)
    : size(s) {}

  char type[2] = {'B', 'M'};
  uint32_t size;
  uint16_t reserved1 = 0;
  uint16_t reserved2 = 0;
  uint32_t offset = 54;
};

struct __attribute__ ((packed)) BmpImgHeader {
  BmpImgHeader(uint32_t w, uint32_t h)
    : width(w), height(h) {}

  uint32_t size = 40;
  uint32_t width;
  uint32_t height;
  uint16_t planes = 1;
  uint16_t bitCount = 24;
  uint32_t compression = 0;
  uint32_t imgSize = 0;
  uint32_t xPxPerMetre = 0;
  uint32_t yPxPerMetre = 0;
  uint32_t colMapEntriesUsed = 0;
  uint32_t numImportantColours = 0;
};

struct __attribute__ ((packed)) BmpHeader {
  BmpHeader(uint32_t imgW, uint32_t imgH)
    : fileHdr(54 + imgW * imgH * 3),
      imgHdr(imgW, imgH) {}

  BmpFileHeader fileHdr;
  BmpImgHeader imgHdr;
};

ContigMultiArray<uint8_t, 3> loadBitmap(const std::string& path);

#endif
