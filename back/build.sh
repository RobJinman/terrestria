#!/bin/bash -e

rm -rf ./dist

tsc
cp ./package*.json ./dist/
