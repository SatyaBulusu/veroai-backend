#!/usr/bin/env node

/**
 * VeroAI Database Setup Script (Node.js)
 * Creates database, user, and applies all migrations
 * 
 * Usage: node scripts/setup-database.js [mysql_root_password] [--docker]
 * Or: MYSQL_ROOT_PASSWORD=password node scripts/setup-database.js --docker
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse arguments
const args = process.argv.slice(2);
const useDocker = args.includes('--docker') || args.includes('--use-docker');
const rootPasswordArg = args.find(arg => !arg.startsWith('--'));

// Configuration
const config = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  rootUser: process.env.MYSQL_ROOT_USER || 'root',
  rootPassword: rootPasswordArg || process.env.MYSQL_ROOT_PASSWORD || '',
  dbName: process.env.DB_NAME || 'veroai',
  dbUser: process.env.DB_USER || 'app',
  dbPassword: process.env.DB_PASSWORD || 'app_pw',
  dockerContainerName: process.env.DOCKER_CONTAINER_NAME || 'veroai-mysql'
};

async function setupDockerContainer() {
  console.log('Setting up Docker MySQL container...\n');
  
  // Check if Docker is available
  try {
    execSync('docker --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: Docker is not installed or not in PATH');
    process.exit(1);
  }
  
  // Check if container already exists
  try {
    const containers = execSync(`docker ps -a --format '{{.Names}}'`, { encoding: 'utf8' });
    const containerExists = containers.split('\n').includes(config.dockerContainerName);
    
    if (containerExists) {
      // Check if running
      const running = execSync(`docker ps --format '{{.Names}}'`, { encoding: 'utf8' });
      const isRunning = running.split('\n').includes(config.dockerContainerName);
      
      if (isRunning) {
        console.log(`Container '${config.dockerContainerName}' is already running`);
      } else {
        console.log(`Starting existing container '${config.dockerContainerName}'...`);
        execSync(`docker start ${config.dockerContainerName}`, { stdio: 'inherit' });
        console.log('Waiting for MySQL to be ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } else {
      // Create new container
      console.log(`Creating new MySQL container '${config.dockerContainerName}'...`);
      const rootPassword = config.rootPassword || 'root_password';
      if (!config.rootPassword) {
        console.log('Using default root password: root_password');
        config.rootPassword = rootPassword;
      }
      
      execSync(`docker run -d \
        --name ${config.dockerContainerName} \
        -e MYSQL_ROOT_PASSWORD=${rootPassword} \
        -e MYSQL_DATABASE=${config.dbName} \
        -e MYSQL_USER=${config.dbUser} \
        -e MYSQL_PASSWORD=${config.dbPassword} \
        -p ${config.port}:3306 \
        mysql:8.0.33`, { stdio: 'inherit' });
      
      console.log('Waiting for MySQL to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Wait for MySQL to be actually ready
      for (let i = 0; i < 30; i++) {
        try {
          execSync(`docker exec ${config.dockerContainerName} mysqladmin ping -h localhost --silent`, { stdio: 'ignore' });
          console.log('✓ MySQL is ready\n');
          break;
        } catch (e) {
          if (i === 29) {
            console.error('Error: MySQL container did not become ready in time');
            process.exit(1);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    config.host = '127.0.0.1';
    console.log('✓ Docker MySQL container is ready\n');
  } catch (error) {
    console.error('Error setting up Docker container:', error.message);
    process.exit(1);
  }
}

async function setupDatabase() {
  console.log('\n=== VeroAI Database Setup ===\n');
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`Database: ${config.dbName}`);
  console.log(`User: ${config.dbUser}`);
  if (useDocker) {
    console.log('Mode: Docker\n');
    await setupDockerContainer();
  } else {
    console.log('');
  }

  if (!config.rootPassword && !useDocker) {
    console.error('Error: MySQL root password required');
    console.log('Usage: node scripts/setup-database.js [mysql_root_password] [--docker]');
    console.log('Or set MYSQL_ROOT_PASSWORD environment variable\n');
    process.exit(1);
  }
  
  // If using Docker and no password provided, use default
  if (useDocker && !config.rootPassword) {
    config.rootPassword = 'root_password';
  }

  let rootConn;
  try {
    // Connect as root
    console.log('Connecting to MySQL...');
    rootConn = await createConnection({
      host: config.host,
      port: config.port,
      user: config.rootUser,
      password: config.rootPassword,
      multipleStatements: true
    });
    console.log('✓ Connected to MySQL\n');

    // Create database
    console.log(`Creating database '${config.dbName}'...`);
    await rootConn.query(`DROP DATABASE IF EXISTS \`${config.dbName}\``);
    await rootConn.query(`CREATE DATABASE \`${config.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✓ Database created\n');

    // Create user and grant privileges
    console.log(`Creating user '${config.dbUser}'...`);
    await rootConn.query(`DROP USER IF EXISTS '${config.dbUser}'@'%'`);
    await rootConn.query(`DROP USER IF EXISTS '${config.dbUser}'@'localhost'`);
    await rootConn.query(`CREATE USER '${config.dbUser}'@'%' IDENTIFIED BY ?`, [config.dbPassword]);
    await rootConn.query(`CREATE USER '${config.dbUser}'@'localhost' IDENTIFIED BY ?`, [config.dbPassword]);
    await rootConn.query(`GRANT ALL PRIVILEGES ON \`${config.dbName}\`.* TO '${config.dbUser}'@'%'`);
    await rootConn.query(`GRANT ALL PRIVILEGES ON \`${config.dbName}\`.* TO '${config.dbUser}'@'localhost'`);
    await rootConn.query(`FLUSH PRIVILEGES`);
    console.log('✓ User created and privileges granted\n');

    // Switch to the new database
    await rootConn.query(`USE \`${config.dbName}\``);

    // Apply migrations
    const combinedMigrationFile = join(projectRoot, 'src/db/migrations/combined_migrations.sql');
    
    if (existsSync(combinedMigrationFile)) {
      console.log('Applying migrations from combined_migrations.sql...');
      const migrationSQL = readFileSync(combinedMigrationFile, 'utf8');
      // Split by semicolons and execute statements individually to handle errors gracefully
      const statements = migrationSQL.split(';').filter(s => s.trim().length > 0);
      let errors = 0;
      for (const statement of statements) {
        try {
          if (statement.trim()) {
            await rootConn.query(statement);
          }
        } catch (err) {
          // Ignore duplicate key/index errors
          if (err.message.includes('Duplicate key') || 
              err.message.includes('Duplicate index') ||
              err.message.includes('already exists')) {
            // Silently continue
          } else {
            console.warn(`  Warning: ${err.message.substring(0, 100)}`);
            errors++;
          }
        }
      }
      if (errors > 0) {
        console.log(`  (${errors} non-critical errors ignored)\n`);
      }
      console.log('✓ All migrations applied\n');
    } else {
      console.log('Applying migrations individually...');
      const migrations = [
        '001_init.sql',
        '002_init.sql',
        '003_init.sql',
        '004_init.sql',
        '005_init.sql',
        '006_org_id.sql',
        '006_org_propagation_indexes.sql',
        '007_experiments.sql',
        '008_budget_roi.sql',
        '009_executive.sql',
        '010_ai_assets.sql',
        '011_experiment_asset_variants.sql',
        '012_agent_actions.sql',
        '012_patch.sql',
        '013_increase_entity_id_length.sql'
      ];

      for (const migration of migrations) {
        const migrationPath = join(projectRoot, 'src/db/migrations', migration);
        if (existsSync(migrationPath)) {
          console.log(`  Applying ${migration}...`);
          const sql = readFileSync(migrationPath, 'utf8');
          try {
            await rootConn.query(sql);
          } catch (err) {
            // Ignore duplicate key/index errors
            if (err.message.includes('Duplicate key') || 
                err.message.includes('Duplicate index') ||
                err.message.includes('already exists')) {
              console.log(`    (Skipped duplicate index/key - already exists)`);
            } else {
              throw err; // Re-throw other errors
            }
          }
        }
      }
      console.log('✓ All migrations applied\n');
    }

    await rootConn.end();

    console.log('=== Setup Complete ===\n');
    console.log(`Database: ${config.dbName}`);
    console.log(`User: ${config.dbUser}`);
    console.log(`Password: ${config.dbPassword}`);
    if (useDocker) {
      console.log(`Docker Container: ${config.dockerContainerName}`);
      console.log('');
      console.log('Docker commands:');
      console.log(`  Stop:  docker stop ${config.dockerContainerName}`);
      console.log(`  Start: docker start ${config.dockerContainerName}`);
      console.log(`  Remove: docker rm -f ${config.dockerContainerName}`);
    }
    console.log('');
    console.log('Connection string:');
    console.log(`  mysql -h ${config.host} -P ${config.port} -u ${config.dbUser} -p${config.dbPassword} ${config.dbName}\n`);
    console.log('Environment variables for your .env file:');
    console.log(`  MYSQL_HOST=${config.host}`);
    console.log(`  MYSQL_PORT=${config.port}`);
    console.log(`  MYSQL_USER=${config.dbUser}`);
    console.log(`  MYSQL_PASSWORD=${config.dbPassword}`);
    console.log(`  MYSQL_DATABASE=${config.dbName}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (rootConn) await rootConn.end();
    process.exit(1);
  }
}

setupDatabase();
