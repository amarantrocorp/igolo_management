output "zone_id" {
  description = "ID of the Route53 hosted zone"
  value       = aws_route53_zone.main.zone_id
}

output "certificate_arn" {
  description = "ARN of the validated ACM certificate"
  value       = aws_acm_certificate.main.arn
}

output "name_servers" {
  description = "Name servers for the hosted zone (configure these at your registrar)"
  value       = aws_route53_zone.main.name_servers
}
