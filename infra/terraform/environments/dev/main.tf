###############################################################################
# Dev Environment – Interior Design ERP
# Provisions VPC, EKS, RDS, S3, and DNS for the development environment
###############################################################################

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "igolo-interior"
      ManagedBy   = "terraform"
    }
  }
}

# ------------------------------------------------------------------------------
# Data Sources
# ------------------------------------------------------------------------------

data "terraform_remote_state" "ecr" {
  backend = "s3"
  config = {
    bucket = "igolo-terraform-state"
    key    = "shared/ecr/terraform.tfstate"
    region = var.aws_region
  }
}

# ------------------------------------------------------------------------------
# Networking
# ------------------------------------------------------------------------------

module "vpc" {
  source = "../../modules/vpc"

  environment   = var.environment
  vpc_cidr      = var.vpc_cidr
  cluster_name  = var.cluster_name
  enable_nat_ha = var.enable_nat_ha
}

# ------------------------------------------------------------------------------
# Kubernetes (EKS)
# ------------------------------------------------------------------------------

module "eks" {
  source = "../../modules/eks"

  environment        = var.environment
  cluster_name       = var.cluster_name
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_instance_type = var.node_instance_type
  node_min_size      = var.node_min_size
  node_max_size      = var.node_max_size
  node_desired_size  = var.node_desired_size
}

# ------------------------------------------------------------------------------
# Database (RDS PostgreSQL)
# ------------------------------------------------------------------------------

module "rds" {
  source = "../../modules/rds"

  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  instance_class      = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  multi_az            = var.db_multi_az
  backup_retention    = var.db_backup_retention
  deletion_protection = var.db_deletion_protection
  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password
  eks_security_group_id = module.eks.node_security_group_id
}

# ------------------------------------------------------------------------------
# Object Storage (S3)
# ------------------------------------------------------------------------------

module "s3" {
  source = "../../modules/s3"

  environment       = var.environment
  bucket_name       = var.s3_bucket_name
  cors_origins      = var.s3_cors_origins
  enable_versioning = var.s3_enable_versioning
}

# ------------------------------------------------------------------------------
# DNS & TLS
# ------------------------------------------------------------------------------

module "dns" {
  source = "../../modules/dns"

  environment = var.environment
  domain_name = var.domain_name
}
