output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_regional_domain" {
  description = "Regional domain name of the bucket"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "iam_policy_arn" {
  description = "ARN of the IAM policy granting pod access to the bucket"
  value       = aws_iam_policy.pod_access.arn
}
