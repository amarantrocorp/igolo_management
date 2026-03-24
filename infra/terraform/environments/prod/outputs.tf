###############################################################################
# Outputs – Prod Environment
###############################################################################

# ── EKS ───────────────────────────────────────────────────────────────────────

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "API endpoint for the EKS cluster"
  value       = module.eks.cluster_endpoint
}

# ── RDS ───────────────────────────────────────────────────────────────────────

output "rds_endpoint" {
  description = "Connection endpoint for the RDS PostgreSQL instance"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "Port of the RDS instance"
  value       = module.rds.port
}

# ── S3 ────────────────────────────────────────────────────────────────────────

output "s3_bucket_name" {
  description = "Name of the uploads S3 bucket"
  value       = module.s3.bucket_name
}

output "s3_bucket_arn" {
  description = "ARN of the uploads S3 bucket"
  value       = module.s3.bucket_arn
}

# ── ECR ───────────────────────────────────────────────────────────────────────

output "ecr_repository_urls" {
  description = "ECR repository URLs from the shared ECR state"
  value       = data.terraform_remote_state.ecr.outputs.repository_urls
}

# ── DNS ───────────────────────────────────────────────────────────────────────

output "certificate_arn" {
  description = "ARN of the ACM certificate for TLS"
  value       = module.dns.certificate_arn
}

output "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = module.dns.hosted_zone_id
}
