Pinata Demo 1 - Back-End Deployment
===================================

Tools and setup
---------------

Install the AWS CLI.

```
    pip3 install awscli --upgrade --user
```

Create an access key via the web console. Configure the aws cli to use the new
credentials.

```
    aws configure
```

In the web console, create an EC2 key pair, supplying your machine's existing
SSH public key.

Install the ECS CLI

```
    sudo curl -o
      /usr/local/bin/ecs-cli \
      https://amazon-ecs-cli.s3.amazonaws.com/ecs-cli-linux-amd64-latest
```

Check version

```
    ecs-cli --version
```

Configure the CLI

```
    ecs-cli configure profile \
      --profile-name pinata-profile \
      --access-key $AWS_ACCESS_KEY_ID \
      --secret-key $AWS_SECRET_ACCESS_KEY

    ecs-cli configure profile default --profile-name pinata-profile
```


VPC
---

We should already have a default VPC with 3 subnets, otherwise create one.

```
    aws ec2 create-vpc --cidr-block 172.32.0.0/16
```


ECR repo for docker images
--------------------------

Create an ECR repository to host docker images

```
    aws ecr create-repository --repository-name pinata/pinata-demo-1
```

To build the docker image and push to the repo, simply run build.sh. To run the
image locally run

```
    docker run -p 3001:3001 pinata/pinata-demo-1
```


Task execution role
-------------------

If a task execution role doesn't already exist, we need to create one. First,
create a file called task-execution-assume-role.json with the following contents

```
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "",
          "Effect": "Allow",
          "Principal": {
            "Service": "ecs-tasks.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }
```

And then create the role

```
    aws iam --region eu-west-2 create-role \
      --role-name ecsTaskExecutionRole \
      --assume-role-policy-document file://task-execution-assume-role.json

    aws iam --region eu-west-2 attach-role-policy \
      --role-name ecsTaskExecutionRole \
      --policy-arn \
        arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```


Security group
--------------

Create a security group and allow SSH access from your IP. Allow traffic to port
3001 from anywhere.

```
    curl https://checkip.amazonaws.com # Returns your IP, e.g. 203.0.113.57

    aws ec2 create-security-group \
      --group-name pinata-demo-1-sg \
      --description "Pinata Demo 1 SG" \
      --vpc-id $VPC_ID

    aws ec2 authorize-security-group-ingress \
      --group-id $SECURITY_GROUP_ID \
      --protocol tcp \
      --port 22 \
      --cidr 203.0.113.57/32

    aws ec2 authorize-security-group-ingress \
      --group-id $SECURITY_GROUP_ID \
      --protocol tcp \
      --port 3001 \
      --cidr 0.0.0.0/0

    aws ec2 authorize-security-group-ingress \
      --group-id $SECURITY_GROUP_ID \
      --ip-permissions \
        IpProtocol=tcp,FromPort=3001,ToPort=3001,Ipv6Ranges=[{CidrIpv6=::/0}]
```


ECS cluster
-----------

Create a cluster with a single container instance

```
    ecs-cli configure \
      --cluster pinata-demo-1 \
      --default-launch-type EC2 \
      --region eu-west-2 \
      --config-name pinata-demo-1-cluster-config

    ecs-cli up \
      --keypair rob-desktop \
      --capability-iam \
      --size 1 \
      --instance-type t2.small \
      --vpc $VPC_ID \
      --subnets $SUBNET_1_ID,$SUBNET_2_ID,$SUBNET_3_ID \
      --security-group $SECURITY_GROUP_ID \
      --cluster-config pinata-demo-1-cluster-config
```


Creating the service
--------------------

Create a log group in CloudWatch

```
    aws logs create-log-group --log-group-name pinata-demo-1
```

Copy task_template.json to task.json and update the environment variables. Then,
register the task definition.

```
    aws ecs register-task-definition --cli-input-json file://task.json
```

Create the service from the task definition

```
    aws ecs create-service \
      --cluster pinata-demo-1 \
      --service-name pinata-demo-1 \
      --task-definition pinata-demo-1 \
      --desired-count 1
```

After changes to task.json, run

```
    aws ecs register-task-definition --cli-input-json file://task.json

    aws ecs update-service \
      --cluster pinata-demo-1 \
      --service pinata-demo-1 \
      --task-definition pinata-demo-1
```

For the moment, we're only using 1 instance in our cluster. To get its instance
ID, run the following.

```
    aws ecs list-container-instances --cluster pinata-demo-1
```

Take the last part of the ARN, which should looke something like
3b932cbc-f227-4118-964d-1cc7d1252e2b and now do

```
    aws ecs describe-container-instances \
      --cluster pinata-demo-1 \
      --container-instances 3b932cbc-f227-4118-964d-1cc7d1252e2b
```

The ID we need is the ec2InstanceId and should look something like
i-05ec558a145a54954.


Load balancer
-------------

We need a load balancer to handle HTTPS requests. The SSL_CERT_ARN is the ARN of
the SSL certificate for terrestria.io (refer to front/deployment.md).

```
    aws elbv2 create-load-balancer \
      --name pinata-demo-1-lb \
      --subnets $SUBNET_1_ID $SUBNET_2_ID $SUBNET_3_ID \
      --security-groups $SECURITY_GROUP_ID

    aws elbv2 create-target-group --name pinata-demo-1-tg \
      --protocol HTTP \
      --port 3001 \
      --vpc-id $VPC_ID \
      --health-check-enabled \
      --health-check-protocol HTTP \
      --health-check-port 3001 \
      --health-check-path /health \
      --health-check-interval 30 \
      --health-check-timeout 10

    aws elbv2 register-targets \
      --target-group-arn $TARGET_GROUP_ARN \
      --targets Id=i-05ec558a145a54954

    aws elbv2 create-listener \
      --load-balancer-arn $LOAD_BALANCER_ARN \
      --protocol HTTPS --port 3001 \
      --certificates CertificateArn=$SSL_CERT_ARN \
      --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
```

In Route53, create a type A record pointing to the load balancer.
