output "endpoint" {
  description = "Connection endpoint of the RDS instance (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "port" {
  description = "Port the database is listening on"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Name of the default database"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "Master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}
