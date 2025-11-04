# Utility Management System - Setup Guide

This guide will walk you through setting up the Utility Management System from scratch.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [Application Setup](#application-setup)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js** (v18 or higher)
  - Download from: https://nodejs.org/
  - Verify: `node --version`

- **npm** or **pnpm** (comes with Node.js)
  - Verify: `npm --version`

- **Microsoft SQL Server**
  - Option 1: Docker (recommended for development)
  - Option 2: SQL Server Express (Windows)
  - Option 3: Azure SQL Database (cloud)

- **Azure Data Studio** or **SQL Server Management Studio** (optional, for database management)
  - Download: https://azure.microsoft.com/en-us/products/data-studio/

---

## Database Setup

### Option 1: Using Docker (Recommended)

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop/

2. **Run SQL Server Container**
   ```bash
   docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong@Passw0rd" \
     -p 1433:1433 --name sql_server \
     -d mcr.microsoft.com/mssql/server:2022-latest
   ```

3. **Verify Container is Running**
   ```bash
   docker ps
   ```

4. **Create Database** (optional, Prisma will create it)
   ```bash
   docker exec -it sql_server /opt/mssql-tools/bin/sqlcmd \
     -S localhost -U SA -P "YourStrong@Passw0rd" \
     -Q "CREATE DATABASE utility_management"
   ```

### Option 2: Local SQL Server Installation

1. **Download SQL Server Express**
   - Download from: https://www.microsoft.com/en-us/sql-server/sql-server-downloads

2. **Install SQL Server**
   - Follow the installation wizard
   - Note down the server name (usually `localhost` or `.\SQLEXPRESS`)

3. **Enable TCP/IP** (if needed)
   - Open SQL Server Configuration Manager
   - Enable TCP/IP protocol
   - Restart SQL Server service

4. **Create Database**
   - Use Azure Data Studio or SSMS
   - Run: `CREATE DATABASE utility_management`

### Option 3: Azure SQL Database

1. **Create Azure SQL Database**
   - Go to Azure Portal
   - Create a new SQL Database
   - Note down the connection string

---

## Application Setup

### 1. Clone or Navigate to Project Directory

```bash
cd /path/to/utility-management-system
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using pnpm (faster):
```bash
pnpm install
```

This will install all required packages including:
- Next.js 14
- Prisma ORM
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- TypeScript types

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# For Docker SQL Server
DATABASE_URL="sqlserver://localhost:1433;database=utility_management;user=sa;password=YourStrong@Passw0rd;encrypt=true;trustServerCertificate=true"

# JWT Secret (change this in production!)
JWT_SECRET="your-secret-key-change-in-production-use-long-random-string"

# Optional: Node Environment
NODE_ENV="development"
```

**Connection String Format**:
```
sqlserver://[user]:[password]@[host]:[port];database=[database_name];encrypt=true;trustServerCertificate=true
```

**Examples**:

Docker:
```
DATABASE_URL="sqlserver://localhost:1433;database=utility_management;user=sa;password=YourStrong@Passw0rd;encrypt=true;trustServerCertificate=true"
```

Local SQL Server (Windows Authentication):
```
DATABASE_URL="sqlserver://localhost;database=utility_management;integratedSecurity=true;trustServerCertificate=true"
```

Local SQL Server (SQL Authentication):
```
DATABASE_URL="sqlserver://localhost;database=utility_management;user=your_user;password=your_password;encrypt=true;trustServerCertificate=true"
```

Azure SQL:
```
DATABASE_URL="sqlserver://your-server.database.windows.net;database=utility_management;user=your_user;password=your_password;encrypt=true"
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

This command:
- Reads the `prisma/schema.prisma` file
- Generates the Prisma Client in `src/generated/prisma`
- Creates TypeScript types for your database models

### 5. Push Database Schema

```bash
npm run db:push
```

This command:
- Creates all tables, relationships, and constraints in the database
- Does NOT run migrations (useful for development)
- Synchronizes your Prisma schema with the database

**What tables are created?**:
- staff
- customers
- utility_types
- meters
- meter_readings
- tariffs
- bills
- payments
- complaints

### 6. Seed the Database

```bash
npm run db:seed
```

This command:
- Populates the database with sample data
- Creates default staff users
- Creates utility types (Electricity, Water, Gas)
- Creates sample tariffs
- Creates sample customers, meters, readings, bills, and payments

**Sample Data Created**:
- 4 Staff members (admin, reader, clerk, manager)
- 3 Utility types
- 7 Tariffs (slab-based)
- 4 Customers (household, business, government)
- 6 Meters
- Multiple meter readings
- 2 Bills
- 2 Payments
- 2 Complaints

---

## Running the Application

### Start Development Server

```bash
npm run dev
```

The server will start at: **http://localhost:3000**

API endpoints are available at: **http://localhost:3000/api**

### View Database (Optional)

Open Prisma Studio to view and edit data:

```bash
npm run db:studio
```

Prisma Studio will open at: **http://localhost:5555**

---

## Verification

### 1. Test Database Connection

Create a test file `test-db.ts`:

```typescript
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.customer.count();
  console.log(`✅ Database connected! Found ${count} customers.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run:
```bash
npx tsx test-db.ts
```

### 2. Test Authentication API

**Login Request**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

**Expected Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "name": "System Administrator",
    "email": "admin@utilityms.com",
    "role": "ADMIN"
  }
}
```

### 3. Test API Endpoint

Use the token from login:

```bash
curl http://localhost:3000/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 4,
    "totalPages": 1
  }
}
```

---

## Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`

**Solutions**:
1. Check if SQL Server is running:
   ```bash
   # Docker
   docker ps

   # Windows
   services.msc (look for SQL Server)
   ```

2. Verify connection string in `.env`
3. Check firewall settings
4. For Docker, ensure port 1433 is exposed

**Error**: `Login failed for user`

**Solutions**:
1. Verify username and password in `.env`
2. Check if user has proper permissions
3. For Docker, ensure SA password meets requirements

### Prisma Issues

**Error**: `@prisma/client did not initialize yet`

**Solution**:
```bash
npm run db:generate
```

**Error**: `Schema Parsing Error`

**Solution**:
- Check `prisma/schema.prisma` for syntax errors
- Ensure proper indentation
- Verify all model relationships

### Seed Issues

**Error**: `bcryptjs module not found`

**Solution**:
```bash
npm install bcryptjs @types/bcryptjs
```

**Error**: `Unique constraint failed`

**Solution**:
- Database might already be seeded
- Clear database or modify seed file to use `upsert`

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Kill the process using port 3000
# macOS/Linux
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm run dev
```

### TypeScript Errors

**Error**: Module not found

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npm run db:generate
```

---

## Next Steps

Once the setup is complete:

1. **Explore the API**:
   - Read `API_DOCUMENTATION.md` for endpoint details
   - Use Postman or Insomnia to test endpoints
   - Try the different user roles

2. **Customize**:
   - Modify `prisma/schema.prisma` to add fields
   - Update seed data in `prisma/seed.ts`
   - Add new API endpoints in `src/app/api`

3. **Build Frontend**:
   - Create Next.js pages to consume the API
   - Use React components for UI
   - Implement role-based UI access

4. **Deploy**:
   - Set up production database
   - Configure environment variables
   - Deploy to Vercel, AWS, or Azure

---

## Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run start              # Start production server

# Database
npm run db:generate        # Generate Prisma Client
npm run db:push           # Push schema to database
npm run db:seed           # Seed database
npm run db:studio         # Open Prisma Studio

# Prisma Migrations (for production)
npx prisma migrate dev     # Create and apply migration
npx prisma migrate deploy  # Apply pending migrations
```

---

## Support

If you encounter issues not covered in this guide:

1. Check the logs for detailed error messages
2. Review `API_DOCUMENTATION.md` for API-specific issues
3. Consult Prisma documentation: https://www.prisma.io/docs
4. Check Next.js documentation: https://nextjs.org/docs

---

**Happy Coding!** 🚀
