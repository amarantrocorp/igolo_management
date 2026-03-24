variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "cors_origins" {
  description = "List of allowed origins for CORS (e.g. frontend domain)"
  type        = list(string)
  default     = []
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "enable_versioning" {
  description = "Enable S3 object versioning (recommended for prod)"
  type        = bool
  default     = false
}
