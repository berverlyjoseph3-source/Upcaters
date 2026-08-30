# enterprise-ai-agent-platform/terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  backend "s3" {
    bucket         = "ai-agent-platform-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "ai-agent-platform-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "ai-agent-platform"
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr             = var.vpc_cidr
  environment          = var.environment
  availability_zones   = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"
  
  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = var.eks_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  environment     = var.environment
  
  node_groups = {
    main = {
      desired_size = var.node_desired_size
      max_size     = var.node_max_size
      min_size     = var.node_min_size
      instance_types = var.node_instance_types
      capacity_type  = "ON_DEMAND"
    }
    spot = {
      desired_size = var.spot_desired_size
      max_size     = var.spot_max_size
      min_size     = var.spot_min_size
      instance_types = var.spot_instance_types
      capacity_type  = "SPOT"
    }
  }
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"
  
  identifier = "${var.project_name}-${var.environment}"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = var.rds_instance_class
  storage_gb     = var.rds_storage_gb
  storage_type   = "gp3"
  
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_groups = [aws_security_group.rds.id]
  
  backup_retention_period = var.rds_backup_retention
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = var.environment == "prod"
  skip_final_snapshot = var.environment != "prod"
}

# ElastiCache Redis Module
module "redis" {
  source = "./modules/redis"
  
  cluster_id = "${var.project_name}-${var.environment}"
  node_type  = var.redis_node_type
  num_cache_nodes = var.redis_num_nodes
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_groups = [aws_security_group.redis.id]
  
  port = 6379
  
  parameter_group_name = "default.redis7"
  
  maintenance_window = "sun:05:00-sun:06:00"
  snapshot_window    = "04:00-05:00"
  snapshot_retention_limit = var.redis_snapshot_retention
  
  family = "redis7"
}

# DocumentDB (MongoDB) Module
module "documentdb" {
  source = "./modules/documentdb"
  
  cluster_identifier = "${var.project_name}-${var.environment}"
  engine             = "docdb"
  engine_version     = "5.0.0"
  instance_class     = var.docdb_instance_class
  instances          = var.docdb_instances
  
  master_username = var.docdb_username
  master_password = random_password.docdb_password.result
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_groups = [aws_security_group.documentdb.id]
  
  backup_retention_period = var.docdb_backup_retention
  preferred_backup_window = "02:00-04:00"
  preferred_maintenance_window = "sun:06:00-sun:08:00"
  
  skip_final_snapshot = var.environment != "prod"
}

# S3 Bucket for file storage
resource "aws_s3_bucket" "storage" {
  bucket = "${var.project_name}-storage-${var.environment}"
  force_destroy = var.environment != "prod"
  
  tags = {
    Name = "AI Agent Platform Storage"
  }
}

resource "aws_s3_bucket_versioning" "storage" {
  bucket = aws_s3_bucket.storage.id
  versioning_configuration {
    status = var.environment == "prod" ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "storage" {
  bucket = aws_s3_bucket.storage.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true
  aliases = ["cdn.aiagentplatform.com"]
  
  origin {
    domain_name = aws_s3_bucket.storage.bucket_regional_domain_name
    origin_id   = "s3-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "s3-origin"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }
  
  price_class = "PriceClass_100"
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.cert.arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  tags = {
    Name = "AI Agent Platform CDN"
  }
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for AI Agent Platform S3 bucket"
}

# Random passwords
resource "random_password" "db_password" {
  length  = 16
  special = false
}

resource "random_password" "docdb_password" {
  length  = 16
  special = false
}

resource "random_password" "redis_password" {
  length  = 16
  special = false
}