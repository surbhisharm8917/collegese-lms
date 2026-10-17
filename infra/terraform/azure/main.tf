data "azurerm_client_config" "current" {}

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

locals {
  stem                 = "${var.name_prefix}-${var.environment}-${random_string.suffix.result}"
  backend_name         = "${var.name_prefix}-api-${var.environment}"
  frontend_name        = "${var.name_prefix}-web-${var.environment}"
  frontend_url         = "https://${local.frontend_name}.${azurerm_container_app_environment.main.default_domain}"
  api_url              = "https://${local.backend_name}.${azurerm_container_app_environment.main.default_domain}"
  postgres_database    = "just_easy_ca"
  postgres_user        = "jeccadmin"
  database_url         = "postgresql://${local.postgres_user}:${random_password.database.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${local.postgres_database}?schema=public&sslmode=require"
  production           = var.environment == "production"
  legal_config_present = trimspace(var.legal_address) != "" && trimspace(var.grievance_officer_name) != ""
}

check "production_legal_configuration" {
  assert {
    condition     = !local.production || local.legal_config_present
    error_message = "Production requires legal_address and grievance_officer_name."
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.stem}"
  location = var.location
  tags = {
    application = "just-easy-ca-classes"
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-${local.stem}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.42.0.0/16"]
}

resource "azurerm_subnet" "container_apps" {
  name                 = "snet-container-apps"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.42.0.0/23"]

  delegation {
    name = "container-apps"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "postgres" {
  name                 = "snet-postgres"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.42.4.0/24"]
  service_endpoints    = ["Microsoft.Storage"]

  delegation {
    name = "postgres"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-vnet-link"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id
  resource_group_name   = azurerm_resource_group.main.name
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.stem}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = local.production ? 90 : 30
}

resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${local.stem}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  infrastructure_subnet_id   = azurerm_subnet.container_apps.id
  zone_redundancy_enabled    = local.production
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "psql-${local.stem}"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = "16"
  delegated_subnet_id           = azurerm_subnet.postgres.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  administrator_login           = local.postgres_user
  administrator_password        = random_password.database.result
  sku_name                      = var.database_sku
  storage_mb                    = var.database_storage_mb
  auto_grow_enabled             = true
  backup_retention_days         = var.backup_retention_days
  geo_redundant_backup_enabled  = var.database_geo_redundant_backup
  public_network_access_enabled = false
  zone                          = "1"

  dynamic "high_availability" {
    for_each = var.database_high_availability ? [1] : []
    content {
      mode                      = "ZoneRedundant"
      standby_availability_zone = "2"
    }
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = local.postgres_database
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_storage_account" "main" {
  name                            = "stjecc${random_string.suffix.result}${substr(var.environment, 0, 1)}"
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_tier                    = "Standard"
  account_replication_type        = local.production ? "ZRS" : "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = true
  public_network_access_enabled   = true

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = local.production ? 30 : 7
    }

    container_delete_retention_policy {
      days = local.production ? 30 : 7
    }

    cors_rule {
      allowed_origins    = [local.frontend_url]
      allowed_methods    = ["GET", "HEAD", "PUT", "OPTIONS"]
      allowed_headers    = ["*"]
      exposed_headers    = ["ETag", "x-ms-request-id"]
      max_age_in_seconds = 3600
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_storage_container" "public" {
  name                  = "public-assets"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "blob"
}

resource "azurerm_storage_container" "private" {
  name                  = "private-content"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "id-${local.stem}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_key_vault" "main" {
  name                       = "kv-${var.name_prefix}-${random_string.suffix.result}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  purge_protection_enabled   = local.production
  soft_delete_retention_days = local.production ? 90 : 7

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id
    secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Purge",
      "Recover",
    ]
  }

  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = azurerm_user_assigned_identity.app.principal_id
    secret_permissions = ["Get", "List"]
  }
}

resource "azurerm_key_vault_secret" "database_url" {
  name         = "database-url"
  value        = local.database_url
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "jwt" {
  name         = "jwt-secret"
  value        = random_password.jwt.result
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "storage_key" {
  name         = "storage-key"
  value        = azurerm_storage_account.main.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "email_password" {
  name         = "email-password"
  value        = var.email_password
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "resend_api_key" {
  name         = "resend-api-key"
  value        = var.resend_api_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "livekit_api_key" {
  name         = "livekit-api-key"
  value        = var.livekit_api_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "livekit_api_secret" {
  name         = "livekit-api-secret"
  value        = var.livekit_api_secret
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "registry_password" {
  name         = "registry-password"
  value        = var.registry_password
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_container_app" "backend" {
  name                         = local.backend_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server               = var.registry_server
    username             = var.registry_username
    password_secret_name = "registry-password" # gitleaks:allow - Key Vault reference name
  }

  secret {
    name                = "registry-password"
    key_vault_secret_id = azurerm_key_vault_secret.registry_password.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }
  secret {
    name                = "database-url"
    key_vault_secret_id = azurerm_key_vault_secret.database_url.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }
  secret {
    name                = "jwt-secret"
    key_vault_secret_id = azurerm_key_vault_secret.jwt.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }
  secret {
    name                = "storage-key"
    key_vault_secret_id = azurerm_key_vault_secret.storage_key.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }
  secret {
    name                = "email-password"
    key_vault_secret_id = azurerm_key_vault_secret.email_password.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }
  secret {
    name                = "resend-api-key"
    key_vault_secret_id = azurerm_key_vault_secret.resend_api_key.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }
  secret {
    name                = "livekit-api-key"
    key_vault_secret_id = azurerm_key_vault_secret.livekit_api_key.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }
  secret {
    name                = "livekit-api-secret"
    key_vault_secret_id = azurerm_key_vault_secret.livekit_api_secret.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  ingress {
    external_enabled = true
    target_port      = 4000
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.backend_min_replicas
    max_replicas = var.backend_max_replicas

    http_scale_rule {
      name                = "http-concurrency"
      concurrent_requests = 75
    }

    container {
      name   = "backend"
      image  = var.backend_image
      cpu    = 1
      memory = "2Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "4000"
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
      env {
        name  = "APP_URL"
        value = local.frontend_url
      }
      env {
        name  = "API_BASE_URL"
        value = local.api_url
      }
      env {
        name  = "CORS_ORIGINS"
        value = local.frontend_url
      }
      env {
        name  = "TRUST_PROXY_HOPS"
        value = "1"
      }
      env {
        name  = "COOKIE_SAME_SITE"
        value = "lax"
      }
      env {
        name  = "LOG_LEVEL"
        value = "INFO"
      }
      env {
        name  = "CRON_TIMEZONE"
        value = "Asia/Kolkata"
      }
      env {
        name  = "ALLOW_SELF_ENROLLMENT"
        value = tostring(var.allow_self_enrollment)
      }
      env {
        name  = "EMAIL_HOST"
        value = var.email_host
      }
      env {
        name  = "EMAIL_PORT"
        value = tostring(var.email_port)
      }
      env {
        name  = "EMAIL_USER"
        value = var.email_user
      }
      env {
        name        = "EMAIL_PASS"
        secret_name = "email-password"
      }
      env {
        name        = "RESEND_API_KEY"
        secret_name = "resend-api-key"
      }
      env {
        name  = "RESEND_FROM_EMAIL"
        value = var.resend_from_email
      }
      env {
        name  = "RESEND_FROM_NAME"
        value = var.resend_from_name
      }
      env {
        name  = "LOGIN_OTP_ENABLED"
        value = tostring(var.login_otp_enabled)
      }
      env {
        name  = "SUPPORT_EMAIL"
        value = var.support_email
      }
      env {
        name  = "GRIEVANCE_EMAIL"
        value = var.grievance_email
      }
      env {
        name  = "STORAGE_DRIVER"
        value = "azure"
      }
      env {
        name  = "AZURE_STORAGE_ACCOUNT"
        value = azurerm_storage_account.main.name
      }
      env {
        name        = "AZURE_STORAGE_KEY"
        secret_name = "storage-key"
      }
      env {
        name  = "AZURE_PUBLIC_CONTAINER"
        value = azurerm_storage_container.public.name
      }
      env {
        name  = "AZURE_PRIVATE_CONTAINER"
        value = azurerm_storage_container.private.name
      }
      env {
        name  = "LIVEKIT_API_URL"
        value = var.livekit_api_url
      }
      env {
        name  = "LIVEKIT_WS_URL"
        value = var.livekit_ws_url
      }
      env {
        name        = "LIVEKIT_API_KEY"
        secret_name = "livekit-api-key"
      }
      env {
        name        = "LIVEKIT_API_SECRET"
        secret_name = "livekit-api-secret"
      }
      env {
        name  = "LIVEKIT_MAX_PARTICIPANTS"
        value = "300"
      }
      env {
        name  = "LIVEKIT_STUDENTS_CAN_PUBLISH"
        value = "false"
      }
      env {
        name  = "RELEASE"
        value = var.release
      }

      liveness_probe {
        transport               = "HTTP"
        port                    = 4000
        path                    = "/health/live"
        interval_seconds        = 20
        timeout                 = 5
        failure_count_threshold = 3
      }

      readiness_probe {
        transport               = "HTTP"
        port                    = 4000
        path                    = "/health/ready"
        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 6
      }
    }
  }

  depends_on = [azurerm_postgresql_flexible_server_database.main]
}

resource "azurerm_container_app" "frontend" {
  name                         = local.frontend_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server               = var.registry_server
    username             = var.registry_username
    password_secret_name = "registry-password" # gitleaks:allow - Key Vault reference name
  }

  secret {
    name                = "registry-password"
    key_vault_secret_id = azurerm_key_vault_secret.registry_password.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.frontend_min_replicas
    max_replicas = var.frontend_max_replicas

    http_scale_rule {
      name                = "http-concurrency"
      concurrent_requests = 100
    }

    container {
      name   = "frontend"
      image  = var.frontend_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "API_URL"
        value = local.api_url
      }
      env {
        name  = "RELEASE"
        value = var.release
      }
      env {
        name  = "COMPANY_LEGAL_NAME"
        value = var.company_legal_name
      }
      env {
        name  = "LEGAL_ADDRESS"
        value = var.legal_address
      }
      env {
        name  = "SUPPORT_EMAIL"
        value = var.support_email
      }
      env {
        name  = "SUPPORT_PHONE"
        value = var.support_phone
      }
      env {
        name  = "GRIEVANCE_OFFICER_NAME"
        value = var.grievance_officer_name
      }
      env {
        name  = "GRIEVANCE_EMAIL"
        value = var.grievance_email
      }
      env {
        name  = "CIN"
        value = var.cin
      }
      env {
        name  = "GSTIN"
        value = var.gstin
      }
      env {
        name  = "REQUIRE_LEGAL_CONFIG"
        value = tostring(local.production)
      }

      liveness_probe {
        transport               = "HTTP"
        port                    = 80
        path                    = "/healthz"
        interval_seconds        = 20
        timeout                 = 5
        failure_count_threshold = 3
      }

      readiness_probe {
        transport               = "HTTP"
        port                    = 80
        path                    = "/healthz"
        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 3
      }
    }
  }
}

resource "azurerm_monitor_action_group" "main" {
  count               = var.alert_email == "" ? 0 : 1
  name                = "ag-${local.stem}"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = substr("jecc${var.environment}", 0, 12)

  email_receiver {
    name                    = "operations"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }
}

resource "azurerm_monitor_metric_alert" "postgres_cpu" {
  count               = var.alert_email == "" ? 0 : 1
  name                = "${local.stem}-postgres-cpu"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_postgresql_flexible_server.main.id]
  description         = "PostgreSQL CPU exceeded 80 percent."
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main[0].id
  }
}

resource "azurerm_monitor_metric_alert" "postgres_storage" {
  count               = var.alert_email == "" ? 0 : 1
  name                = "${local.stem}-postgres-storage"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_postgresql_flexible_server.main.id]
  description         = "PostgreSQL storage exceeded 80 percent."
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "storage_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main[0].id
  }
}
