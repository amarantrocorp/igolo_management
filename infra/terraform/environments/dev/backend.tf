terraform {
  backend "s3" {
    bucket         = "igolo-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "igolo-terraform-locks"
    encrypt        = true
  }
}
