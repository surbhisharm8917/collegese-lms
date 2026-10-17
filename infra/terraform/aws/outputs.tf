output "application_url" {
  value = local.application_url
}

output "media_url" {
  value = "https://${aws_cloudfront_distribution.media.domain_name}"
}

output "database_endpoint" {
  value = aws_db_instance.main.address
}

output "database_identifier" {
  value = aws_db_instance.main.identifier
}

output "public_bucket" {
  value = aws_s3_bucket.public.id
}

output "private_bucket" {
  value = aws_s3_bucket.private.id
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "demo_credentials_secret_arn" {
  value = aws_secretsmanager_secret.demo_credentials.arn
}

output "demo_seed_task_definition" {
  value = aws_ecs_task_definition.demo_seed.arn
}
