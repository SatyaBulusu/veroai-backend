# VeroAI Backend

## Local setup (quick)

### Option 1: Automated Setup (Recommended)

1. Install Node.js (>=18) and MySQL (>=8)
2. Run the database setup script:
   ```bash
   # Using Node.js script (cross-platform)
   node scripts/setup-database.js [mysql_root_password]
   
   # Or using shell script (Unix/Mac)
   ./scripts/setup-database.sh [mysql_root_password]
   ```
   This will create the database, user, and apply all migrations automatically.

3. Configure env:
   ```bash
   cp .env.example .env
   # Edit .env with your MySQL credentials
   ```

4. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

### Option 2: Manual Setup

1. Install Node.js (>=18) and MySQL (>=8)
2. Create DB and user:
   ```sql
   CREATE DATABASE veroai;
   CREATE USER 'app'@'localhost' IDENTIFIED BY 'app_pw';
   GRANT ALL PRIVILEGES ON veroai.* TO 'app'@'localhost';
   ```
3. Apply all migrations:
   ```bash
   mysql -u root -p veroai < src/db/migrations/combined_migrations.sql
   ```
4. Configure env:
   ```bash
   cp .env.example .env
   ```
5. Run:
   ```bash
   npm install
   npm run dev
   ```

## Database Setup Scripts

See `scripts/README.md` for detailed information about database setup scripts.

## Health check

GET http://localhost:3000/health
