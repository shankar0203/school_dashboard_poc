# Invisos — Static Product Page (S3 hosting)

A static one-page product site for Invisos (school &amp; college management SaaS), ready to host on Amazon S3.

## Files

- `index.html` — the product page
- `styles.css` — page styling (dark theme)
- `error.html` — 404 page (used by S3 static website hosting)
- `bucket-policy.json` — public-read bucket policy template
- `deploy.sh` — one-command deploy script

## Prerequisites

- An AWS account
- AWS CLI installed and configured: `aws configure` (needs an access key with permission to create S3 buckets and set bucket policies)

## Deploy

```bash
chmod +x deploy.sh
./deploy.sh invisos-product-site us-east-1
```

Replace `invisos-product-site` with a **globally unique** bucket name (S3 bucket names are unique across all of AWS, not just your account), and `us-east-1` with your preferred region.

The script will:
1. Create the S3 bucket
2. Turn off "Block Public Access" (required for a public website)
3. Apply a public-read bucket policy
4. Enable static website hosting (`index.html` as the index, `error.html` as the error page)
5. Upload all site files
6. Print your live site URL

Your site will be reachable at:
```
http://<bucket-name>.s3-website-<region>.amazonaws.com
```

## Updating the page later

Edit `index.html` / `styles.css`, then just re-run:
```bash
aws s3 sync . s3://invisos-product-site --exclude "deploy.sh" --exclude "bucket-policy.json" --exclude "README.md"
```

## Adding a custom domain + HTTPS (optional, manual)

S3 website endpoints are HTTP-only. To use your own domain (e.g. `invisos.in`) with HTTPS:
1. Request a free ACM certificate for your domain (in `us-east-1`, since CloudFront requires it there).
2. Create a CloudFront distribution with the S3 website endpoint as its origin.
3. In Route 53, add an ALIAS record pointing your domain at the CloudFront distribution.

This mirrors the ACM + CloudFront pattern already used for the Invisos app itself — happy to help wire this up when you're ready.
