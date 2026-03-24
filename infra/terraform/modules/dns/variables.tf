variable "domain_name" {
  description = "Root domain name (e.g. igolo.in)"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the ALB created by the K8s ingress controller. Leave empty until ALB is provisioned."
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "Hosted zone ID of the ALB. Leave empty until ALB is provisioned."
  type        = string
  default     = ""
}
