# Utility Management System - API Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Reports](#reports)

---

## Overview

The Utility Management System (UMS) is a comprehensive web application backend for managing multiple utilities (Electricity, Water, and Gas) within a single integrated system. Built with Next.js 14, Prisma ORM, and Microsoft SQL Server.

### Key Features
- Multi-utility support (Electricity, Water, Gas)
- Role-based access control (Admin, Meter Reader, Clerk, Manager)
- Automated bill calculation with slab-based tariffs
- Comprehensive reporting and analytics
- Customer and meter management
- Payment processing and tracking
- Complaint management

---

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **ORM**: Prisma
- **Database**: Microsoft SQL Server
- **Authentication**: JWT + bcrypt
- **Language**: TypeScript

### Project Structure
```
utility-management-system/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── src/
│   ├── app/
│   │   └── api/               # API routes
│   │       ├── auth/          # Authentication
│   │       ├── customers/     # Customer management
│   │       ├── meters/        # Meter management
│   │       ├── readings/      # Meter readings
│   │       ├── tariffs/       # Tariff management
│   │       ├── bills/         # Bill management
│   │       ├── payments/      # Payment processing
│   │       ├── staff/         # Staff management
│   │       ├── complaints/    # Complaint handling
│   │       └── reports/       # Analytics & reports
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   ├── auth.ts            # Auth utilities
│   │   └── billing.ts         # Billing calculations
│   └── generated/
│       └── prisma/            # Generated Prisma client
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- Microsoft SQL Server (local or Docker)
- npm or pnpm

### Environment Variables
Create a `.env` file in the root directory:

```env
DATABASE_URL="sqlserver://localhost:1433;database=utility_management;user=sa;password=YourPassword;encrypt=true;trustServerCertificate=true"
JWT_SECRET="your-secret-key-change-in-production"
```

### Installation Steps

1. **Install dependencies**:
```bash
npm install
# or
pnpm install
```

2. **Generate Prisma Client**:
```bash
npm run db:generate
```

3. **Push database schema**:
```bash
npm run db:push
```

4. **Seed database with sample data**:
```bash
npm run db:seed
```

5. **Start development server**:
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

### Default Credentials
After seeding, use these credentials to test:

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | Admin |
| reader01 | password123 | Meter Reader |
| clerk01 | password123 | Clerk |
| manager01 | password123 | Manager |

---

## Authentication

All API endpoints (except `/api/auth/login`) require JWT authentication.

### Login
**POST** `/api/auth/login`

Request:
```json
{
  "username": "admin",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "name": "System Administrator",
    "email": "admin@utilityms.com",
    "role": "ADMIN"
  }
}
```

### Using the Token
Include the token in the Authorization header for all subsequent requests:
```
Authorization: Bearer <your-token>
```

---

## API Endpoints

### Staff Management

#### Get All Staff
**GET** `/api/staff`
- **Auth**: Admin, Manager
- **Query Params**: `role`, `isActive`

#### Create Staff
**POST** `/api/staff`
- **Auth**: Admin
- **Body**: `{ username, password, name, email, role }`

#### Get Staff by ID
**GET** `/api/staff/:id`
- **Auth**: Admin, Manager

#### Update Staff
**PATCH** `/api/staff/:id`
- **Auth**: Admin
- **Body**: `{ name?, email?, role?, isActive?, password? }`

#### Deactivate Staff
**DELETE** `/api/staff/:id`
- **Auth**: Admin

---

### Customer Management

#### Get All Customers
**GET** `/api/customers`
- **Auth**: All roles
- **Query Params**: `type`, `isActive`, `search`, `page`, `limit`

#### Create Customer
**POST** `/api/customers`
- **Auth**: Admin, Clerk
- **Body**: `{ name, type, contact, email?, address, city?, postalCode? }`

#### Get Customer by ID
**GET** `/api/customers/:id`
- **Auth**: All roles
- **Includes**: meters, bills, complaints

#### Update Customer
**PATCH** `/api/customers/:id`
- **Auth**: Admin, Clerk
- **Body**: `{ name?, type?, contact?, email?, address?, city?, postalCode?, isActive? }`

#### Deactivate Customer
**DELETE** `/api/customers/:id`
- **Auth**: Admin

---

### Meter Management

#### Get All Meters
**GET** `/api/meters`
- **Auth**: All roles
- **Query Params**: `customerId`, `utilityTypeId`, `status`, `meterNumber`, `page`, `limit`

#### Register New Meter
**POST** `/api/meters`
- **Auth**: Admin, Clerk
- **Body**: `{ meterNumber, customerId, utilityTypeId, installationDate?, status? }`
- **Note**: One meter per utility type per customer

#### Get Meter by ID
**GET** `/api/meters/:id`
- **Auth**: All roles
- **Includes**: customer, utilityType, recent readings

#### Update Meter
**PATCH** `/api/meters/:id`
- **Auth**: Admin, Clerk
- **Body**: `{ status?, lastReadingDate? }`

#### Delete Meter
**DELETE** `/api/meters/:id`
- **Auth**: Admin
- **Note**: Cannot delete if readings exist

---

### Meter Readings

#### Get All Readings
**GET** `/api/readings`
- **Auth**: All roles
- **Query Params**: `meterId`, `customerId`, `startDate`, `endDate`, `page`, `limit`

#### Record New Reading
**POST** `/api/readings`
- **Auth**: Admin, Meter Reader, Clerk
- **Body**: `{ meterId, readingValue, readingDate?, remarks? }`
- **Validation**: Reading cannot be less than previous reading

#### Get Reading by ID
**GET** `/api/readings/:id`
- **Auth**: All roles

#### Update Reading
**PATCH** `/api/readings/:id`
- **Auth**: Admin, Meter Reader
- **Body**: `{ readingValue?, readingDate?, remarks? }`

#### Delete Reading
**DELETE** `/api/readings/:id`
- **Auth**: Admin

---

### Tariff Management

#### Get All Tariffs
**GET** `/api/tariffs`
- **Auth**: All roles
- **Query Params**: `utilityTypeId`, `isActive`
- **Returns**: Only active and current tariffs

#### Create Tariff
**POST** `/api/tariffs`
- **Auth**: Admin
- **Body**: `{ name, utilityTypeId, minUsage, maxUsage?, rate, fixedCharge?, effectiveFrom?, effectiveTo? }`

#### Get Tariff by ID
**GET** `/api/tariffs/:id`
- **Auth**: All roles

#### Update Tariff
**PATCH** `/api/tariffs/:id`
- **Auth**: Admin
- **Body**: `{ name?, minUsage?, maxUsage?, rate?, fixedCharge?, isActive?, effectiveTo? }`

#### Deactivate Tariff
**DELETE** `/api/tariffs/:id`
- **Auth**: Admin
- **Note**: Sets isActive to false and effectiveTo to now

---

### Bill Management

#### Get All Bills
**GET** `/api/bills`
- **Auth**: All roles
- **Query Params**: `customerId`, `status`, `month`, `year`, `page`, `limit`

#### Generate Bill
**POST** `/api/bills`
- **Auth**: Admin, Clerk
- **Body**: `{ customerId, billingMonth, billingYear, dueDate? }`
- **Auto-calculation**: Calculates from meter readings and tariffs
- **Requirements**: Customer must have at least 2 readings per meter

#### Get Bill by ID
**GET** `/api/bills/:id`
- **Auth**: All roles
- **Includes**: customer, payments, calculation breakdown

#### Update Bill
**PATCH** `/api/bills/:id`
- **Auth**: Admin, Clerk
- **Body**: `{ dueDate?, status?, remarks? }`

#### Delete Bill
**DELETE** `/api/bills/:id`
- **Auth**: Admin
- **Note**: Cannot delete if payments exist

---

### Payment Management

#### Get All Payments
**GET** `/api/payments`
- **Auth**: All roles
- **Query Params**: `billId`, `customerId`, `paymentMethod`, `startDate`, `endDate`, `page`, `limit`

#### Record Payment
**POST** `/api/payments`
- **Auth**: Admin, Clerk
- **Body**: `{ billId, amount, paymentMethod, paymentDate?, referenceNumber?, remarks? }`
- **Auto-update**: Updates bill status and outstanding amount
- **Validation**: Amount cannot exceed outstanding amount

#### Get Payment by ID
**GET** `/api/payments/:id`
- **Auth**: All roles

#### Update Payment
**PATCH** `/api/payments/:id`
- **Auth**: Admin, Clerk
- **Body**: `{ referenceNumber?, remarks? }`

#### Delete Payment (Refund)
**DELETE** `/api/payments/:id`
- **Auth**: Admin
- **Auto-update**: Recalculates bill amounts

---

## Reports

### Dashboard Report
**GET** `/api/reports/dashboard`
- **Auth**: Admin, Manager, Clerk
- **Query Params**: `period` (day, week, month, year)
- **Returns**:
  - Customer statistics
  - Meter counts
  - Bill summaries
  - Revenue statistics
  - Recent activity

### Revenue Report
**GET** `/api/reports/revenue`
- **Auth**: Admin, Manager
- **Query Params**: `startDate`, `endDate`, `groupBy` (day, month, year)
- **Returns**:
  - Total revenue
  - Revenue by payment method
  - Revenue by customer type
  - Revenue by time period
  - Outstanding amounts

### Defaulters Report
**GET** `/api/reports/defaulters`
- **Auth**: Admin, Manager
- **Query Params**: `minAmount`, `customerType`, `page`, `limit`
- **Returns**:
  - List of unpaid/overdue bills
  - Days overdue
  - Grouped by customer type
  - Grouped by age of debt

### Usage Patterns Report
**GET** `/api/reports/usage`
- **Auth**: Admin, Manager
- **Query Params**: `utilityTypeId`, `customerType`, `startDate`, `endDate`, `limit`
- **Returns**:
  - Consumption statistics
  - Top consumers
  - Usage by customer type
  - Monthly trends

---

## Database Schema

### Core Entities

#### Staff
- Manages system users with role-based access
- Roles: ADMIN, METER_READER, CLERK, MANAGER

#### Customer
- Types: HOUSEHOLD, BUSINESS, GOVERNMENT
- Can have multiple meters (one per utility type)

#### UtilityType
- Electricity, Water, Gas
- Has associated tariffs and meters

#### Meter
- One meter per customer per utility type
- Tracks installation date and status
- Stores meter readings

#### MeterReading
- Periodic readings recorded by meter readers
- Must be sequential (cannot be less than previous)

#### Tariff
- Slab-based pricing structure
- Supports min/max usage ranges
- Time-based effectiveness

#### Bill
- Auto-generated from meter readings
- Unique per customer per billing period
- Tracks payment status

#### Payment
- Linked to bills
- Auto-updates bill status
- Supports multiple payment methods

#### Complaint
- Customer feedback and issues
- Status tracking and resolution

---

## Billing Calculation

The system uses a slab-based billing calculation:

### Example: Electricity Bill (350 kWh)

**Tariff Slabs**:
1. 0-100 kWh: $0.15/kWh + $5 fixed
2. 100-300 kWh: $0.20/kWh
3. 300+ kWh: $0.25/kWh

**Calculation**:
- First 100 units: 100 × $0.15 = $15.00
- Next 200 units: 200 × $0.20 = $40.00
- Remaining 50 units: 50 × $0.25 = $12.50
- Fixed charge: $5.00
- **Total: $72.50**

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate entry)
- `500`: Internal Server Error

---

## Best Practices

1. **Authentication**: Always include JWT token in Authorization header
2. **Pagination**: Use `page` and `limit` query params for large datasets
3. **Date Formats**: Use ISO 8601 format (YYYY-MM-DD or full ISO string)
4. **Meter Readings**: Record readings regularly (monthly recommended)
5. **Bill Generation**: Generate bills after all meter readings are recorded
6. **Payments**: Record payments promptly to keep outstanding amounts accurate

---

## Development

### Database Commands
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Testing
Use tools like Postman, Insomnia, or cURL to test endpoints.

Example cURL request:
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Get customers
curl http://localhost:3000/api/customers \
  -H "Authorization: Bearer <your-token>"
```

---

## Support

For issues or questions, please refer to the project repository or contact the development team.

---

**Version**: 1.0.0
**Last Updated**: November 2024
