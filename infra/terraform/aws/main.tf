data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_ec2_managed_prefix_list" "cloudfront_origin" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "media_bucket" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.public.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.media.arn]
    }
  }
}

resource "random_string" "suffix" {
  length  = 6
  upper   = false
  special = false
}

resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "_-"
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "origin_header" {
  length  = 48
  special = false
}

resource "random_password" "demo" {
  for_each    = toset(["STUDENT", "TEACHER", "ASSISTANT", "ADMIN", "SUPER_ADMIN"])
  length      = 20
  special     = false
  min_lower   = 4
  min_upper   = 4
  min_numeric = 4
}

locals {
  stem           = "${var.name_prefix}-${var.environment}-${random_string.suffix.result}"
  production     = var.environment == "production"
  custom_domains = var.custom_domain == "" ? [] : distinct(concat([var.custom_domain], var.additional_custom_domains))
  application_url = var.custom_domain == "" ? (
    "https://${aws_cloudfront_distribution.app.domain_name}"
  ) : "https://${var.custom_domain}"
  cors_origins = var.custom_domain == "" ? (
    [local.application_url]
  ) : [for domain in local.custom_domains : "https://${domain}"]
  database_name        = "just_easy_ca"
  database_user        = "jeccadmin"
  database_url         = "postgresql://${local.database_user}:${random_password.database.result}@${aws_db_instance.main.address}:5432/${local.database_name}?schema=public&sslmode=require"
  legal_config_present = trimspace(var.legal_address) != "" && trimspace(var.grievance_officer_name) != ""
  demo_credentials = {
    STUDENT = {
      email    = "student.demo@justeasy.in"
      password = random_password.demo["STUDENT"].result
    }
    TEACHER = {
      email    = "teacher.demo@justeasy.in"
      password = random_password.demo["TEACHER"].result
    }
    ASSISTANT = {
      email    = "assistant.demo@justeasy.in"
      password = random_password.demo["ASSISTANT"].result
    }
    ADMIN = {
      email    = "admin.demo@justeasy.in"
      password = random_password.demo["ADMIN"].result
    }
    SUPER_ADMIN = {
      email    = "superadmin.demo@justeasy.in"
      password = random_password.demo["SUPER_ADMIN"].result
    }
  }
}

check "production_legal_configuration" {
  assert {
    condition     = !local.production || local.legal_config_present || var.allow_incomplete_legal_config
    error_message = "Production requires legal_address and grievance_officer_name unless the temporary migration override is explicitly enabled."
  }
}

resource "aws_vpc" "main" {
  cidr_block           = "10.52.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "vpc-${local.stem}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "igw-${local.stem}" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "public-${count.index + 1}-${local.stem}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "private-${count.index + 1}-${local.stem}" }
}

resource "aws_eip" "nat" {
  count  = local.production ? 2 : 1
  domain = "vpc"
  tags   = { Name = "nat-${count.index + 1}-${local.stem}" }
}

resource "aws_nat_gateway" "main" {
  count         = local.production ? 2 : 1
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.main]
  tags          = { Name = "nat-${count.index + 1}-${local.stem}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "public-${local.stem}" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[local.production ? count.index : 0].id
  }
  tags = { Name = "private-${count.index + 1}-${local.stem}" }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_security_group" "alb" {
  name        = "alb-${local.stem}"
  description = "Public CloudFront origin"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront_origin.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name        = "ecs-${local.stem}"
  description = "Application tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  ingress {
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "database" {
  name        = "database-${local.stem}"
  description = "PostgreSQL from ECS only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "db-${local.stem}"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "main" {
  identifier                   = "${local.stem}-db"
  engine                       = "postgres"
  engine_version               = "16.15"
  instance_class               = var.database_instance_class
  allocated_storage            = var.database_allocated_storage
  max_allocated_storage        = var.database_max_allocated_storage
  storage_type                 = "gp3"
  storage_encrypted            = true
  db_name                      = local.database_name
  username                     = local.database_user
  password                     = random_password.database.result
  port                         = 5432
  multi_az                     = var.database_multi_az
  publicly_accessible          = false
  db_subnet_group_name         = aws_db_subnet_group.main.name
  vpc_security_group_ids       = [aws_security_group.database.id]
  backup_retention_period      = var.backup_retention_days
  copy_tags_to_snapshot        = true
  deletion_protection          = local.production
  skip_final_snapshot          = false
  final_snapshot_identifier    = "${local.stem}-final"
  auto_minor_version_upgrade   = true
  performance_insights_enabled = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "public" {
  bucket = "${local.stem}-public-assets"
  lifecycle { prevent_destroy = true }
}

resource "aws_s3_bucket" "private" {
  bucket = "${local.stem}-private-content"
  lifecycle { prevent_destroy = true }
}

resource "aws_s3_bucket_public_access_block" "public" {
  bucket                  = aws_s3_bucket.public.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "private" {
  bucket                  = aws_s3_bucket.private.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "public" {
  bucket = aws_s3_bucket.public.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "private" {
  bucket = aws_s3_bucket.private.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "public" {
  bucket = aws_s3_bucket.public.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "private" {
  bucket = aws_s3_bucket.private.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "public" {
  bucket = aws_s3_bucket.public.id
  rule {
    id     = "noncurrent-retention"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration { noncurrent_days = local.production ? 30 : 7 }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "private" {
  bucket = aws_s3_bucket.private.id
  rule {
    id     = "noncurrent-retention"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration { noncurrent_days = local.production ? 30 : 7 }
  }
}

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "media-${local.stem}"
  description                       = "Private S3 origin for public application assets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "media" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = "PriceClass_200"
  comment         = "Just Easy CA public assets ${var.environment}"

  origin {
    domain_name              = aws_s3_bucket.public.bucket_regional_domain_name
    origin_id                = "public-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  default_cache_behavior {
    target_origin_id       = "public-assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate { cloudfront_default_certificate = true }
}

resource "aws_s3_bucket_policy" "public" {
  bucket = aws_s3_bucket.public.id
  policy = data.aws_iam_policy_document.media_bucket.json
}

resource "aws_lb" "main" {
  name                       = substr("${local.stem}-alb", 0, 32)
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = aws_subnet.public[*].id
  drop_invalid_header_fields = true
}

resource "aws_lb_target_group" "backend" {
  name                 = substr("${var.name_prefix}-api-${random_string.suffix.result}", 0, 32)
  port                 = 4000
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 30
  health_check {
    path                = "/health/ready"
    matcher             = "200"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 20
    timeout             = 10
  }
}

resource "aws_lb_target_group" "frontend" {
  name                 = substr("${var.name_prefix}-web-${random_string.suffix.result}", 0, 32)
  port                 = 80
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 20

  lifecycle {
    create_before_destroy = true
  }

  health_check {
    path                = "/healthz"
    matcher             = "200"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 20
    timeout             = 5
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}

resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
  condition {
    http_header {
      http_header_name = "X-Origin-Verify"
      values           = [random_password.origin_header.result]
    }
  }
  condition {
    path_pattern {
      values = ["/api/*", "/health/*"]
    }
  }
}

resource "aws_lb_listener_rule" "frontend" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
  condition {
    http_header {
      http_header_name = "X-Origin-Verify"
      values           = [random_password.origin_header.result]
    }
  }
}

resource "aws_cloudfront_distribution" "app" {
  enabled         = true
  is_ipv6_enabled = true
  aliases         = local.custom_domains
  price_class     = "PriceClass_200"
  comment         = "Just Easy CA application ${var.environment}"
  web_acl_id      = aws_wafv2_web_acl.app.arn

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "application-load-balancer"
    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.origin_header.result
    }
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "application-load-balancer"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_except_host.id
    compress                 = true
  }

  ordered_cache_behavior {
    path_pattern             = "/assets/*"
    target_origin_id         = "application-load-balancer"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.optimized.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_except_host.id
    compress                 = true
  }

  ordered_cache_behavior {
    path_pattern             = "/brand/*"
    target_origin_id         = "application-load-balancer"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.optimized.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_except_host.id
    compress                 = true
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "application-load-balancer"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_except_host.id
    compress                 = true
  }

  ordered_cache_behavior {
    path_pattern             = "/health/*"
    target_origin_id         = "application-load-balancer"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_except_host.id
  }

  ordered_cache_behavior {
    path_pattern             = "/runtime-config.js"
    target_origin_id         = "application-load-balancer"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_except_host.id
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.custom_domain == ""
    acm_certificate_arn            = var.custom_domain == "" ? null : var.cloudfront_certificate_arn
    ssl_support_method             = var.custom_domain == "" ? null : "sni-only"
    minimum_protocol_version       = var.custom_domain == "" ? "TLSv1" : "TLSv1.2_2021"
  }

  lifecycle {
    precondition {
      condition     = var.custom_domain == "" || var.cloudfront_certificate_arn != ""
      error_message = "cloudfront_certificate_arn is required when custom_domain is configured."
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "private" {
  bucket = aws_s3_bucket.private.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT"]
    allowed_origins = local.cors_origins
    expose_headers  = ["ETag", "x-amz-request-id"]
    max_age_seconds = 3600
  }
}

resource "aws_secretsmanager_secret" "database_url" { name = "${local.stem}/database-url" }
resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = local.database_url
}

resource "aws_secretsmanager_secret" "jwt" { name = "${local.stem}/jwt-secret" }
resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt.result
}

resource "aws_secretsmanager_secret" "email_password" { name = "${local.stem}/email-password" }
resource "aws_secretsmanager_secret_version" "email_password" {
  secret_id     = aws_secretsmanager_secret.email_password.id
  secret_string = var.email_password
}

resource "aws_secretsmanager_secret" "resend_api_key" { name = "${local.stem}/resend-api-key" }
resource "aws_secretsmanager_secret_version" "resend_api_key" {
  secret_id     = aws_secretsmanager_secret.resend_api_key.id
  secret_string = var.resend_api_key
}

resource "aws_secretsmanager_secret" "livekit_api_key" { name = "${local.stem}/livekit-api-key" }
resource "aws_secretsmanager_secret_version" "livekit_api_key" {
  secret_id     = aws_secretsmanager_secret.livekit_api_key.id
  secret_string = var.livekit_api_key
}

resource "aws_secretsmanager_secret" "livekit_api_secret" { name = "${local.stem}/livekit-api-secret" }
resource "aws_secretsmanager_secret_version" "livekit_api_secret" {
  secret_id     = aws_secretsmanager_secret.livekit_api_secret.id
  secret_string = var.livekit_api_secret
}

resource "aws_secretsmanager_secret" "registry" { name = "${local.stem}/registry" }
resource "aws_secretsmanager_secret_version" "registry" {
  secret_id = aws_secretsmanager_secret.registry.id
  secret_string = jsonencode({
    username = var.registry_username
    password = var.registry_password
  })
}

resource "aws_secretsmanager_secret" "demo_credentials" {
  name = "${local.stem}/demo-credentials"
}
resource "aws_secretsmanager_secret_version" "demo_credentials" {
  secret_id     = aws_secretsmanager_secret.demo_credentials.id
  secret_string = jsonencode(local.demo_credentials)
}

resource "aws_iam_role" "execution" {
  name               = "ecs-execution-${local.stem}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "secrets"
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.database_url.arn,
        aws_secretsmanager_secret.jwt.arn,
        aws_secretsmanager_secret.email_password.arn,
        aws_secretsmanager_secret.resend_api_key.arn,
        aws_secretsmanager_secret.livekit_api_key.arn,
        aws_secretsmanager_secret.livekit_api_secret.arn,
        aws_secretsmanager_secret.registry.arn,
        aws_secretsmanager_secret.demo_credentials.arn,
      ]
    }]
  })
}

resource "aws_iam_role" "task" {
  name               = "ecs-task-${local.stem}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy" "storage" {
  name = "storage"
  role = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetBucketLocation", "s3:ListBucket"]
        Resource = [aws_s3_bucket.public.arn, aws_s3_bucket.private.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = ["${aws_s3_bucket.public.arn}/*", "${aws_s3_bucket.private.arn}/*"]
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.stem}/backend"
  retention_in_days = local.production ? 90 : 30
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${local.stem}/frontend"
  retention_in_days = local.production ? 90 : 30
}

resource "aws_ecs_cluster" "main" {
  name = "${local.stem}-ecs"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.stem}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name         = "backend"
    image        = var.backend_image
    essential    = true
    portMappings = [{ containerPort = 4000, hostPort = 4000, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "4000" },
      { name = "APP_URL", value = local.application_url },
      { name = "API_BASE_URL", value = local.application_url },
      { name = "CORS_ORIGINS", value = join(",", local.cors_origins) },
      { name = "TRUST_PROXY_HOPS", value = "2" },
      { name = "COOKIE_SAME_SITE", value = "lax" },
      { name = "LOG_LEVEL", value = "INFO" },
      { name = "CRON_TIMEZONE", value = "Asia/Kolkata" },
      { name = "ALLOW_SELF_ENROLLMENT", value = tostring(var.allow_self_enrollment) },
      { name = "EMAIL_HOST", value = var.email_host },
      { name = "EMAIL_PORT", value = tostring(var.email_port) },
      { name = "EMAIL_USER", value = var.email_user },
      { name = "EMAIL_FROM", value = var.email_from },
      { name = "SEND_VERIFICATION_EMAILS", value = tostring(var.send_verification_emails) },
      { name = "RESEND_FROM_EMAIL", value = var.resend_from_email },
      { name = "RESEND_FROM_NAME", value = var.resend_from_name },
      { name = "LOGIN_OTP_ENABLED", value = tostring(var.login_otp_enabled) },
      { name = "SUPPORT_EMAIL", value = var.support_email },
      { name = "GRIEVANCE_EMAIL", value = var.grievance_email },
      { name = "STORAGE_DRIVER", value = "s3" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "AWS_PUBLIC_S3_BUCKET_NAME", value = aws_s3_bucket.public.id },
      { name = "AWS_PRIVATE_S3_BUCKET_NAME", value = aws_s3_bucket.private.id },
      { name = "PUBLIC_ASSET_BASE_URL", value = "https://${aws_cloudfront_distribution.media.domain_name}" },
      { name = "LIVEKIT_API_URL", value = var.livekit_api_url },
      { name = "LIVEKIT_WS_URL", value = var.livekit_ws_url },
      { name = "LIVEKIT_MAX_PARTICIPANTS", value = "300" },
      { name = "LIVEKIT_STUDENTS_CAN_PUBLISH", value = "false" },
      { name = "RELEASE", value = var.release },
    ]
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
      { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt.arn },
      { name = "EMAIL_PASS", valueFrom = aws_secretsmanager_secret.email_password.arn },
      { name = "RESEND_API_KEY", valueFrom = aws_secretsmanager_secret.resend_api_key.arn },
      { name = "LIVEKIT_API_KEY", valueFrom = aws_secretsmanager_secret.livekit_api_key.arn },
      { name = "LIVEKIT_API_SECRET", valueFrom = aws_secretsmanager_secret.livekit_api_secret.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.backend.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "backend"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "demo_seed" {
  family                   = "${local.stem}-demo-seed"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "demo-seed"
    image     = var.backend_image
    essential = true
    command   = ["node", "seed-demo.js"]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "ALLOW_PROD_DEMO_SEED", value = "true" },
    ]
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
      { name = "DEMO_CREDENTIALS_JSON", valueFrom = aws_secretsmanager_secret.demo_credentials.arn },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.backend.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "demo-seed"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.stem}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name         = "frontend"
    image        = var.frontend_image
    essential    = true
    portMappings = [{ containerPort = 80, hostPort = 80, protocol = "tcp" }]
    environment = [
      { name = "API_URL", value = local.application_url },
      { name = "RELEASE", value = var.release },
      { name = "COMPANY_LEGAL_NAME", value = var.company_legal_name },
      { name = "LEGAL_ADDRESS", value = var.legal_address },
      { name = "SUPPORT_EMAIL", value = var.support_email },
      { name = "SUPPORT_PHONE", value = var.support_phone },
      { name = "GRIEVANCE_OFFICER_NAME", value = var.grievance_officer_name },
      { name = "GRIEVANCE_EMAIL", value = var.grievance_email },
      { name = "CIN", value = var.cin },
      { name = "GSTIN", value = var.gstin },
      { name = "REQUIRE_LEGAL_CONFIG", value = tostring(local.production && !var.allow_incomplete_legal_config) },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.frontend.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "frontend"
      }
    }
  }])
}

resource "aws_ecs_service" "backend" {
  name                               = "${local.stem}-backend"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.backend.arn
  desired_count                      = var.backend_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  enable_execute_command             = true
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 120

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 4000
  }
  depends_on = [aws_lb_listener_rule.backend]
}

resource "aws_ecs_service" "frontend" {
  name                               = "${local.stem}-frontend"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.frontend.arn
  desired_count                      = var.frontend_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  health_check_grace_period_seconds  = 60

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }
  depends_on = [aws_lb_listener_rule.frontend]
}

resource "aws_appautoscaling_target" "backend" {
  max_capacity       = var.backend_max_count
  min_capacity       = var.backend_desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "backend-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace
  target_tracking_scaling_policy_configuration {
    target_value       = 65
    scale_in_cooldown  = 180
    scale_out_cooldown = 60
    predefined_metric_specification { predefined_metric_type = "ECSServiceAverageCPUUtilization" }
  }
}

resource "aws_appautoscaling_target" "frontend" {
  max_capacity       = var.frontend_max_count
  min_capacity       = var.frontend_desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "frontend_cpu" {
  name               = "frontend-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace
  target_tracking_scaling_policy_configuration {
    target_value       = 65
    scale_in_cooldown  = 180
    scale_out_cooldown = 60
    predefined_metric_specification { predefined_metric_type = "ECSServiceAverageCPUUtilization" }
  }
}

resource "aws_sns_topic" "alerts" {
  count = var.alert_email == "" ? 0 : 1
  name  = "alerts-${local.stem}"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  count               = var.alert_email == "" ? 0 : 1
  alarm_name          = "${local.stem}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  dimensions          = { LoadBalancer = aws_lb.main.arn_suffix }
}

resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  count               = var.alert_email == "" ? 0 : 1
  alarm_name          = "${local.stem}-database-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  count               = var.alert_email == "" ? 0 : 1
  alarm_name          = "${local.stem}-database-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
}
