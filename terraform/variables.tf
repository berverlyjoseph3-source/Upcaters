# enterprise-ai-agent-platform/terraform/variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ai-agent-platform"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "eks_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_desired_size" {
  description = "Desired number of nodes"
  type        = number
  default     = 3
}

variable "node_max_size" {
  description = "Maximum number of nodes"
  type        = number
  default     = 10
}

variable "node_min_size" {
  description = "Minimum number of nodes"
  type        = number
  default     = 3
}

variable "node_instance_types" {
  description = "EC2 instance types for nodes"
  type        = list(string)
  default     = ["c5.large", "c5a.large", "c5d.large"]
}

variable "spot_desired_size" {
  description = "Desired number of spot nodes"
  type        = number
  default     = 2
}

variable "spot_max_size" {
  description = "Maximum number of spot nodes"
  type        = number
  default     = 5
}

variable "spot_min_size" {
  description = "Minimum number of spot nodes"
  type        = number
  default     = 1
}

variable "spot_instance_types" {
  description = "EC2 instance types for spot nodes"
  type        = list(string)
  default     = ["c5.large", "c5a.large", "c5d.large", "c6i.large"]
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.large"
}

variable "rds_storage_gb" {
  description = "RDS storage in GB"
  type        = number
  default     = 100
}

variable "rds_backup_retention" {
  description = "RDS backup retention in days"
  type        = number
  default     = 30
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "aiagent"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "aiagent_user"
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes"
  type        = number
  default     = 1
}

variable "redis_snapshot_retention" {
  description = "Redis snapshot retention in days"
  type        = number
  default     = 7
}

variable "docdb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "docdb_instances" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 1
}

variable "docdb_backup_retention" {
  description = "DocumentDB backup retention in days"
  type        = number
  default     = 7
}

variable "docdb_username" {
  description = "DocumentDB username"
  type        = string
  default     = "admin"
}