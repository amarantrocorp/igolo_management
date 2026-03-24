###############################################################################
# DNS Module – Interior Design ERP
# Route53 hosted zone, ACM wildcard certificate with DNS validation,
# and placeholder A-record aliases for the ALB.
###############################################################################

locals {
  common_tags = {
    Environment = var.environment
    Project     = "igolo-interior-erp"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# Route53 Hosted Zone
# ------------------------------------------------------------------------------

resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = merge(local.common_tags, {
    Name = var.domain_name
  })
}

# ------------------------------------------------------------------------------
# ACM Certificate (wildcard + apex)
# ------------------------------------------------------------------------------

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-cert"
  })
}

# ------------------------------------------------------------------------------
# DNS Validation Records
# ------------------------------------------------------------------------------

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 300
  records         = [each.value.record]
  allow_overwrite = true
}

# ------------------------------------------------------------------------------
# Certificate Validation (waits for DNS propagation)
# ------------------------------------------------------------------------------

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ------------------------------------------------------------------------------
# A Record Aliases for ALB
# These are created as empty placeholders. The actual ALB DNS name and zone ID
# are passed in after the ALB is provisioned by the AWS Load Balancer Controller
# in Kubernetes. Pass alb_dns_name and alb_zone_id via variables when ready.
# ------------------------------------------------------------------------------

resource "aws_route53_record" "apex" {
  count = var.alb_dns_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "wildcard" {
  count = var.alb_dns_name != "" ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
