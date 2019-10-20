#!/bin/bash -e

assert_not_empty() {
  eval "value=\$$1"
  if [ -z "$value" ]; then
    echo "$1 not set. Aborting."
    exit 1
  fi
}

assert_not_empty CLOUDFRONT_DISTRO_ID

npm run build

aws s3 rm s3://terrestria.io --recursive
aws s3 cp ./dist/ s3://terrestria.io/ --recursive

aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRO_ID \
  --paths '/*'
