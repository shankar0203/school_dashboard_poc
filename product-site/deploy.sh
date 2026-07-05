#!/usr/bin/env bash
# Deploy the Vidyam static product page to an S3 bucket configured for
# static website hosting.
#
# Usage:
#   ./deploy.sh <bucket-name> [aws-region]
#
# Example:
#   ./deploy.sh vidyam-product-site us-east-1
#
# Requires: AWS CLI installed and configured (aws configure) with a user/role
# that can create S3 buckets and set bucket policies.

set -euo pipefail

BUCKET_NAME="${1:-}"
REGION="${2:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "$BUCKET_NAME" ]]; then
  echo "Usage: ./deploy.sh <bucket-name> [aws-region]"
  exit 1
fi

echo "==> Creating bucket: s3://$BUCKET_NAME in $REGION"
if [[ "$REGION" == "us-east-1" ]]; then
  aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
    || echo "  (bucket may already exist, continuing)"
else
  aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" \
    || echo "  (bucket may already exist, continuing)"
fi

echo "==> Disabling 'Block Public Access' (required for a public static site)"
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
  BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

echo "==> Applying public-read bucket policy"
sed "s/BUCKET_NAME_PLACEHOLDER/$BUCKET_NAME/g" "$SCRIPT_DIR/bucket-policy.json" > /tmp/vidyam-bucket-policy.json
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/vidyam-bucket-policy.json

echo "==> Enabling static website hosting (index.html / error.html)"
aws s3api put-bucket-website --bucket "$BUCKET_NAME" --website-configuration '{
  "IndexDocument": {"Suffix": "index.html"},
  "ErrorDocument": {"Key": "error.html"}
}'

echo "==> Uploading site files"
aws s3 sync "$SCRIPT_DIR" "s3://$BUCKET_NAME" \
  --exclude "deploy.sh" \
  --exclude "bucket-policy.json" \
  --exclude "README.md" \
  --exclude ".DS_Store"

if [[ "$REGION" == "us-east-1" ]]; then
  ENDPOINT="http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
else
  ENDPOINT="http://$BUCKET_NAME.s3-website.$REGION.amazonaws.com"
fi

echo ""
echo "Done. Your site is live at:"
echo "  $ENDPOINT"
echo ""
echo "To use a custom domain (e.g. via Route 53), point an ALIAS/A record at"
echo "this S3 website endpoint, or put CloudFront in front of it for HTTPS."
