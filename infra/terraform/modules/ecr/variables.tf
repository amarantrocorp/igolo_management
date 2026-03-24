variable "repo_names" {
  description = "List of ECR repository names to create"
  type        = list(string)
  default     = ["igolo-backend", "igolo-frontend", "igolo-floorplan-ai"]
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}
