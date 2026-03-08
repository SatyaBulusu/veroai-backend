-- VeroAI Database Setup SQL Script
-- Run this with: mysql -u root -p < scripts/setup-database.sql
-- Or: mysql -u root -p -e "source scripts/setup-database.sql"

-- Configuration (change these if needed)
SET @db_name = 'veroai';
SET @db_user = 'app';
SET @db_password = 'app_pw';

-- Create database
DROP DATABASE IF EXISTS veroai;
CREATE DATABASE veroai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE veroai;

-- Create user and grant privileges
DROP USER IF EXISTS 'app'@'%';
DROP USER IF EXISTS 'app'@'localhost';
CREATE USER 'app'@'%' IDENTIFIED BY 'app_pw';
CREATE USER 'app'@'localhost' IDENTIFIED BY 'app_pw';
GRANT ALL PRIVILEGES ON veroai.* TO 'app'@'%';
GRANT ALL PRIVILEGES ON veroai.* TO 'app'@'localhost';
FLUSH PRIVILEGES;

-- Note: After running this script, apply migrations:
-- mysql -u root -p veroai < src/db/migrations/combined_migrations.sql
-- Or run the setup-database.sh script which does both
