# Database Setup Scripts

These scripts help you quickly recreate the VeroAI database, user, and all tables when your MySQL container is restarted.

## Quick Setup

### Option 1: NPM Script (Easiest - Cross-platform) ⭐

```bash
docker-compose up -d    
# From veroai-backend directory
# Regular MySQL
npm run setup-db [mysql_root_password]

# With Docker (automatically creates/starts MySQL container)
npm run setup-db [mysql_root_password] -- --docker

# Or with environment variable
MYSQL_ROOT_PASSWORD=your_password npm run setup-db -- --docker
```

### Option 2: Node.js Script (Cross-platform)

```bash
# From veroai-backend directory
# Regular MySQL
node scripts/setup-database.js [mysql_root_password]

# With Docker (automatically creates/starts MySQL container)
node scripts/setup-database.js [mysql_root_password] --docker

# Or with environment variables
MYSQL_ROOT_PASSWORD=your_password node scripts/setup-database.js --docker
```

### Option 3: Shell Script (Unix/Mac)

```bash
# From veroai-backend directory
# Regular MySQL
./scripts/setup-database.sh [mysql_root_password]

# With Docker (automatically creates/starts MySQL container)
./scripts/setup-database.sh [mysql_root_password] --docker

# Or with environment variables
MYSQL_ROOT_PASSWORD=your_password ./scripts/setup-database.sh --docker
```

### Option 4: SQL Script + Manual Migration

```bash
# Step 1: Create database and user
mysql -u root -p < scripts/setup-database.sql

# Step 2: Apply migrations
mysql -u root -p veroai < src/db/migrations/combined_migrations.sql
```

All scripts will:
1. Create the `veroai` database
2. Create the `app` user with password `app_pw`
3. Grant all privileges
4. Apply all migrations from `combined_migrations.sql` (or individual files if combined doesn't exist)

## Docker MySQL Setup

### Option A: Using Setup Scripts with Docker Flag

The setup scripts now support Docker! Just add `--docker` flag:

```bash
# Automatically creates/starts MySQL container and sets everything up
npm run setup-db root_password -- --docker

# Or with Node.js script
node scripts/setup-database.js root_password --docker

# Or with shell script
./scripts/setup-database.sh root_password --docker
```

The Docker mode will:
1. Check if Docker is installed
2. Create MySQL container if it doesn't exist (or start existing one)
3. Wait for MySQL to be ready
4. Create database, user, and apply all migrations

### Option B: Using Docker Compose

```bash
# Start MySQL container
docker-compose up -d

# Wait for MySQL to be ready, then run setup
npm run setup-db root_password
```

### Option C: Manual Docker Setup

```bash
# Start MySQL container manually
docker run -d \
  --name veroai-mysql \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=veroai \
  -e MYSQL_USER=app \
  -e MYSQL_PASSWORD=app_pw \
  -p 3306:3306 \
  mysql:8.0.33

# Then use the setup script (without --docker flag)
MYSQL_HOST=127.0.0.1 npm run setup-db root_password
```

## Environment Variables

The scripts use these defaults (can be overridden):

- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `MYSQL_ROOT_USER=root`
- `DB_NAME=veroai`
- `DB_USER=app`
- `DB_PASSWORD=app_pw`

## What Gets Created

The setup creates:
- Database: `veroai`
- User: `app` with password `app_pw`
- **All tables from all migrations** (001-013):
  - Campaigns, Content Assets, Approvals
  - Profiles, Events, Revenue Events
  - Attribution (runs, results, contributions)
  - Budgets, Campaign Costs
  - Experiments, AI Assets
  - Executive Insights, Agent Actions
  - Audit Logs, Outbox Events
- All indexes and foreign keys
- Initial seed data (orgs, users, API keys)

## Troubleshooting

### Permission Denied
```bash
chmod +x scripts/setup-database.sh
chmod +x scripts/setup-database.js
```

### MySQL Not Found
Make sure MySQL client is installed:
```bash
# macOS
brew install mysql-client

# Ubuntu/Debian
sudo apt-get install mysql-client
```

### Connection Refused
- Check MySQL is running: `mysqladmin ping -h 127.0.0.1`
- Check port: Default is 3306
- Check firewall settings
- For Docker: Make sure container is running and port is exposed

### User Already Exists
The script will drop and recreate the user, so this should not be an issue.

### Migration Errors
If a migration fails, check:
- Previous migrations were applied successfully
- No conflicting data exists
- MySQL version is 8.0 or higher
