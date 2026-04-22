#!/bin/bash
set -e
PROTO_DIR="./proto"
OUT_DIR="./libs/grpc-types/src/generated"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
npx buf generate "$PROTO_DIR"
echo "Generated TypeScript types in $OUT_DIR"
