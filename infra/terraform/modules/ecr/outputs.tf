output "repository_urls" {
  description = "Map of repository name to its URL"
  value       = { for name, repo in aws_ecr_repository.repos : name => repo.repository_url }
}
