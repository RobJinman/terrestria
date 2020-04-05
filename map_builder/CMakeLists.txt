cmake_minimum_required(VERSION 3.10)

project(TerrestriaEditor CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Boost 1.56 REQUIRED COMPONENTS program_options)

file(GLOB CPP_SOURCES "${PROJECT_SOURCE_DIR}/src/*.cpp")

add_executable(map_builder ${CPP_SOURCES})

target_compile_options(map_builder PRIVATE -Wall -Wextra -O3)
target_link_libraries(map_builder Boost::program_options)
