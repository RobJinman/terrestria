#!/bin/bash -e

# Run this file from pinata_demo_1/back

npm run build

$(aws ecr get-login --no-include-email --region eu-west-2)
docker build --file deployment/Dockerfile --tag pinata/pinata-demo-1 .
docker tag pinata/pinata-demo-1:latest 826973917972.dkr.ecr.eu-west-2.amazonaws.com/pinata/pinata-demo-1:latest
docker push 826973917972.dkr.ecr.eu-west-2.amazonaws.com/pinata/pinata-demo-1:latest

./deployment/stop_service.sh

aws ecs update-service \
  --cluster pinata-demo-1 \
  --service pinata-demo-1 \
  --task-definition pinata-demo-1 \
  --force-new-deployment
