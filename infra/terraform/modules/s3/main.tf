###############################################################################
# S3 Module – Interior Design ERP
# Encrypted bucket with CORS, public access block, and IAM policy for pods
###############################################################################

locals {
  common_tags = {
    Environment = var.environment
    Project     = "igolo-interior-erp"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# S3 Bucket
# ------------------------------------------------------------------------------

resource "aws_s3_bucket" "main" {
  bucket = var.bucket_name

  tags = merge(local.common_tags, {
    Name = var.bucket_name
  })
}

# ------------------------------------------------------------------------------
# Versioning (enabled for prod, disabled for dev)
# ------------------------------------------------------------------------------

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# ------------------------------------------------------------------------------
# Server-Side Encryption
# ------------------------------------------------------------------------------

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# ------------------------------------------------------------------------------
# Block All Public Access
# ------------------------------------------------------------------------------

resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ------------------------------------------------------------------------------
# CORS Configuration
# ------------------------------------------------------------------------------

resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET"]
    allowed_origins = var.cors_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# ------------------------------------------------------------------------------
# IAM Policy for Pod Access (referenced by IRSA role in EKS module)
# ------------------------------------------------------------------------------

resource "aws_iam_policy" "pod_access" {
  name        = "${var.bucket_name}-pod-access"
  description = "Allows EKS pods to read/write objects in the ${var.bucket_name} bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListBucket"
        Effect = "Allow"
        Action = ["s3:ListBucket"]
        Resource = [aws_s3_bucket.main.arn]
      },
      {
        Sid    = "ObjectOperations"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
        ]
        Resource = ["${aws_s3_bucket.main.arn}/*"]
      }
    ]
  })

  tags = local.common_tags
}
