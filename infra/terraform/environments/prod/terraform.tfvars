###############################################################################
# Prod Environment – Terraform Variable Values
# NOTE: db_password is intentionally omitted. Supply via:
#   terraform apply -var="db_password=YOUR_SECRET"
#   or TF_VAR_db_password environment variable
###############################################################################

# ── General ───────────────────────────────────────────────────────────────────
aws_region  = "ap-south-1"
environment = "prod"

# ── VPC ───────────────────────────────────────────────────────────────────────
vpc_cidr      = "10.1.0.0/16"
cluster_name  = "igolo-prod"
enable_nat_ha = true

# ── EKS ───────────────────────────────────────────────────────────────────────
node_instance_type = "t3.large"
node_min_size      = 3
node_max_size      = 8
node_desired_size  = 3

# ── RDS ───────────────────────────────────────────────────────────────────────
db_instance_class      = "db.t3.medium"
db_allocated_storage   = 50
db_multi_az            = true
db_backup_retention    = 7
db_deletion_protection = true
db_name                = "igolo_prod"
db_username            = "igolo_admin"

# ── S3 ────────────────────────────────────────────────────────────────────────
s3_bucket_name       = "igolo-prod-uploads"
s3_cors_origins      = ["https://app.igolo.in"]
s3_enable_versioning = true

# ── DNS ───────────────────────────────────────────────────────────────────────
domain_name = "igolo.in"
