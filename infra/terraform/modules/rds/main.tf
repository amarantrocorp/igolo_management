###############################################################################
# RDS Module – Interior Design ERP
# PostgreSQL 16 instance with encryption, automated backups, and security group
###############################################################################

locals {
  common_tags = {
    Environment = var.environment
    Project     = "igolo-interior-erp"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# DB Subnet Group
# ------------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-igolo-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-db-subnet"
  })
}

# ------------------------------------------------------------------------------
# Security Group
# ------------------------------------------------------------------------------

resource "aws_security_group" "rds" {
  name        = "${var.environment}-igolo-rds-sg"
  description = "Allow PostgreSQL access from within the VPC"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-rds-sg"
  })
}

# ------------------------------------------------------------------------------
# Parameter Group
# ------------------------------------------------------------------------------

resource "aws_db_parameter_group" "main" {
  name   = "${var.environment}-igolo-pg16"
  family = "postgres16"

  parameter {
    name  = "log_statement"
    value = "mod"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-pg16-params"
  })
}

# ------------------------------------------------------------------------------
# RDS Instance
# ------------------------------------------------------------------------------

resource "aws_db_instance" "main" {
  identifier = "${var.environment}-igolo-postgres"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class

  allocated_storage     = var.storage_gb
  max_allocated_storage = var.storage_gb * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  backup_retention_period = var.backup_retention
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:30-sun:05:30"

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.environment}-igolo-final-snapshot" : null

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-postgres"
  })
}

# ------------------------------------------------------------------------------
# Enhanced Monitoring IAM Role
# ------------------------------------------------------------------------------

resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-igolo-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring.name
}
