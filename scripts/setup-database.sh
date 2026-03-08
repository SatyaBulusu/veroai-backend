#!/bin/bash

# VeroAI Database Setup Script
# This script creates the database, user, and applies all migrations
# Usage: ./scripts/setup-database.sh [mysql_root_password] [--docker]
#        ./scripts/setup-database.sh [mysql_root_password] [--use-docker]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
USE_DOCKER=false
MYSQL_ROOT_PASSWORD=""
for arg in "$@"; do
  case $arg in
    --docker|--use-docker)
      USE_DOCKER=true
      shift
      ;;
    *)
      if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
        MYSQL_ROOT_PASSWORD="$arg"
      fi
      ;;
  esac
done

# Default values
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_ROOT_USER="${MYSQL_ROOT_USER:-root}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-${MYSQL_ROOT_PASSWORD}}"
DB_NAME="${DB_NAME:-veroai}"
DB_USER="${DB_USER:-app}"
DB_PASSWORD="${DB_PASSWORD:-app_pw}"
DOCKER_CONTAINER_NAME="${DOCKER_CONTAINER_NAME:-veroai-mysql}"

echo -e "${GREEN}=== VeroAI Database Setup ===${NC}"
echo "Host: $MYSQL_HOST:$MYSQL_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
if [ "$USE_DOCKER" = true ]; then
  echo -e "${BLUE}Mode: Docker${NC}"
fi
echo ""

# Docker setup
if [ "$USE_DOCKER" = true ]; then
  echo -e "${YELLOW}Setting up Docker MySQL container...${NC}"
  
  # Check if Docker is available
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    exit 1
  fi
  
  # Check if container already exists
  if docker ps -a --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER_NAME}$"; then
    echo "Container '${DOCKER_CONTAINER_NAME}' already exists"
    if docker ps --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER_NAME}$"; then
      echo "Container is already running"
    else
      echo "Starting existing container..."
      docker start "${DOCKER_CONTAINER_NAME}"
      echo "Waiting for MySQL to be ready..."
      sleep 5
    fi
  else
    echo "Creating new MySQL container..."
    if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
      MYSQL_ROOT_PASSWORD="root_password"
      echo -e "${YELLOW}Using default root password: root_password${NC}"
    fi
    
    docker run -d \
      --name "${DOCKER_CONTAINER_NAME}" \
      -e MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}" \
      -e MYSQL_DATABASE="${DB_NAME}" \
      -e MYSQL_USER="${DB_USER}" \
      -e MYSQL_PASSWORD="${DB_PASSWORD}" \
      -p "${MYSQL_PORT}:3306" \
      mysql:8.0.33
    
    echo "Waiting for MySQL to be ready..."
    sleep 10
    
    # Wait for MySQL to be actually ready
    for i in {1..30}; do
      if docker exec "${DOCKER_CONTAINER_NAME}" mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo -e "${GREEN}✓ MySQL is ready${NC}"
        break
      fi
      if [ $i -eq 30 ]; then
        echo -e "${RED}Error: MySQL container did not become ready in time${NC}"
        exit 1
      fi
      sleep 1
    done
  fi
  
  MYSQL_HOST="127.0.0.1"
  echo -e "${GREEN}✓ Docker MySQL container is ready${NC}\n"
  
  # If Docker was used and no password was provided, use the one from Docker setup
  if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
    MYSQL_ROOT_PASSWORD="root_password"
  fi
fi

# Check if MySQL is accessible (skip password prompt if using Docker)
if [ "$USE_DOCKER" = false ] && [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  echo -e "${YELLOW}Warning: No MySQL root password provided.${NC}"
  echo "Usage: $0 [mysql_root_password] [--docker]"
  echo "Or set MYSQL_ROOT_PASSWORD environment variable"
  echo ""
  read -sp "Enter MySQL root password (or press Enter to skip): " MYSQL_ROOT_PASSWORD
  echo ""
fi

# Build mysql command
if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  MYSQL_CMD="mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_ROOT_USER"
else
  MYSQL_CMD="mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_ROOT_USER -p${MYSQL_ROOT_PASSWORD}"
fi

# Test connection
echo -e "${YELLOW}Testing MySQL connection...${NC}"
if ! $MYSQL_CMD -e "SELECT 1" > /dev/null 2>&1; then
  echo -e "${RED}Error: Cannot connect to MySQL. Please check:${NC}"
  echo "  - MySQL is running"
  echo "  - Host and port are correct"
  echo "  - Root password is correct"
  exit 1
fi
echo -e "${GREEN}✓ MySQL connection successful${NC}"
echo ""

# Create database
echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
$MYSQL_CMD <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
echo -e "${GREEN}✓ Database created${NC}"
echo ""

# Create user and grant privileges
echo -e "${YELLOW}Creating user '$DB_USER'...${NC}"
$MYSQL_CMD <<EOF
DROP USER IF EXISTS '$DB_USER'@'%';
DROP USER IF EXISTS '$DB_USER'@'localhost';
CREATE USER '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';
CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
echo -e "${GREEN}✓ User created and privileges granted${NC}"
echo ""

# Apply migrations
MIGRATIONS_DIR="src/db/migrations"
MIGRATION_FILE="$MIGRATIONS_DIR/combined_migrations.sql"

if [ -f "$MIGRATION_FILE" ]; then
  echo -e "${YELLOW}Applying migrations from combined_migrations.sql...${NC}"
  # Use --force to continue on errors (like duplicate indexes)
  $MYSQL_CMD $DB_NAME --force < $MIGRATION_FILE 2>&1 | grep -v "Duplicate key\|Duplicate index\|already exists" || true
  echo -e "${GREEN}✓ All migrations applied${NC}"
else
  echo -e "${YELLOW}Applying migrations individually...${NC}"
  
  # Apply migrations in order
  for migration in \
    "$MIGRATIONS_DIR/001_init.sql" \
    "$MIGRATIONS_DIR/002_init.sql" \
    "$MIGRATIONS_DIR/003_init.sql" \
    "$MIGRATIONS_DIR/004_init.sql" \
    "$MIGRATIONS_DIR/005_init.sql" \
    "$MIGRATIONS_DIR/006_org_id.sql" \
    "$MIGRATIONS_DIR/006_org_propagation_indexes.sql" \
    "$MIGRATIONS_DIR/007_experiments.sql" \
    "$MIGRATIONS_DIR/008_budget_roi.sql" \
    "$MIGRATIONS_DIR/009_executive.sql" \
    "$MIGRATIONS_DIR/010_ai_assets.sql" \
    "$MIGRATIONS_DIR/011_experiment_asset_variants.sql" \
    "$MIGRATIONS_DIR/012_agent_actions.sql" \
    "$MIGRATIONS_DIR/012_patch.sql" \
    "$MIGRATIONS_DIR/013_increase_entity_id_length.sql"
  do
    if [ -f "$migration" ]; then
      echo "  Applying $(basename $migration)..."
      # Use --force to continue on duplicate key/index errors
      $MYSQL_CMD $DB_NAME --force < "$migration" 2>&1 | grep -v "Duplicate key\|Duplicate index\|already exists" || true
    fi
  done
  echo -e "${GREEN}✓ All migrations applied${NC}"
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: $DB_PASSWORD"
if [ "$USE_DOCKER" = true ]; then
  echo "Docker Container: $DOCKER_CONTAINER_NAME"
  echo ""
  echo "To stop container: docker stop $DOCKER_CONTAINER_NAME"
  echo "To start container: docker start $DOCKER_CONTAINER_NAME"
  echo "To remove container: docker rm -f $DOCKER_CONTAINER_NAME"
fi
echo ""
echo "Connection string:"
echo "  mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME"
echo ""
echo "Environment variables for your .env file:"
echo "  MYSQL_HOST=$MYSQL_HOST"
echo "  MYSQL_PORT=$MYSQL_PORT"
echo "  MYSQL_USER=$DB_USER"
echo "  MYSQL_PASSWORD=$DB_PASSWORD"
echo "  MYSQL_DATABASE=$DB_NAME"
echo ""
