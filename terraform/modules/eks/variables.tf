# enterprise-ai-agent-platform/terraform/modules/eks/variables.tf
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for EKS"
  type        = list(string)
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "node_instance_types" {
  description = "EC2 instance types for node group"
  type        = list(string)
  default     = ["c5.large"]
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

variable "capacity_type" {
  description = "Capacity type for node group (ON_DEMAND or SPOT)"
  type        = string
  default     = "ON_DEMAND"
}

variable "spot_enabled" {
  description = "Enable spot node group"
  type        = bool
  default     = true
}

variable "spot_instance_types" {
  description = "EC2 instance types for spot node group"
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

variable "public_access_cidrs" {
  description = "CIDR blocks for public access to EKS"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}