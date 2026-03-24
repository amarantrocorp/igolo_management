###############################################################################
# Shared ECR Repositories – Interior Design ERP
# Container registries shared across all environments
###############################################################################

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "ap-south-1"
  default_tags {
    tags = {
      Project   = "igolo-interior"
      ManagedBy = "terraform"
    }
  }
}

module "ecr" {
  source      = "../../modules/ecr"
  repo_names  = ["igolo-backend", "igolo-frontend", "igolo-floorplan-ai"]
  environment = "shared"
}

output "repository_urls" {
  description = "Map of repository name to URL"
  value       = module.ecr.repository_urls
}
