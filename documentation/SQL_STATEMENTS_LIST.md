# Complete SQL Statements List
## Section 4: All SQL Statements (DDL + DML)

---

## Table of Contents
1. [Data Definition Language (DDL)](#data-definition-language-ddl)
2. [Data Manipulation Language (DML)](#data-manipulation-language-dml)
3. [Triggers](#triggers)
4. [User-Defined Functions](#user-defined-functions)
5. [Views](#views)
6. [Stored Procedures](#stored-procedures)
7. [Sample Queries](#sample-queries)

---

## Data Definition Language (DDL)

### 1. CREATE DATABASE
```sql
-- Database creation (implicit via Prisma)
CREATE DATABASE utilitydb;
GO

USE utilitydb;
GO
```

---

### 2. CREATE TABLE Statements

#### Table 1: utility_types
```sql
CREATE TABLE utility_types (
    id NVARCHAR(450) PRIMARY KEY,
    name NVARCHAR(255) UNIQUE NOT NULL,
    description NVARCHAR(MAX),
    unit NVARCHAR(50) NOT NULL,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
```

#### Table 2: tariffs
```sql
CREATE TABLE tariffs (
    id NVARCHAR(450) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    minUsage FLOAT NOT NULL DEFAULT 0,
    maxUsage FLOAT,
    rate FLOAT NOT NULL,
    fixedCharge FLOAT NOT NULL DEFAULT 0,
    isActive BIT NOT NULL DEFAULT 1,
    effectiveFrom DATETIME2 NOT NULL DEFAULT GETDATE(),
    effectiveTo DATETIME2,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    utilityTypeId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_tariffs_utilityTypes FOREIGN KEY (utilityTypeId)
        REFERENCES utility_types(id),
    CONSTRAINT CHK_tariffs_rate CHECK (rate >= 0),
    CONSTRAINT CHK_tariffs_minUsage CHECK (minUsage >= 0),
    CONSTRAINT CHK_tariffs_fixedCharge CHECK (fixedCharge >= 0)
);
```

#### Table 3: customers
```sql
CREATE TABLE customers (
    id NVARCHAR(450) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    type NVARCHAR(50) NOT NULL,
    contact NVARCHAR(50) NOT NULL,
    email NVARCHAR(255),
    address NVARCHAR(MAX) NOT NULL,
    city NVARCHAR(100),
    postalCode NVARCHAR(20),
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CHK_customers_type CHECK (type IN ('HOUSEHOLD', 'BUSINESS', 'GOVERNMENT'))
);
```

#### Table 4: meters
```sql
CREATE TABLE meters (
    id NVARCHAR(450) PRIMARY KEY,
    meterNumber NVARCHAR(100) UNIQUE NOT NULL,
    installationDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    lastReadingDate DATETIME2,
    status NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    customerId NVARCHAR(450) NOT NULL,
    utilityTypeId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_meters_customers FOREIGN KEY (customerId)
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT FK_meters_utilityTypes FOREIGN KEY (utilityTypeId)
        REFERENCES utility_types(id),
    CONSTRAINT UQ_meters_customer_utility UNIQUE (customerId, utilityTypeId),
    CONSTRAINT CHK_meters_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'FAULTY', 'REMOVED'))
);
```

#### Table 5: meter_readings
```sql
CREATE TABLE meter_readings (
    id NVARCHAR(450) PRIMARY KEY,
    readingValue FLOAT NOT NULL,
    readingDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    remarks NVARCHAR(MAX),
    recordedBy NVARCHAR(100),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    meterId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_meterReadings_meters FOREIGN KEY (meterId)
        REFERENCES meters(id) ON DELETE CASCADE,
    CONSTRAINT CHK_meterReadings_value CHECK (readingValue >= 0)
);
```

#### Table 6: bills
```sql
CREATE TABLE bills (
    id NVARCHAR(450) PRIMARY KEY,
    billNumber NVARCHAR(100) UNIQUE NOT NULL,
    billingMonth INT NOT NULL,
    billingYear INT NOT NULL,
    issueDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    dueDate DATETIME2 NOT NULL,
    previousReading FLOAT,
    currentReading FLOAT,
    consumption FLOAT NOT NULL DEFAULT 0,
    totalAmount FLOAT NOT NULL,
    paidAmount FLOAT NOT NULL DEFAULT 0,
    outstandingAmount FLOAT NOT NULL DEFAULT 0,
    status NVARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    remarks NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    customerId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_bills_customers FOREIGN KEY (customerId)
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT UQ_bills_customer_period UNIQUE (customerId, billingMonth, billingYear),
    CONSTRAINT CHK_bills_month CHECK (billingMonth BETWEEN 1 AND 12),
    CONSTRAINT CHK_bills_year CHECK (billingYear >= 2000 AND billingYear <= 2100),
    CONSTRAINT CHK_bills_consumption CHECK (consumption >= 0),
    CONSTRAINT CHK_bills_totalAmount CHECK (totalAmount >= 0),
    CONSTRAINT CHK_bills_paidAmount CHECK (paidAmount >= 0),
    CONSTRAINT CHK_bills_outstandingAmount CHECK (outstandingAmount >= 0),
    CONSTRAINT CHK_bills_status CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'))
);
```

#### Table 7: payments
```sql
CREATE TABLE payments (
    id NVARCHAR(450) PRIMARY KEY,
    amount FLOAT NOT NULL,
    paymentDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    paymentMethod NVARCHAR(50) NOT NULL,
    referenceNumber NVARCHAR(100),
    remarks NVARCHAR(MAX),
    recordedBy NVARCHAR(100),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    billId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_payments_bills FOREIGN KEY (billId)
        REFERENCES bills(id) ON DELETE CASCADE,
    CONSTRAINT CHK_payments_amount CHECK (amount > 0),
    CONSTRAINT CHK_payments_method CHECK (paymentMethod IN ('CASH', 'CARD', 'ONLINE', 'BANK_TRANSFER'))
);
```

#### Table 8: complaints
```sql
CREATE TABLE complaints (
    id NVARCHAR(450) PRIMARY KEY,
    subject NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'OPEN',
    priority NVARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    resolution NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    resolvedAt DATETIME2,
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    customerId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_complaints_customers FOREIGN KEY (customerId)
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT CHK_complaints_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT CHK_complaints_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);
```

#### Table 9: staff
```sql
CREATE TABLE staff (
    id NVARCHAR(450) PRIMARY KEY,
    username NVARCHAR(100) UNIQUE NOT NULL,
    passwordHash NVARCHAR(255) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE,
    role NVARCHAR(50) NOT NULL,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CHK_staff_role CHECK (role IN ('ADMIN', 'MANAGER', 'CLERK', 'METER_READER'))
);
```

---

### 3. CREATE INDEX Statements

```sql
-- Customer indexes
CREATE INDEX IDX_customers_type ON customers(type);
CREATE INDEX IDX_customers_city ON customers(city);
CREATE INDEX IDX_customers_isActive ON customers(isActive);

-- Meter indexes
CREATE INDEX IDX_meters_customerId ON meters(customerId);
CREATE INDEX IDX_meters_utilityTypeId ON meters(utilityTypeId);
CREATE INDEX IDX_meters_status ON meters(status);

-- Meter reading indexes
CREATE INDEX IDX_meterReadings_meterId ON meter_readings(meterId);
CREATE INDEX IDX_meterReadings_date ON meter_readings(readingDate);

-- Bill indexes
CREATE INDEX IDX_bills_customerId ON bills(customerId);
CREATE INDEX IDX_bills_status ON bills(status);
CREATE INDEX IDX_bills_period ON bills(billingYear, billingMonth);
CREATE INDEX IDX_bills_dueDate ON bills(dueDate);

-- Payment indexes
CREATE INDEX IDX_payments_billId ON payments(billId);
CREATE INDEX IDX_payments_date ON payments(paymentDate);
CREATE INDEX IDX_payments_method ON payments(paymentMethod);

-- Complaint indexes
CREATE INDEX IDX_complaints_customerId ON complaints(customerId);
CREATE INDEX IDX_complaints_status ON complaints(status);
CREATE INDEX IDX_complaints_priority ON complaints(priority);

-- Tariff indexes
CREATE INDEX IDX_tariffs_utilityTypeId ON tariffs(utilityTypeId);
CREATE INDEX IDX_tariffs_active ON tariffs(isActive);
```

---

## Triggers

### Trigger 1: trg_UpdateBillOnPayment
**Purpose:** Automatically updates bill amounts and status when a payment is added

```sql
CREATE TRIGGER trg_UpdateBillOnPayment
ON payments
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE b
    SET
        b.paidAmount = b.paidAmount + i.amount,
        b.outstandingAmount = b.totalAmount - (b.paidAmount + i.amount),
        b.status = CASE
            WHEN b.totalAmount - (b.paidAmount + i.amount) <= 0 THEN 'PAID'
            WHEN b.paidAmount + i.amount > 0 AND b.totalAmount - (b.paidAmount + i.amount) > 0 THEN 'PARTIALLY_PAID'
            ELSE b.status
        END,
        b.updatedAt = GETDATE()
    FROM bills b
    INNER JOIN inserted i ON b.id = i.billId;
END;
GO
```

### Trigger 2: trg_UpdateBillStatus
**Purpose:** Automatically marks bills as OVERDUE when past due date

```sql
CREATE TRIGGER trg_UpdateBillStatus
ON bills
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE b
    SET
        b.status = 'OVERDUE',
        b.updatedAt = GETDATE()
    FROM bills b
    INNER JOIN inserted i ON b.id = i.id
    WHERE
        b.dueDate < GETDATE()
        AND b.outstandingAmount > 0
        AND b.status IN ('UNPAID', 'PARTIALLY_PAID');
END;
GO
```

---

## User-Defined Functions

### Function 1: fn_CalculateBillAmount
**Purpose:** Calculates total bill amount based on slab-based tariffs

```sql
CREATE FUNCTION dbo.fn_CalculateBillAmount
(
    @utilityTypeId NVARCHAR(450),
    @consumption FLOAT
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @totalAmount FLOAT = 0;
    DECLARE @remainingConsumption FLOAT = @consumption;
    DECLARE @slabRate FLOAT;
    DECLARE @slabMin FLOAT;
    DECLARE @slabMax FLOAT;
    DECLARE @fixedCharge FLOAT;
    DECLARE @slabConsumption FLOAT;

    DECLARE tariff_cursor CURSOR FOR
    SELECT rate, minUsage, maxUsage, fixedCharge
    FROM tariffs
    WHERE utilityTypeId = @utilityTypeId
        AND isActive = 1
        AND effectiveFrom <= GETDATE()
        AND (effectiveTo IS NULL OR effectiveTo >= GETDATE())
    ORDER BY minUsage;

    OPEN tariff_cursor;
    FETCH NEXT FROM tariff_cursor INTO @slabRate, @slabMin, @slabMax, @fixedCharge;

    WHILE @@FETCH_STATUS = 0 AND @remainingConsumption > 0
    BEGIN
        IF @consumption >= @slabMin
        BEGIN
            SET @totalAmount = @totalAmount + @fixedCharge;
        END

        IF @slabMax IS NULL
        BEGIN
            SET @slabConsumption = @remainingConsumption;
        END
        ELSE
        BEGIN
            SET @slabConsumption = CASE
                WHEN @remainingConsumption > (@slabMax - @slabMin)
                THEN (@slabMax - @slabMin)
                ELSE @remainingConsumption
            END;
        END

        SET @totalAmount = @totalAmount + (@slabConsumption * @slabRate);
        SET @remainingConsumption = @remainingConsumption - @slabConsumption;

        FETCH NEXT FROM tariff_cursor INTO @slabRate, @slabMin, @slabMax, @fixedCharge;
    END;

    CLOSE tariff_cursor;
    DEALLOCATE tariff_cursor;

    RETURN ROUND(@totalAmount, 2);
END;
GO
```

**Usage Example:**
```sql
-- Calculate bill for 250 kWh electricity
SELECT dbo.fn_CalculateBillAmount('utility-type-id', 250) AS BillAmount;
```

### Function 2: fn_CalculateLateFee
**Purpose:** Calculates late payment penalty based on days overdue

```sql
CREATE FUNCTION dbo.fn_CalculateLateFee
(
    @outstandingAmount FLOAT,
    @dueDate DATETIME2
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @lateFee FLOAT = 0;
    DECLARE @daysOverdue INT;
    DECLARE @monthsOverdue INT;

    SET @daysOverdue = DATEDIFF(DAY, @dueDate, GETDATE());

    IF @daysOverdue > 0 AND @outstandingAmount > 0
    BEGIN
        IF @daysOverdue <= 30
        BEGIN
            SET @lateFee = @outstandingAmount * 0.02;
        END
        ELSE
        BEGIN
            SET @monthsOverdue = @daysOverdue / 30;
            SET @lateFee = @outstandingAmount * (0.02 + ((@monthsOverdue - 1) * 0.01));
        END

        IF @lateFee > (@outstandingAmount * 0.25)
        BEGIN
            SET @lateFee = @outstandingAmount * 0.25;
        END
    END

    RETURN ROUND(@lateFee, 2);
END;
GO
```

**Usage Example:**
```sql
-- Calculate late fee for 60 days overdue, Rs. 5000 outstanding
SELECT dbo.fn_CalculateLateFee(5000.00, DATEADD(DAY, -60, GETDATE())) AS LateFee;
```

---

## Views

### View 1: vw_MonthlyRevenueReport
**Purpose:** Monthly revenue and collection statistics

```sql
CREATE VIEW vw_MonthlyRevenueReport
AS
SELECT
    b.billingYear,
    b.billingMonth,
    COUNT(b.id) AS totalBills,
    SUM(b.totalAmount) AS totalBilledAmount,
    SUM(b.paidAmount) AS totalCollectedAmount,
    SUM(b.outstandingAmount) AS totalOutstandingAmount,
    CASE
        WHEN SUM(b.totalAmount) > 0
        THEN ROUND((SUM(b.paidAmount) / SUM(b.totalAmount)) * 100, 2)
        ELSE 0
    END AS collectionRatePercentage,
    SUM(CASE WHEN b.status = 'PAID' THEN 1 ELSE 0 END) AS paidBills,
    SUM(CASE WHEN b.status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaidBills,
    SUM(CASE WHEN b.status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) AS partiallyPaidBills,
    SUM(CASE WHEN b.status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdueBills
FROM bills b
GROUP BY b.billingYear, b.billingMonth;
GO
```

**Usage Example:**
```sql
-- Get revenue report for 2025
SELECT * FROM vw_MonthlyRevenueReport
WHERE billingYear = 2025
ORDER BY billingMonth DESC;
```

### View 2: vw_DefaultersList
**Purpose:** Lists customers with overdue payments

```sql
CREATE VIEW vw_DefaultersList
AS
SELECT
    c.id AS customerId,
    c.name AS customerName,
    c.type AS customerType,
    c.contact,
    c.email,
    c.city,
    c.address,
    SUM(b.outstandingAmount) AS totalOutstanding,
    COUNT(b.id) AS overdueCount,
    MIN(b.dueDate) AS oldestDueDate,
    DATEDIFF(DAY, MIN(b.dueDate), GETDATE()) AS daysPastDue,
    SUM(dbo.fn_CalculateLateFee(b.outstandingAmount, b.dueDate)) AS totalLateFee,
    MAX(b.updatedAt) AS lastBillUpdate
FROM customers c
INNER JOIN bills b ON c.id = b.customerId
WHERE b.status IN ('OVERDUE', 'UNPAID', 'PARTIALLY_PAID')
    AND b.outstandingAmount > 0
    AND b.dueDate < GETDATE()
GROUP BY c.id, c.name, c.type, c.contact, c.email, c.city, c.address
HAVING SUM(b.outstandingAmount) > 0;
GO
```

**Usage Example:**
```sql
-- Get top 10 defaulters by amount
SELECT TOP 10 * FROM vw_DefaultersList
ORDER BY totalOutstanding DESC;
```

### View 3: vw_CustomerConsumptionSummary
**Purpose:** Analyzes customer consumption patterns

```sql
CREATE VIEW vw_CustomerConsumptionSummary
AS
SELECT
    c.id AS customerId,
    c.name AS customerName,
    c.type AS customerType,
    ut.name AS utilityType,
    ut.unit AS unit,
    m.meterNumber,
    m.status AS meterStatus,
    COUNT(mr.id) AS totalReadings,
    MIN(mr.readingValue) AS firstReading,
    MAX(mr.readingValue) AS lastReading,
    MAX(mr.readingValue) - MIN(mr.readingValue) AS totalConsumption,
    ROUND(
        CASE
            WHEN COUNT(mr.id) > 1
            THEN (MAX(mr.readingValue) - MIN(mr.readingValue)) / NULLIF(COUNT(mr.id) - 1, 0)
            ELSE 0
        END,
        2
    ) AS avgConsumptionPerPeriod,
    MIN(mr.readingDate) AS firstReadingDate,
    MAX(mr.readingDate) AS lastReadingDate
FROM customers c
INNER JOIN meters m ON c.id = m.customerId
INNER JOIN utility_types ut ON m.utilityTypeId = ut.id
LEFT JOIN meter_readings mr ON m.id = mr.meterId
GROUP BY c.id, c.name, c.type, ut.name, ut.unit, m.meterNumber, m.status;
GO
```

**Usage Example:**
```sql
-- Get top 10 consumers
SELECT TOP 10 * FROM vw_CustomerConsumptionSummary
ORDER BY totalConsumption DESC;
```

---

## Stored Procedures

### Procedure 1: sp_GenerateBillForCustomer
**Purpose:** Generates a bill for a customer for a specific billing period

```sql
CREATE PROCEDURE sp_GenerateBillForCustomer
    @customerId NVARCHAR(450),
    @billingMonth INT,
    @billingYear INT,
    @utilityTypeId NVARCHAR(450)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @billId NVARCHAR(450);
    DECLARE @meterId NVARCHAR(450);
    DECLARE @previousReading FLOAT;
    DECLARE @currentReading FLOAT;
    DECLARE @consumption FLOAT;
    DECLARE @totalAmount FLOAT;
    DECLARE @billNumber NVARCHAR(100);
    DECLARE @issueDate DATETIME2 = GETDATE();
    DECLARE @dueDate DATETIME2;
    DECLARE @errorMsg NVARCHAR(500);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validate customer
        IF NOT EXISTS (SELECT 1 FROM customers WHERE id = @customerId AND isActive = 1)
        BEGIN
            SET @errorMsg = 'Customer not found or inactive: ' + @customerId;
            THROW 50001, @errorMsg, 1;
        END

        -- Check for existing bill
        IF EXISTS (
            SELECT 1 FROM bills
            WHERE customerId = @customerId
                AND billingMonth = @billingMonth
                AND billingYear = @billingYear
        )
        BEGIN
            SET @errorMsg = 'Bill already exists for this customer and period';
            THROW 50002, @errorMsg, 1;
        END

        -- Get meter
        SELECT @meterId = id
        FROM meters
        WHERE customerId = @customerId
            AND utilityTypeId = @utilityTypeId
            AND status = 'ACTIVE';

        IF @meterId IS NULL
        BEGIN
            SET @errorMsg = 'No active meter found for this customer and utility type';
            THROW 50003, @errorMsg, 1;
        END

        -- Get latest two readings
        SELECT TOP 2
            @currentReading = CASE WHEN ROW_NUMBER() OVER (ORDER BY readingDate DESC) = 1 THEN readingValue ELSE @currentReading END,
            @previousReading = CASE WHEN ROW_NUMBER() OVER (ORDER BY readingDate DESC) = 2 THEN readingValue ELSE @previousReading END
        FROM meter_readings
        WHERE meterId = @meterId
        ORDER BY readingDate DESC;

        IF @currentReading IS NULL
        BEGIN
            SET @errorMsg = 'No meter readings found for this meter';
            THROW 50004, @errorMsg, 1;
        END

        IF @previousReading IS NULL
            SET @previousReading = 0;

        -- Calculate consumption
        SET @consumption = @currentReading - @previousReading;

        IF @consumption < 0
        BEGIN
            SET @errorMsg = 'Invalid consumption: Current reading is less than previous reading';
            THROW 50005, @errorMsg, 1;
        END

        -- Calculate total using UDF
        SET @totalAmount = dbo.fn_CalculateBillAmount(@utilityTypeId, @consumption);

        -- Generate bill number
        DECLARE @billCount INT;
        SELECT @billCount = COUNT(*) + 1
        FROM bills
        WHERE billingYear = @billingYear AND billingMonth = @billingMonth;

        SET @billNumber = 'BILL' + CAST(@billingYear AS NVARCHAR(4)) +
                         RIGHT('0' + CAST(@billingMonth AS NVARCHAR(2)), 2) +
                         RIGHT('00000' + CAST(@billCount AS NVARCHAR(5)), 5);

        SET @dueDate = DATEADD(DAY, 15, @issueDate);
        SET @billId = LOWER(NEWID());

        -- Insert bill
        INSERT INTO bills (
            id, billNumber, customerId, billingMonth, billingYear,
            issueDate, dueDate, previousReading, currentReading,
            consumption, totalAmount, paidAmount, outstandingAmount,
            status, createdAt, updatedAt
        )
        VALUES (
            @billId, @billNumber, @customerId, @billingMonth, @billingYear,
            @issueDate, @dueDate, @previousReading, @currentReading,
            @consumption, @totalAmount, 0, @totalAmount,
            'UNPAID', @issueDate, @issueDate
        );

        COMMIT TRANSACTION;

        SELECT
            @billId AS billId,
            @billNumber AS billNumber,
            @consumption AS consumption,
            @totalAmount AS totalAmount,
            'Bill generated successfully' AS message;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO
```

**Usage Example:**
```sql
EXEC sp_GenerateBillForCustomer
    @customerId = 'customer-id-here',
    @billingMonth = 12,
    @billingYear = 2025,
    @utilityTypeId = 'utility-type-id-here';
```

### Procedure 2: sp_ProcessPayment
**Purpose:** Processes a payment for a bill

```sql
CREATE PROCEDURE sp_ProcessPayment
    @billId NVARCHAR(450),
    @amount FLOAT,
    @paymentMethod NVARCHAR(50),
    @referenceNumber NVARCHAR(100) = NULL,
    @recordedBy NVARCHAR(100) = NULL,
    @remarks NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @paymentId NVARCHAR(450);
    DECLARE @outstandingAmount FLOAT;
    DECLARE @billNumber NVARCHAR(100);
    DECLARE @customerName NVARCHAR(255);
    DECLARE @errorMsg NVARCHAR(500);
    DECLARE @paymentDate DATETIME2 = GETDATE();

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validate payment method
        IF @paymentMethod NOT IN ('CASH', 'CARD', 'ONLINE', 'BANK_TRANSFER')
        BEGIN
            SET @errorMsg = 'Invalid payment method. Must be: CASH, CARD, ONLINE, or BANK_TRANSFER';
            THROW 50011, @errorMsg, 1;
        END

        -- Validate amount
        IF @amount <= 0
        BEGIN
            SET @errorMsg = 'Payment amount must be greater than zero';
            THROW 50012, @errorMsg, 1;
        END

        -- Get bill details
        SELECT
            @outstandingAmount = b.outstandingAmount,
            @billNumber = b.billNumber,
            @customerName = c.name
        FROM bills b
        INNER JOIN customers c ON b.customerId = c.id
        WHERE b.id = @billId;

        IF @billNumber IS NULL
        BEGIN
            SET @errorMsg = 'Bill not found: ' + @billId;
            THROW 50013, @errorMsg, 1;
        END

        IF @outstandingAmount <= 0
        BEGIN
            SET @errorMsg = 'Bill ' + @billNumber + ' is already fully paid';
            THROW 50014, @errorMsg, 1;
        END

        -- Check for overpayment
        IF @amount > @outstandingAmount
        BEGIN
            SET @remarks = ISNULL(@remarks, '') + ' [WARNING: Payment exceeds outstanding amount by ' +
                          CAST((@amount - @outstandingAmount) AS NVARCHAR(50)) + ']';
        END

        SET @paymentId = LOWER(NEWID());

        -- Insert payment
        INSERT INTO payments (
            id, billId, amount, paymentMethod, paymentDate,
            referenceNumber, recordedBy, remarks,
            createdAt, updatedAt
        )
        VALUES (
            @paymentId, @billId, @amount, @paymentMethod, @paymentDate,
            @referenceNumber, @recordedBy, @remarks,
            @paymentDate, @paymentDate
        );

        COMMIT TRANSACTION;

        -- Return result
        SELECT
            @paymentId AS paymentId,
            @billNumber AS billNumber,
            @customerName AS customerName,
            @amount AS amountPaid,
            b.outstandingAmount AS newOutstandingAmount,
            b.status AS newBillStatus,
            'Payment processed successfully' AS message
        FROM bills b
        WHERE b.id = @billId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO
```

**Usage Example:**
```sql
EXEC sp_ProcessPayment
    @billId = 'bill-id-here',
    @amount = 1500.00,
    @paymentMethod = 'CASH',
    @recordedBy = 'clerk01',
    @remarks = 'Full payment received';
```

---

## Data Manipulation Language (DML)

### INSERT Statements (Sample)

```sql
-- Insert utility types
INSERT INTO utility_types (id, name, description, unit, createdAt, updatedAt)
VALUES
    (NEWID(), 'Electricity', 'Electrical power supply', 'kWh', GETDATE(), GETDATE()),
    (NEWID(), 'Water', 'Municipal water supply', 'm³', GETDATE(), GETDATE()),
    (NEWID(), 'Gas', 'Liquefied Petroleum Gas', 'm³', GETDATE(), GETDATE());

-- Insert tariffs (Electricity example)
INSERT INTO tariffs (id, name, utilityTypeId, minUsage, maxUsage, rate, fixedCharge, createdAt, updatedAt)
VALUES
    (NEWID(), 'Electricity - 0-30 kWh', 'utility-id', 0, 30, 7.85, 100.00, GETDATE(), GETDATE()),
    (NEWID(), 'Electricity - 31-60 kWh', 'utility-id', 30, 60, 12.50, 0, GETDATE(), GETDATE());

-- Insert customers
INSERT INTO customers (id, name, type, contact, email, address, city, postalCode, createdAt, updatedAt)
VALUES
    (NEWID(), 'W.M.S. Perera', 'HOUSEHOLD', '+94771234567', 'saman.perera@gmail.com',
     'No. 45, Galle Road', 'Colombo 03', '00300', GETDATE(), GETDATE());

-- Insert meters
INSERT INTO meters (id, meterNumber, customerId, utilityTypeId, installationDate, status, createdAt, updatedAt)
VALUES
    (NEWID(), 'EL-000001', 'customer-id', 'utility-id', '2024-01-15', 'ACTIVE', GETDATE(), GETDATE());

-- Insert meter readings
INSERT INTO meter_readings (id, meterId, readingValue, readingDate, recordedBy, createdAt, updatedAt)
VALUES
    (NEWID(), 'meter-id', 1250.5, GETDATE(), 'reader01', GETDATE(), GETDATE());

-- Insert bills
INSERT INTO bills (id, billNumber, customerId, billingMonth, billingYear, issueDate, dueDate,
                   previousReading, currentReading, consumption, totalAmount, paidAmount,
                   outstandingAmount, status, createdAt, updatedAt)
VALUES
    (NEWID(), 'BILL202512000001', 'customer-id', 12, 2025, GETDATE(), DATEADD(DAY, 15, GETDATE()),
     1000.0, 1250.0, 250.0, 3500.00, 0, 3500.00, 'UNPAID', GETDATE(), GETDATE());

-- Insert payments
INSERT INTO payments (id, billId, amount, paymentMethod, paymentDate, referenceNumber,
                      recordedBy, createdAt, updatedAt)
VALUES
    (NEWID(), 'bill-id', 3500.00, 'ONLINE', GETDATE(), 'PAY-001', 'clerk01', GETDATE(), GETDATE());

-- Insert complaints
INSERT INTO complaints (id, customerId, subject, description, status, priority, createdAt, updatedAt)
VALUES
    (NEWID(), 'customer-id', 'High bill amount', 'Unusual spike in electricity consumption',
     'OPEN', 'MEDIUM', GETDATE(), GETDATE());

-- Insert staff
INSERT INTO staff (id, username, passwordHash, name, email, role, createdAt, updatedAt)
VALUES
    (NEWID(), 'admin', 'hashed-password', 'Kasun Jayasinghe', 'admin@waterboard.gov.lk',
     'ADMIN', GETDATE(), GETDATE());
```

---

### SELECT Statements (Sample Queries)

```sql
-- Get all customers
SELECT * FROM customers WHERE isActive = 1;

-- Get bills for a specific customer
SELECT * FROM bills WHERE customerId = 'customer-id' ORDER BY billingYear DESC, billingMonth DESC;

-- Get unpaid bills
SELECT c.name, b.billNumber, b.totalAmount, b.dueDate
FROM bills b
INNER JOIN customers c ON b.customerId = c.id
WHERE b.status = 'UNPAID';

-- Get payment history for a bill
SELECT p.amount, p.paymentDate, p.paymentMethod, p.referenceNumber
FROM payments p
WHERE p.billId = 'bill-id'
ORDER BY p.paymentDate DESC;

-- Get meter readings for a meter
SELECT readingValue, readingDate, recordedBy
FROM meter_readings
WHERE meterId = 'meter-id'
ORDER BY readingDate DESC;

-- Get all active meters for a customer
SELECT m.meterNumber, ut.name AS utilityType, m.status
FROM meters m
INNER JOIN utility_types ut ON m.utilityTypeId = ut.id
WHERE m.customerId = 'customer-id' AND m.status = 'ACTIVE';

-- Get open complaints
SELECT c.name AS customerName, co.subject, co.priority, co.createdAt
FROM complaints co
INNER JOIN customers c ON co.customerId = c.id
WHERE co.status = 'OPEN'
ORDER BY co.priority DESC, co.createdAt DESC;
```

---

### UPDATE Statements (Sample)

```sql
-- Update customer information
UPDATE customers
SET email = 'new.email@example.com',
    updatedAt = GETDATE()
WHERE id = 'customer-id';

-- Update meter status
UPDATE meters
SET status = 'FAULTY',
    updatedAt = GETDATE()
WHERE id = 'meter-id';

-- Update complaint status
UPDATE complaints
SET status = 'RESOLVED',
    resolution = 'Issue resolved after investigation',
    resolvedAt = GETDATE(),
    updatedAt = GETDATE()
WHERE id = 'complaint-id';

-- Update bill (manual correction)
UPDATE bills
SET totalAmount = 3200.00,
    outstandingAmount = totalAmount - paidAmount,
    updatedAt = GETDATE()
WHERE id = 'bill-id';
```

---

### DELETE Statements (Sample)

```sql
-- Delete a meter reading (cascades from meter deletion)
DELETE FROM meter_readings WHERE id = 'reading-id';

-- Delete a payment
DELETE FROM payments WHERE id = 'payment-id';

-- Delete a complaint
DELETE FROM complaints WHERE id = 'complaint-id';

-- Delete a customer (cascades to meters, bills, complaints)
DELETE FROM customers WHERE id = 'customer-id';

-- Note: Deletions cascade automatically due to ON DELETE CASCADE constraints
```

---

## Sample Analytical Queries

### Revenue Analysis
```sql
-- Total revenue by month
SELECT
    billingYear,
    billingMonth,
    SUM(totalAmount) AS totalRevenue,
    SUM(paidAmount) AS collectedRevenue,
    SUM(outstandingAmount) AS pendingRevenue
FROM bills
GROUP BY billingYear, billingMonth
ORDER BY billingYear DESC, billingMonth DESC;

-- Collection efficiency
SELECT
    ROUND((SUM(paidAmount) / NULLIF(SUM(totalAmount), 0)) * 100, 2) AS collectionPercentage
FROM bills
WHERE billingYear = 2025;
```

### Customer Analysis
```sql
-- Top 10 consumers by total consumption
SELECT TOP 10
    c.name,
    c.type,
    SUM(b.consumption) AS totalConsumption
FROM customers c
INNER JOIN bills b ON c.id = b.customerId
GROUP BY c.id, c.name, c.type
ORDER BY totalConsumption DESC;

-- Customers by type distribution
SELECT
    type,
    COUNT(*) AS customerCount,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM customers)), 2) AS percentage
FROM customers
GROUP BY type;
```

### Payment Analysis
```sql
-- Payment methods distribution
SELECT
    paymentMethod,
    COUNT(*) AS transactionCount,
    SUM(amount) AS totalAmount
FROM payments
GROUP BY paymentMethod
ORDER BY totalAmount DESC;

-- Daily payment collection
SELECT
    CAST(paymentDate AS DATE) AS paymentDay,
    COUNT(*) AS transactionCount,
    SUM(amount) AS dailyCollection
FROM payments
WHERE paymentDate >= DATEADD(MONTH, -1, GETDATE())
GROUP BY CAST(paymentDate AS DATE)
ORDER BY paymentDay DESC;
```

---

## Summary

**Total DDL Statements:**
- 9 CREATE TABLE statements
- 20+ CREATE INDEX statements
- 2 CREATE TRIGGER statements
- 2 CREATE FUNCTION statements
- 3 CREATE VIEW statements
- 2 CREATE PROCEDURE statements

**Total DML Statements:**
- INSERT: Sample statements for all 9 tables
- SELECT: 20+ query examples
- UPDATE: Sample update statements
- DELETE: Sample delete statements

**Database Objects Created:**
- Tables: 9
- Indexes: 20+
- Triggers: 2
- Functions: 2
- Views: 3
- Stored Procedures: 2
- Constraints: 35+ (PK, FK, UNIQUE, CHECK, DEFAULT)

---

## References

- SQL Scripts Location: `/sql-scripts/`
- Documentation: `/documentation/`
- Prisma Schema: `/prisma/schema.prisma`
- Sample Data Seed: `/prisma/seed-srilanka.ts`

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Module:** PUSL2019 - Information Management & Retrieval
