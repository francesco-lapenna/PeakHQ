---
description: Check PeakHQ AWS resource status and Free Tier usage
argument-hint: "[aws-profile] — defaults to current AWS_PROFILE"
allowed-tools: Bash
---

Run a Free Tier health check for PeakHQ on AWS.

Use profile: $ARGUMENTS (if empty, use the default AWS_PROFILE / ambient credentials)
Region: eu-south-1 (primary). If a service fails, retry with eu-west-1.

## Lambda

```bash
aws lambda list-functions \
  --query "Functions[?starts_with(FunctionName, 'PeakHQ') || starts_with(FunctionName, 'peakhq')].{Name:FunctionName,Memory:MemorySize,Runtime:Runtime}" \
  --output table
```
Flag any function with MemorySize > 128 MB (check against Free Tier guard rails).

## DynamoDB

```bash
aws dynamodb list-tables --output json
aws dynamodb describe-limits
```
Warn if provisioned capacity approaches 25 RCU/WCU (Free Tier limit).

## S3

```bash
aws s3 ls | grep -i peakhq
```
Note bucket names. Warn if total storage is approaching 5 GB.

## CloudFront

```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[].{Id:Id,Domain:DomainName,Status:Status}" \
  --output table
```

## Cognito

```bash
aws cognito-idp list-user-pools --max-results 10 --output table
```

## Secrets Manager

```bash
aws secretsmanager list-secrets \
  --query "SecretList[?starts_with(Name, 'PeakHQ') || starts_with(Name, 'peakhq')].{Name:Name,LastAccessed:LastAccessedDate}" \
  --output table
```
Note: each secret costs $0.40/month after the trial. Flag any secrets that may no longer be in use.

## Current Month Cost

```bash
aws ce get-cost-and-usage \
  --time-period "Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d)" \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query "ResultsByTime[0].Groups[?Metrics.UnblendedCost.Amount > '0'].{Service:Keys[0],Cost:Metrics.UnblendedCost.Amount}" \
  --output table
```

## Summary

After running all commands, provide:
1. List of active resources
2. Any resources that appear to be outside Free Tier limits (flag these clearly)
3. Estimated current-month cost
4. Any orphaned or untagged resources that should be cleaned up
5. Any Lambda functions with memory > 128 MB
