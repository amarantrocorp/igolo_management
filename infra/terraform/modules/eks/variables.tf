variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the cluster will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the node group"
  type        = list(string)
}

variable "node_instance_type" {
  description = "EC2 instance type for the managed node group"
  type        = string
  default     = "t3.medium"
}

variable "node_min" {
  description = "Minimum number of nodes in the node group"
  type        = number
  default     = 1
}

variable "node_max" {
  description = "Maximum number of nodes in the node group"
  type        = number
  default     = 5
}

variable "node_desired" {
  description = "Desired number of nodes in the node group"
  type        = number
  default     = 2
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}
