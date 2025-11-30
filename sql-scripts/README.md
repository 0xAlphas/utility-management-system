# SQL Scripts - Utility Management System

This directory contains all SQL scripts for the Utility Management System database implementation.

## 📁 File Structure

```
sql-scripts/
├── 01_DDL_CREATE_TABLES.sql      # Database schema creation
├── 02_TRIGGERS.sql                # Triggers for automation
├── 03_FUNCTIONS.sql               # User-defined functions
├── 04_VIEWS.sql                   # Database views for reporting
├── 05_STORED_PROCEDURES.sql       # Stored procedures for operations
└── README.md                      # This file
```

## 🚀 Execution Order

Execute the scripts in the following order:

### Step 1: Create Database Schema
```sql
-- Execute: 01_DDL_CREATE_TABLES.sql
-- Creates all 9 tables with constraints and indexes
```

**Tables Created:**
1. utility_types
2. tariffs
3. customers
4. meters
5. meter_readings
6. bills
7. payments
8. complaints
9. staff

**Features:**
- Primary key constraints
- Foreign key constraints with CASCADE/RESTRICT
- Unique constraints
- Check constraints for data validation
- Default values
- Indexes for performance

### Step 2: Create Triggers
```sql
-- Execute: 02_TRIGGERS.sql
-- Creates 2 triggers for automatic data management
```

**Triggers:**
1. **trg_UpdateBillOnPayment**
   - Fires: AFTER INSERT on payments
   - Action: Updates bill amounts and status when payment added
   - Business Logic:
     - Updates paidAmount
     - Recalculates outstandingAmount
     - Sets status to PAID or PARTIALLY_PAID

2. **trg_UpdateBillStatus**
   - Fires: AFTER INSERT, UPDATE on bills
   - Action: Marks bills as OVERDUE if past due date
   - Business Logic:
     - Checks due date against current date
     - Updates unpaid/partially paid bills to OVERDUE

### Step 3: Create Functions
```sql
-- Execute: 03_FUNCTIONS.sql
-- Creates 2 user-defined functions
```

**Functions:**
1. **fn_CalculateBillAmount(@utilityTypeId, @consumption)**
   - Returns: FLOAT (total bill amount)
   - Purpose: Calculates bill using slab-based tariffs
   - Logic:
     - Applies progressive pricing
     - Adds fixed charges
     - Supports unlimited upper slab

2. **fn_CalculateLateFee(@outstandingAmount, @dueDate)**
   - Returns: FLOAT (late fee amount)
   - Purpose: Calculates late payment penalty
   - Logic:
     - 2% for first 30 days
     - Additional 1% per month thereafter
     - Maximum 25% cap

### Step 4: Create Views
```sql
-- Execute: 04_VIEWS.sql
-- Creates 3 views for reporting
```

**Views:**
1. **vw_MonthlyRevenueReport**
   - Purpose: Monthly revenue and collection statistics
   - Columns: billingYear, billingMonth, totalBills, totalBilledAmount, totalCollectedAmount, collectionRatePercentage, etc.
   - Use Case: Management reporting

2. **vw_DefaultersList**
   - Purpose: Customers with overdue payments
   - Columns: customerId, customerName, totalOutstanding, overdueCount, daysPastDue, totalLateFee, etc.
   - Use Case: Collection follow-up

3. **vw_CustomerConsumptionSummary** (Bonus)
   - Purpose: Consumption analysis per customer
   - Columns: customerName, utilityType, totalConsumption, avgConsumptionPerPeriod, etc.
   - Use Case: Usage pattern analysis

### Step 5: Create Stored Procedures
```sql
-- Execute: 05_STORED_PROCEDURES.sql
-- Creates 2 stored procedures
```

**Procedures:**
1. **sp_GenerateBillForCustomer**
   - Parameters: @customerId, @billingMonth, @billingYear, @utilityTypeId
   - Purpose: Generate bill for a customer
   - Returns: Bill details (billId, billNumber, consumption, totalAmount)
   - Logic:
     - Gets latest meter readings
     - Calculates consumption
     - Uses fn_CalculateBillAmount
     - Creates bill record
     - Validates inputs

2. **sp_ProcessPayment**
   - Parameters: @billId, @amount, @paymentMethod, @referenceNumber, @recordedBy, @remarks
   - Purpose: Process payment for a bill
   - Returns: Payment confirmation and updated bill status
   - Logic:
     - Validates bill exists and not fully paid
     - Validates payment amount
     - Creates payment record
     - Triggers update bill automatically

## 📊 Sample Queries

### Query Revenue Report
```sql
SELECT *
FROM vw_MonthlyRevenueReport
WHERE billingYear = 2025
ORDER BY billingMonth DESC;
```

### Query Defaulters
```sql
SELECT
    customerName,
    contact,
    totalOutstanding,
    daysPastDue,
    totalLateFee
FROM vw_DefaultersList
ORDER BY totalOutstanding DESC;
```

### Generate a Bill
```sql
EXEC sp_GenerateBillForCustomer
    @customerId = 'customer-id-here',
    @billingMonth = 11,
    @billingYear = 2025,
    @utilityTypeId = 'utility-type-id-here';
```

### Process a Payment
```sql
EXEC sp_ProcessPayment
    @billId = 'bill-id-here',
    @amount = 1500.00,
    @paymentMethod = 'CASH',
    @recordedBy = 'clerk01',
    @remarks = 'Payment received at counter';
```

### Calculate Bill Amount (using function)
```sql
SELECT dbo.fn_CalculateBillAmount('utility-type-id', 250.5) as CalculatedAmount;
```

### Calculate Late Fee (using function)
```sql
SELECT dbo.fn_CalculateLateFee(5000.00, '2025-10-15') as LateFee;
```

## 🔧 Testing the Database

### 1. Verify Table Creation
```sql
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

### 2. Verify Triggers
```sql
SELECT name, type_desc
FROM sys.triggers
WHERE parent_class_desc = 'OBJECT_OR_COLUMN';
```

### 3. Verify Functions
```sql
SELECT name, type_desc
FROM sys.objects
WHERE type IN ('FN', 'IF', 'TF')
ORDER BY name;
```

### 4. Verify Views
```sql
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.VIEWS
ORDER BY TABLE_NAME;
```

### 5. Verify Stored Procedures
```sql
SELECT name
FROM sys.procedures
ORDER BY name;
```

## 📝 Data Population

After executing all scripts, populate the database using:

**Option 1: Prisma Seed (Recommended)**
```bash
npm run seed:srilanka
```
This will populate with realistic Sri Lankan data (30+ customers, 60+ meters, 200+ readings)

**Option 2: Manual INSERT Statements**
Write custom INSERT statements based on your needs.

## 🎯 Advanced Features Implemented

### ✅ Database Objects Created

| Category | Count | Objects |
|----------|-------|---------|
| Tables | 9 | utility_types, tariffs, customers, meters, meter_readings, bills, payments, complaints, staff |
| Triggers | 2 | trg_UpdateBillOnPayment, trg_UpdateBillStatus |
| Functions | 2 | fn_CalculateBillAmount, fn_CalculateLateFee |
| Views | 3 | vw_MonthlyRevenueReport, vw_DefaultersList, vw_CustomerConsumptionSummary |
| Stored Procedures | 2 | sp_GenerateBillForCustomer, sp_ProcessPayment |

### ✅ Constraints Implemented

- **Primary Keys:** All 9 tables
- **Foreign Keys:** 7 relationships with CASCADE/RESTRICT
- **Unique Constraints:** 5 constraints
- **Check Constraints:** 15+ constraints
- **Default Values:** On all timestamp and status fields
- **Indexes:** 20+ indexes for performance

## 🔒 Security Considerations

1. **SQL Injection Prevention:**
   - All stored procedures use parameterized queries
   - Input validation via CHECK constraints

2. **Data Integrity:**
   - Referential integrity via foreign keys
   - Cascade deletes for dependent records
   - Transactions in stored procedures

3. **Access Control:**
   - Staff authentication required
   - Password hashing (bcrypt) in application layer
   - Role-based access control (ADMIN, MANAGER, CLERK, METER_READER)

## 📚 Related Documentation

- [Data Dictionary](../documentation/DATA_DICTIONARY.md)
- [Normalization Analysis](../documentation/NORMALIZATION_ANALYSIS.md)
- [ER Diagram and Relationships](../documentation/ER_DIAGRAM_AND_RELATIONSHIPS.md)
- [Assumptions](../documentation/ASSUMPTIONS.md)

## ⚠️ Important Notes

1. **Execution Environment:** These scripts are for **Microsoft SQL Server**
2. **Data Loss Warning:** 01_DDL_CREATE_TABLES.sql drops existing tables
3. **Testing:** Test in development environment before production
4. **Backup:** Always backup before running DDL scripts
5. **Dependencies:** Execute in order (01 → 02 → 03 → 04 → 05)

## 🐛 Troubleshooting

### Error: "Object already exists"
- The scripts include DROP statements
- If error persists, manually drop objects first

### Error: "Foreign key constraint failed"
- Ensure tables are created in correct order
- Check if parent records exist before inserting child records

### Error: "Trigger not firing"
- Verify trigger was created successfully
- Check trigger conditions match your test case
- Use `SELECT * FROM sys.triggers` to verify

### Error: "Function returns NULL"
- Check input parameters are valid
- Verify tariff data exists for utility type
- Use PRINT statements to debug function logic

## 📞 Support

For issues or questions:
- Check the documentation folder
- Review the Prisma schema: `prisma/schema.prisma`
- Examine seed files: `prisma/seed-srilanka.ts`

---

**Created for:** PUSL2019 - Information Management & Retrieval
**Database:** Utility Management System
**Platform:** Microsoft SQL Server
**Date:** November 2025
