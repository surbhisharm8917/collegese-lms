output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "frontend_url" {
  value = local.frontend_url
}

output "api_url" {
  value = local.api_url
}

output "postgres_server" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_server_name" {
  value = azurerm_postgresql_flexible_server.main.name
}

output "storage_account" {
  value = azurerm_storage_account.main.name
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}
