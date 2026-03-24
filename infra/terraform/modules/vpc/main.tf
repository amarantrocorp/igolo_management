###############################################################################
# VPC Module – Interior Design ERP
# Creates VPC, subnets, IGW, NAT Gateway(s), and route tables for EKS
###############################################################################

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  common_tags = {
    Environment = var.environment
    Project     = "igolo-interior-erp"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------------------
# VPC
# ------------------------------------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, {
    Name                                            = "${var.environment}-igolo-vpc"
    "kubernetes.io/cluster/${var.cluster_name}"      = "shared"
  })
}

# ------------------------------------------------------------------------------
# Internet Gateway
# ------------------------------------------------------------------------------

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-igw"
  })
}

# ------------------------------------------------------------------------------
# Public Subnets
# ------------------------------------------------------------------------------

resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name                                            = "${var.environment}-igolo-public-${local.azs[count.index]}"
    "kubernetes.io/cluster/${var.cluster_name}"      = "shared"
    "kubernetes.io/role/elb"                         = "1"
  })
}

# ------------------------------------------------------------------------------
# Private Subnets
# ------------------------------------------------------------------------------

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = local.azs[count.index]

  tags = merge(local.common_tags, {
    Name                                            = "${var.environment}-igolo-private-${local.azs[count.index]}"
    "kubernetes.io/cluster/${var.cluster_name}"      = "shared"
    "kubernetes.io/role/internal-elb"                = "1"
  })
}

# ------------------------------------------------------------------------------
# Elastic IPs for NAT Gateway(s)
# ------------------------------------------------------------------------------

resource "aws_eip" "nat" {
  count  = var.enable_nat_ha ? 2 : 1
  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-nat-eip-${count.index}"
  })

  depends_on = [aws_internet_gateway.main]
}

# ------------------------------------------------------------------------------
# NAT Gateway(s)
# Single for dev, HA pair (one per AZ) for prod
# ------------------------------------------------------------------------------

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_ha ? 2 : 1

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-nat-${local.azs[count.index]}"
  })

  depends_on = [aws_internet_gateway.main]
}

# ------------------------------------------------------------------------------
# Public Route Table
# ------------------------------------------------------------------------------

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-public-rt"
  })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ------------------------------------------------------------------------------
# Private Route Tables
# When HA NAT is enabled each AZ gets its own route table pointing to the
# local NAT Gateway. Otherwise both AZs share a single route table.
# ------------------------------------------------------------------------------

resource "aws_route_table" "private" {
  count  = var.enable_nat_ha ? 2 : 1
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.environment}-igolo-private-rt-${count.index}"
  })
}

resource "aws_route" "private_nat" {
  count = var.enable_nat_ha ? 2 : 1

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[count.index].id
}

resource "aws_route_table_association" "private" {
  count = 2

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[var.enable_nat_ha ? count.index : 0].id
}
