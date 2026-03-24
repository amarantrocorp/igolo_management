###############################################################################
# Dev Environment – Terraform Variable Values
# NOTE: db_password is intentionally omitted. Supply via:
#   terraform apply -var="db_password=YOUR_SECRET"
#   or TF_VAR_db_password environment variable
###############################################################################

# ── General ───────────────────────────────────────────────────────────────────
aws_region  = "ap-south-1"
environment = "dev"

# ── VPC ───────────────────────────────────────────────────────────────────────
vpc_cidr      = "10.0.0.0/16"
cluster_name  = "igolo-dev"
enable_nat_ha = false

# ── EKS ───────────────────────────────────────────────────────────────────────
node_instance_type = "t3.medium"
node_min_size      = 2
node_max_size      = 4
node_desired_size  = 2

# ── RDS ───────────────────────────────────────────────────────────────────────
db_instance_class      = "db.t3.micro"
db_allocated_storage   = 20
db_multi_az            = false
db_backup_retention    = 3
db_deletion_protection = false
db_name                = "igolo_dev"
db_username            = "igolo_admin"

# ── S3 ────────────────────────────────────────────────────────────────────────
s3_bucket_name       = "igolo-dev-uploads"
s3_cors_origins      = ["https://dev.igolo.in"]
s3_enable_versioning = false

# ── DNS ───────────────────────────────────────────────────────────────────────
domain_name = "igolo.in"
