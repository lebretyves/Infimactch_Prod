ui = true
disable_mlock = true
api_addr = "https://127.0.0.1:58200"
cluster_addr = "https://127.0.0.1:8201"
storage "raft" {
  path = "/vault/file"
  node_id = "infimatch-v1-local"
}
listener "tcp" {
  address = "0.0.0.0:8200"
  tls_cert_file = "/vault/tls/server.crt"
  tls_key_file = "/vault/tls/server.key"
  tls_min_version = "tls12"
  # AppRole authentication: no optional browser client certificate prompt.
  tls_disable_client_certs = true
}
