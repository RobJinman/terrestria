#!/bin/bash -e

tasksJson=$(aws ecs list-tasks --cluster pinata-demo-1)
taskArn=$(echo "$tasksJson" | sed -n 's/.*\(arn.*\)\".*/\1/p')

echo "Stopping task $taskArn..."

aws ecs stop-task \
  --cluster pinata-demo-1 \
  --task "$taskArn"

echo "Done"
