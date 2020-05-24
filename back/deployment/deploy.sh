#!/bin/bash -e

# Run this file from pinata_demo_1/back

npm run build

ecrUrl=826973917972.dkr.ecr.eu-west-2.amazonaws.com/pinata/pinata-demo-1

aws ecr get-login-password | docker login --username AWS --password-stdin $ecrUrl
docker build --file deployment/Dockerfile --tag pinata/pinata-demo-1 .
docker tag pinata/pinata-demo-1:latest $ecrUrl:latest
docker push $ecrUrl:latest

./deployment/stop_service.sh

aws ecs update-service \
  --cluster pinata-demo-1 \
  --service pinata-demo-1 \
  --task-definition pinata-demo-1 \
  --force-new-deployment
