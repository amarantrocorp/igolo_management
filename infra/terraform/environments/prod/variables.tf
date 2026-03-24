###############################################################################
# Variables – Prod Environment
###############################################################################

# ── General ───────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

# ── VPC ───────────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "cluster_name" {
  description = "Name of the EKS cluster (used for subnet tagging)"
  type        = string
}

variable "enable_nat_ha" {
  description = "Deploy one NAT Gateway per AZ for high availability"
  type        = bool
}

# ── EKS ───────────────────────────────────────────────────────────────────────

variable "node_instance_type" {
  description = "EC2 instance type for EKS worker nodes"
  type        = string
}

variable "node_min_size" {
  description = "Minimum number of nodes in the EKS node group"
  type        = number
}

variable "node_max_size" {
  description = "Maximum number of nodes in the EKS node group"
  type        = number
}

variable "node_desired_size" {
  description = "Desired number of nodes in the EKS node group"
  type        = number
}

# ── RDS ───────────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB for the RDS instance"
  type        = number
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
}

variable "db_backup_retention" {
  description = "Number of days to retain automated backups"
  type        = number
}

variable "db_deletion_protection" {
  description = "Enable deletion protection on the RDS instance"
  type        = bool
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "igolo_admin"
}

variable "db_password" {
  description = "Master password for the RDS instance (do NOT commit to VCS)"
  type        = string
  sensitive   = true
}

# ── S3 ────────────────────────────────────────────────────────────────────────

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for uploads"
  type        = string
}

variable "s3_cors_origins" {
  description = "Allowed CORS origins for the S3 bucket"
  type        = list(string)
}

variable "s3_enable_versioning" {
  description = "Enable S3 object versioning"
  type        = bool
}

# ── DNS ───────────────────────────────────────────────────────────────────────

variable "domain_name" {
  description = "Root domain name for Route 53 hosted zone"
  type        = string
}
