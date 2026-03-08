# VeroAI Backend

## Local setup (quick)
1. Install Node.js (>=18) and MySQL (>=8)
2. Create DB:
   CREATE DATABASE veroai;
3. Apply schema:
   mysql -u root -p veroai < src/db/migrations/001_init.sql
   mysql -u root -p veroai < src/db/migrations/002_init.sql
   mysql -u root -p veroai < src/db/migrations/003_init.sql
4. Configure env:
   cp .env.example .env
5. Run:
   npm install
   npm run dev

Health check:
GET http://localhost:3000/health
