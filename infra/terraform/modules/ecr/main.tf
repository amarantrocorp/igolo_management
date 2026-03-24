###############################################################################
# ECR Module – Interior Design ERP
# Container repositories with lifecycle policies and image scanning
###############################################################################

locals {
  common_tags = {
    Environment = var.environment
    Project     = "igolo-interior-erp"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# ECR Repositories
# ------------------------------------------------------------------------------

resource "aws_ecr_repository" "repos" {
  for_each = toset(var.repo_names)

  name                 = each.value
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, {
    Name = each.value
  })
}

# ------------------------------------------------------------------------------
# Lifecycle Policy – keep last 15 tagged images, expire untagged after 7 days
# ------------------------------------------------------------------------------

resource "aws_ecr_lifecycle_policy" "repos" {
  for_each = aws_ecr_repository.repos

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep only the last 15 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "latest", "sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 15
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
