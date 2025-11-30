# Data Dictionary - Utility Management System

## Table of Contents
1. [utility_types](#utility_types)
2. [tariffs](#tariffs)
3. [customers](#customers)
4. [meters](#meters)
5. [meter_readings](#meter_readings)
6. [bills](#bills)
7. [payments](#payments)
8. [complaints](#complaints)
9. [staff](#staff)

---

## utility_types

**Description:** Stores different types of utilities provided (Electricity, Water, Gas)

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the utility type |
| name | NVARCHAR(255) | UNIQUE, NOT NULL | Name of the utility (e.g., "Electricity", "Water", "Gas") |
| description | NVARCHAR(MAX) | NULL | Detailed description of the utility service |
| unit | NVARCHAR(50) | NOT NULL | Unit of measurement (e.g., "kWh", "m³") |
| isActive | BIT | NOT NULL, DEFAULT 1 | Whether the utility type is currently active |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was created |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |

**Relationships:**
- One-to-Many with `meters` (One utility type can have many meters)
- One-to-Many with `tariffs` (One utility type can have many tariff slabs)

**Sample Data:**
```
id: "ut-elec-001"
name: "Electricity"
description: "Electrical power supply"
unit: "kWh"
isActive: 1
```

---

## tariffs

**Description:** Stores pricing information for utilities using slab-based tariff structure

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the tariff |
| name | NVARCHAR(255) | NOT NULL | Descriptive name of the tariff slab |
| minUsage | FLOAT | NOT NULL, DEFAULT 0, CHECK >= 0 | Minimum usage threshold for this slab |
| maxUsage | FLOAT | NULL | Maximum usage threshold (NULL = unlimited) |
| rate | FLOAT | NOT NULL, CHECK >= 0 | Rate per unit for this slab |
| fixedCharge | FLOAT | NOT NULL, DEFAULT 0, CHECK >= 0 | Fixed charge applied for this slab |
| isActive | BIT | NOT NULL, DEFAULT 1 | Whether the tariff is currently active |
| effectiveFrom | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Date from which tariff is effective |
| effectiveTo | DATETIME2 | NULL | Date until tariff is effective (NULL = no end date) |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was created |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |
| utilityTypeId | NVARCHAR(450) | FOREIGN KEY, NOT NULL | Reference to utility type |

**Relationships:**
- Many-to-One with `utility_types` (Many tariffs belong to one utility type)

**Sample Data:**
```
id: "tar-elec-001"
name: "Electricity - Slab 1 (0-100 kWh)"
minUsage: 0
maxUsage: 100
rate: 25.50
fixedCharge: 150.00
utilityTypeId: "ut-elec-001"
```

---

## customers

**Description:** Stores customer information (households, businesses, government organizations)

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the customer |
| name | NVARCHAR(255) | NOT NULL | Customer name (person or organization) |
| type | NVARCHAR(50) | NOT NULL, CHECK IN (...) | Customer type: HOUSEHOLD, BUSINESS, GOVERNMENT |
| contact | NVARCHAR(50) | NOT NULL | Contact phone number |
| email | NVARCHAR(255) | NULL | Email address |
| address | NVARCHAR(MAX) | NOT NULL | Street address |
| city | NVARCHAR(100) | NULL | City name |
| postalCode | NVARCHAR(20) | NULL | Postal/ZIP code |
| isActive | BIT | NOT NULL, DEFAULT 1 | Whether customer account is active |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was created |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |

**Relationships:**
- One-to-Many with `meters` (One customer can have many meters)
- One-to-Many with `bills` (One customer can have many bills)
- One-to-Many with `complaints` (One customer can file many complaints)

**Sample Data:**
```
id: "cust-001"
name: "Nimal Perera"
type: "HOUSEHOLD"
contact: "+94771234567"
email: "nimal.perera@email.lk"
address: "No. 45, Galle Road"
city: "Colombo"
postalCode: "00300"
```

---

## meters

**Description:** Stores utility meters assigned to customers

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the meter |
| meterNumber | NVARCHAR(100) | UNIQUE, NOT NULL | Physical meter identification number |
| installationDate | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Date when meter was installed |
| lastReadingDate | DATETIME2 | NULL | Date of the last meter reading |
| status | NVARCHAR(50) | NOT NULL, DEFAULT 'ACTIVE', CHECK IN (...) | Meter status: ACTIVE, INACTIVE, FAULTY, REMOVED |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was created |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |
| customerId | NVARCHAR(450) | FOREIGN KEY, NOT NULL | Reference to customer |
| utilityTypeId | NVARCHAR(450) | FOREIGN KEY, NOT NULL | Reference to utility type |

**Unique Constraints:**
- `(customerId, utilityTypeId)` - One customer can only have one meter per utility type

**Relationships:**
- Many-to-One with `customers` (Many meters belong to one customer)
- Many-to-One with `utility_types` (Many meters are of one utility type)
- One-to-Many with `meter_readings` (One meter can have many readings)

**Sample Data:**
```
id: "meter-001"
meterNumber: "EL-COL-12345"
installationDate: "2024-01-15"
status: "ACTIVE"
customerId: "cust-001"
utilityTypeId: "ut-elec-001"
```

---

## meter_readings

**Description:** Stores periodic meter readings recorded by field officers

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the reading |
| readingValue | FLOAT | NOT NULL, CHECK >= 0 | Meter reading value |
| readingDate | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Date when reading was taken |
| remarks | NVARCHAR(MAX) | NULL | Any remarks about the reading |
| recordedBy | NVARCHAR(100) | NULL | Username of staff who recorded it |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was created |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |
| meterId | NVARCHAR(450) | FOREIGN KEY, NOT NULL | Reference to meter |

**Relationships:**
- Many-to-One with `meters` (Many readings belong to one meter)

**Sample Data:**
```
id: "reading-001"
readingValue: 1250.5
readingDate: "2025-11-01"
recordedBy: "reader01"
meterId: "meter-001"
```

---

## bills

**Description:** Stores billing information for customers

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the bill |
| billNumber | NVARCHAR(100) | UNIQUE, NOT NULL | Human-readable bill number |
| billingMonth | INT | NOT NULL, CHECK 1-12 | Month of billing period |
| billingYear | INT | NOT NULL, CHECK 2000-2100 | Year of billing period |
| issueDate | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Date when bill was issued |
| dueDate | DATETIME2 | NOT NULL | Payment due date |
| previousReading | FLOAT | NULL | Previous meter reading |
| currentReading | FLOAT | NULL | Current meter reading |
| consumption | FLOAT | NOT NULL, DEFAULT 0, CHECK >= 0 | Consumption (current - previous) |
| totalAmount | FLOAT | NOT NULL, CHECK >= 0 | Total bill amount |
| paidAmount | FLOAT | NOT NULL, DEFAULT 0, CHECK >= 0 | Amount paid so far |
| outstandingAmount | FLOAT | NOT NULL, DEFAULT 0, CHECK >= 0 | Remaining amount to pay |
| status | NVARCHAR(50) | NOT NULL, DEFAULT 'UNPAID', CHECK IN (...) | Bill status: UNPAID, PARTIALLY_PAID, PAID, OVERDUE |
| remarks | NVARCHAR(MAX) | NULL | Any remarks about the bill |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was created |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |
| customerId | NVARCHAR(450) | FOREIGN KEY, NOT NULL | Reference to customer |

**Unique Constraints:**
- `(customerId, billingMonth, billingYear)` - One bill per customer per month

**Relationships:**
- Many-to-One with `customers` (Many bills belong to one customer)
- One-to-Many with `payments` (One bill can have many payments)

**Sample Data:**
```
id: "bill-001"
billNumber: "BILL202511000001"
billingMonth: 11
billingYear: 2025
issueDate: "2025-11-05"
dueDate: "2025-11-20"
previousReading: 1000.0
currentReading: 1250.5
consumption: 250.5
totalAmount: 6512.75
paidAmount: 0
outstandingAmount: 6512.75
status: "UNPAID"
customerId: "cust-001"
```

---

## payments

**Description:** Stores payment records for bills

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the payment |
| amount | FLOAT | NOT NULL, CHECK > 0 | Payment amount |
| paymentDate | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Date when payment was made |
| paymentMethod | NVARCHAR(50) | NOT NULL, CHECK IN (...) | Payment method: CASH, CARD, ONLINE, BANK_TRANSFER |
| referenceNumber | NVARCHAR(100) | NULL | Payment reference number |
| remarks | NVARCHAR(MAX) | NULL | Any remarks about the payment |
| recordedBy | NVARCHAR(100) | NULL | Username of staff who recorded it |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was created |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |
| billId | NVARCHAR(450) | FOREIGN KEY, NOT NULL | Reference to bill |

**Relationships:**
- Many-to-One with `bills` (Many payments belong to one bill)

**Sample Data:**
```
id: "payment-001"
amount: 6512.75
paymentDate: "2025-11-18"
paymentMethod: "ONLINE"
referenceNumber: "PAY-20251118-001"
recordedBy: "clerk01"
billId: "bill-001"
```

---

## complaints

**Description:** Stores customer complaints and their resolution status

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the complaint |
| subject | NVARCHAR(255) | NOT NULL | Brief subject of the complaint |
| description | NVARCHAR(MAX) | NOT NULL | Detailed description of the issue |
| status | NVARCHAR(50) | NOT NULL, DEFAULT 'OPEN', CHECK IN (...) | Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| priority | NVARCHAR(50) | NOT NULL, DEFAULT 'MEDIUM', CHECK IN (...) | Priority: LOW, MEDIUM, HIGH, URGENT |
| resolution | NVARCHAR(MAX) | NULL | Resolution notes |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when complaint was filed |
| resolvedAt | DATETIME2 | NULL | Timestamp when complaint was resolved |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |
| customerId | NVARCHAR(450) | FOREIGN KEY, NOT NULL | Reference to customer |

**Relationships:**
- Many-to-One with `customers` (Many complaints belong to one customer)

**Sample Data:**
```
id: "complaint-001"
subject: "High bill amount"
description: "My electricity bill is unusually high this month"
status: "OPEN"
priority: "MEDIUM"
customerId: "cust-001"
```

---

## staff

**Description:** Stores staff/employee information for system access

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | NVARCHAR(450) | PRIMARY KEY | Unique identifier for the staff member |
| username | NVARCHAR(100) | UNIQUE, NOT NULL | Login username |
| passwordHash | NVARCHAR(255) | NOT NULL | Hashed password (bcrypt) |
| name | NVARCHAR(255) | NOT NULL | Full name of staff member |
| email | NVARCHAR(255) | UNIQUE, NULL | Email address |
| role | NVARCHAR(50) | NOT NULL, CHECK IN (...) | Role: ADMIN, MANAGER, CLERK, METER_READER |
| isActive | BIT | NOT NULL, DEFAULT 1 | Whether staff account is active |
| createdAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was created |
| updatedAt | DATETIME2 | NOT NULL, DEFAULT GETDATE() | Timestamp when record was last updated |

**Sample Data:**
```
id: "staff-001"
username: "admin"
name: "Kasun Jayasinghe"
email: "admin@waterboard.gov.lk"
role: "ADMIN"
isActive: 1
```

---

## Database Constraints Summary

### Primary Keys
All tables use NVARCHAR(450) UUID-based primary keys for:
- Better distribution in indexes
- Prevents sequential ID guessing
- Easier replication and merging

### Foreign Keys with Cascade
- `meters.customerId` → ON DELETE CASCADE
- `meter_readings.meterId` → ON DELETE CASCADE
- `bills.customerId` → ON DELETE CASCADE
- `payments.billId` → ON DELETE CASCADE
- `complaints.customerId` → ON DELETE CASCADE

### Check Constraints
- Customer types limited to: HOUSEHOLD, BUSINESS, GOVERNMENT
- Bill status limited to: UNPAID, PARTIALLY_PAID, PAID, OVERDUE
- Payment methods limited to: CASH, CARD, ONLINE, BANK_TRANSFER
- Meter status limited to: ACTIVE, INACTIVE, FAULTY, REMOVED
- All monetary amounts must be >= 0
- Billing months must be 1-12
- Billing years must be 2000-2100

### Unique Constraints
- One meter per customer per utility type
- One bill per customer per billing period
- Unique meter numbers
- Unique bill numbers
- Unique staff usernames and emails
