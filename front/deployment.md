Pinata Demo 1 - Front-End Deployment
====================================

S3 bucket
---------

Create an S3 bucket with name terrestria.io. Enable static web hosting and add
the following bucket policy.

```
{
    "Version": "2012-10-17",
    "Id": "PolicyForPublicWebsite",
    "Statement": [
        {
            "Sid": "AddPerm",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::terrestria.io/*"
        }
    ]
}
```


SSL Certificate
---------------

Request a certificate via ACM. !!!CHANGE THE REGION TO US-East (N. Virginia)!!!
Set the domain to terrestria.io and set *terrestria.io as an additional name.


CloudFront
----------

Create a CloudFront distribution for the bucket. Specify terrestria.io as an
alternate domain name and select the SSL certificate. Edit the default
behaviours to redirect HTTP to HTTPS.


Route 53
--------

Add a type A record set, specifying the CloudFront distro as an alias target.
