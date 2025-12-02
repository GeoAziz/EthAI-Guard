#!/usr/bin/env bash
################################################################################
# Secret Rotation Script for EthixAI-Guard
# 
# Usage:
#   ./scripts/rotate-secrets.sh <secret-type> <environment> [options]
#
# Examples:
#   ./scripts/rotate-secrets.sh jwt production
#   ./scripts/rotate-secrets.sh database staging --dry-run
#   ./scripts/rotate-secrets.sh all production --backup
#
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/secret-rotation-${TIMESTAMP}.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[✓]${NC} $*" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[⚠]${NC} $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[✗]${NC} $*" | tee -a "$LOG_FILE"
}

fatal() {
    error "$*"
    exit 1
}

# Usage information
usage() {
    cat <<EOF
Usage: $0 <secret-type> <environment> [options]

Secret Types:
  jwt           - JWT signing secret
  session       - Session secret
  database      - Database credentials
  firebase      - Firebase service account
  api-keys      - Third-party API keys
  all           - Rotate all secrets

Environments:
  development   - Local development
  staging       - Staging environment
  production    - Production environment

Options:
  --dry-run     - Show what would be done without making changes
  --backup      - Create backup of old secrets
  --force       - Skip confirmation prompts
  --help        - Show this help message

Examples:
  $0 jwt production
  $0 database staging --dry-run
  $0 all production --backup --force

EOF
    exit 0
}

# Parse arguments
SECRET_TYPE=""
ENVIRONMENT=""
DRY_RUN=false
BACKUP=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --backup)
            BACKUP=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            if [[ -z "$SECRET_TYPE" ]]; then
                SECRET_TYPE="$1"
            elif [[ -z "$ENVIRONMENT" ]]; then
                ENVIRONMENT="$1"
            else
                fatal "Unknown argument: $1"
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [[ -z "$SECRET_TYPE" ]] || [[ -z "$ENVIRONMENT" ]]; then
    error "Missing required arguments"
    usage
fi

# Validate environment
case "$ENVIRONMENT" in
    development|staging|production)
        ;;
    *)
        fatal "Invalid environment: $ENVIRONMENT (must be: development, staging, production)"
        ;;
esac

# Banner
log "╔════════════════════════════════════════════════════════════╗"
log "║        EthixAI-Guard Secret Rotation Tool                 ║"
log "╚════════════════════════════════════════════════════════════╝"
log ""
log "Secret Type:  $SECRET_TYPE"
log "Environment:  $ENVIRONMENT"
log "Dry Run:      $DRY_RUN"
log "Backup:       $BACKUP"
log "Log File:     $LOG_FILE"
log ""

# Confirmation prompt
if [[ "$FORCE" == "false" ]] && [[ "$DRY_RUN" == "false" ]]; then
    read -p "⚠️  This will rotate secrets in $ENVIRONMENT. Continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Operation cancelled by user"
        exit 0
    fi
fi

# Secret generation functions
generate_secret() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d '\n'
}

generate_hex() {
    local length="${1:-32}"
    openssl rand -hex "$length" | tr -d '\n'
}

# Backup function
backup_secret() {
    local secret_name="$1"
    local secret_value="$2"
    
    if [[ "$BACKUP" == "true" ]]; then
        local backup_dir="/tmp/ethixai-secrets-backup-${TIMESTAMP}"
        mkdir -p "$backup_dir"
        echo "$secret_value" > "$backup_dir/${secret_name}.backup"
        chmod 600 "$backup_dir/${secret_name}.backup"
        success "Backed up $secret_name to $backup_dir"
    fi
}

# Docker Compose secret update
update_docker_secret() {
    local secret_name="$1"
    local secret_value="$2"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would update Docker secret: $secret_name"
        return 0
    fi
    
    log "Updating Docker secret: $secret_name"
    
    # Create temporary secret file
    local temp_file=$(mktemp)
    echo "$secret_value" > "$temp_file"
    chmod 600 "$temp_file"
    
    # Update secret (Docker Swarm)
    if docker secret inspect "$secret_name" &>/dev/null; then
        docker secret rm "$secret_name" || warn "Failed to remove old secret"
    fi
    
    docker secret create "$secret_name" "$temp_file"
    rm -f "$temp_file"
    
    success "Docker secret updated: $secret_name"
}

# Environment variable update (for docker-compose)
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    local env_file="${3:-.env.${ENVIRONMENT}}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would update ${var_name} in ${env_file}"
        return 0
    fi
    
    if [[ ! -f "$env_file" ]]; then
        warn "Environment file not found: $env_file"
        return 1
    fi
    
    # Backup old value
    if grep -q "^${var_name}=" "$env_file"; then
        local old_value=$(grep "^${var_name}=" "$env_file" | cut -d'=' -f2-)
        backup_secret "${var_name}_${ENVIRONMENT}" "$old_value"
    fi
    
    # Update or add variable
    if grep -q "^${var_name}=" "$env_file"; then
        sed -i.bak "s|^${var_name}=.*|${var_name}=${var_value}|" "$env_file"
    else
        echo "${var_name}=${var_value}" >> "$env_file"
    fi
    
    rm -f "${env_file}.bak"
    success "Updated ${var_name} in ${env_file}"
}

# Kubernetes secret update
update_k8s_secret() {
    local secret_name="$1"
    local key="$2"
    local value="$3"
    local namespace="${4:-default}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would update K8s secret: ${secret_name}/${key}"
        return 0
    fi
    
    if ! command -v kubectl &>/dev/null; then
        warn "kubectl not found, skipping K8s secret update"
        return 1
    fi
    
    # Check if secret exists
    if kubectl get secret "$secret_name" -n "$namespace" &>/dev/null; then
        # Update existing secret
        kubectl patch secret "$secret_name" -n "$namespace" \
            --type='json' \
            -p="[{\"op\": \"replace\", \"path\": \"/data/${key}\", \"value\": \"$(echo -n "$value" | base64)\"}]"
    else
        # Create new secret
        kubectl create secret generic "$secret_name" -n "$namespace" \
            --from-literal="${key}=${value}"
    fi
    
    success "Updated K8s secret: ${secret_name}/${key}"
}

# Restart services
restart_services() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would restart services"
        return 0
    fi
    
    log "Restarting services to apply new secrets..."
    
    cd "$REPO_ROOT"
    
    # Choose restart method based on environment
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose restart
        success "Services restarted via docker-compose"
    elif command -v kubectl &>/dev/null; then
        kubectl rollout restart deployment -n default
        success "Services restarted via kubectl"
    else
        warn "No restart method available, manual restart may be required"
    fi
}

# Verify services
verify_services() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[DRY RUN] Would verify services"
        return 0
    fi
    
    log "Verifying service health..."
    
    local endpoints=(
        "http://localhost:5000/health"
        "http://localhost:8100/health"
        "http://localhost:3000"
    )
    
    local failed=0
    for endpoint in "${endpoints[@]}"; do
        if curl -sf "$endpoint" &>/dev/null; then
            success "✓ $endpoint"
        else
            error "✗ $endpoint"
            ((failed++))
        fi
    done
    
    if [[ $failed -eq 0 ]]; then
        success "All services healthy"
        return 0
    else
        error "$failed service(s) unhealthy"
        return 1
    fi
}

# Secret rotation functions
rotate_jwt_secret() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Rotating JWT Secret"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local new_secret=$(generate_secret 32)
    
    update_env_var "JWT_SECRET" "$new_secret"
    update_docker_secret "jwt_secret" "$new_secret" 2>/dev/null || true
    update_k8s_secret "ethixai-secrets" "jwt-secret" "$new_secret" 2>/dev/null || true
    
    success "JWT secret rotated successfully"
}

rotate_session_secret() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Rotating Session Secret"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local new_secret=$(generate_secret 32)
    
    update_env_var "SESSION_SECRET" "$new_secret"
    update_docker_secret "session_secret" "$new_secret" 2>/dev/null || true
    update_k8s_secret "ethixai-secrets" "session-secret" "$new_secret" 2>/dev/null || true
    
    success "Session secret rotated successfully"
}

rotate_database_secrets() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Rotating Database Secrets"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    warn "Database password rotation requires manual intervention"
    warn "Please follow the procedure in docs/SECRETS_MANAGEMENT.md"
    
    # Generate new password suggestion
    local new_password=$(generate_secret 32)
    log "Suggested new password (save securely): [REDACTED]"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        log "Steps:"
        log "1. Create new database user with password: $new_password"
        log "2. Test connection with new credentials"
        log "3. Update MONGODB_URI and POSTGRES_URI"
        log "4. Restart services"
        log "5. Remove old database user"
    fi
}

rotate_firebase_secrets() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Rotating Firebase Service Account"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    warn "Firebase service account rotation requires manual steps"
    warn "Please follow the procedure in docs/SECRETS_MANAGEMENT.md"
    
    log "Steps:"
    log "1. Go to Firebase Console > Project Settings > Service Accounts"
    log "2. Generate new private key"
    log "3. Download JSON key file"
    log "4. Update GOOGLE_APPLICATION_CREDENTIALS path"
    log "5. Restart services"
    log "6. Delete old service account"
}

rotate_api_keys() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Rotating API Keys"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    warn "API key rotation requires provider-specific actions"
    
    local keys=(
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
        "PINECONE_API_KEY"
    )
    
    for key in "${keys[@]}"; do
        log "- $key: Rotate in provider console, then update here"
    done
}

# Main rotation logic
case "$SECRET_TYPE" in
    jwt)
        rotate_jwt_secret
        ;;
    session)
        rotate_session_secret
        ;;
    database)
        rotate_database_secrets
        ;;
    firebase)
        rotate_firebase_secrets
        ;;
    api-keys)
        rotate_api_keys
        ;;
    all)
        rotate_jwt_secret
        rotate_session_secret
        rotate_database_secrets
        rotate_firebase_secrets
        rotate_api_keys
        ;;
    *)
        fatal "Unknown secret type: $SECRET_TYPE"
        ;;
esac

# Restart and verify
if [[ "$DRY_RUN" == "false" ]] && [[ "$SECRET_TYPE" != "database" ]] && [[ "$SECRET_TYPE" != "firebase" ]] && [[ "$SECRET_TYPE" != "api-keys" ]]; then
    log ""
    restart_services
    
    log ""
    verify_services
fi

# Summary
log ""
log "╔════════════════════════════════════════════════════════════╗"
log "║                  Rotation Complete                         ║"
log "╚════════════════════════════════════════════════════════════╝"
log ""
log "Summary:"
log "  Secret Type:  $SECRET_TYPE"
log "  Environment:  $ENVIRONMENT"
log "  Status:       ${GREEN}SUCCESS${NC}"
log "  Log File:     $LOG_FILE"
log ""

if [[ "$BACKUP" == "true" ]]; then
    log "Backups saved to: /tmp/ethixai-secrets-backup-${TIMESTAMP}"
fi

log ""
log "Next steps:"
log "  1. Verify application functionality"
log "  2. Monitor logs for any issues"
log "  3. Document rotation in audit log"
log "  4. Update rotation schedule tracker"
log ""

success "Secret rotation completed successfully!"
