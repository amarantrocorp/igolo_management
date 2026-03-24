output "cluster_endpoint" {
  description = "Endpoint URL of the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_ca_data" {
  description = "Base64-encoded certificate authority data for the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider for IRSA"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "oidc_provider_url" {
  description = "URL of the OIDC provider (without https:// prefix)"
  value       = local.oidc_provider_url
}

output "alb_controller_role_arn" {
  description = "IAM role ARN for the AWS Load Balancer Controller service account"
  value       = aws_iam_role.alb_controller.arn
}

output "backend_sa_role_arn" {
  description = "IAM role ARN for the backend service account (S3 access)"
  value       = aws_iam_role.backend_sa.arn
}
