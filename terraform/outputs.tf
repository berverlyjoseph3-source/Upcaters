# enterprise-ai-agent-platform/terraform/outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "documentdb_endpoint" {
  description = "DocumentDB endpoint"
  value       = module.documentdb.endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  value       = aws_s3_bucket.storage.id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "database_password" {
  description = "RDS database password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "documentdb_password" {
  description = "DocumentDB password"
  value       = random_password.docdb_password.result
  sensitive   = true
}

output "redis_password" {
  description = "Redis password"
  value       = random_password.redis_password.result
  sensitive   = true
}

output "kubeconfig_command" {
  description = "Command to generate kubeconfig for EKS cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.project_name}-${var.environment}"
}