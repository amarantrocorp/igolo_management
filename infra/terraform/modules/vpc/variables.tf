variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "cluster_name" {
  description = "Name of the EKS cluster – used for subnet tagging"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_nat_ha" {
  description = "Deploy a NAT Gateway in each AZ for high availability (recommended for prod)"
  type        = bool
  default     = false
}
