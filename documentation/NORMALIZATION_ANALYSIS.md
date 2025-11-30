# Normalization Analysis - Utility Management System

## Overview
This document demonstrates that the Utility Management System database is normalized up to **Third Normal Form (3NF)**, ensuring data integrity, reducing redundancy, and maintaining consistency.

---

## 1. First Normal Form (1NF)

**Definition:** A table is in 1NF if:
1. All columns contain atomic (indivisible) values
2. Each column contains values of a single type
3. Each column has a unique name
4. The order of rows doesn't matter
5. There are no repeating groups

### Analysis

#### ✅ All Tables Meet 1NF Requirements

**Example: `customers` table**
```
customers
├── id: NVARCHAR(450)           [Atomic - single ID value]
├── name: NVARCHAR(255)         [Atomic - single name]
├── type: NVARCHAR(50)          [Atomic - single type value]
├── contact: NVARCHAR(50)       [Atomic - single phone number]
├── email: NVARCHAR(255)        [Atomic - single email]
├── address: NVARCHAR(MAX)      [Atomic - single address string]
├── city: NVARCHAR(100)         [Atomic - single city name]
├── postalCode: NVARCHAR(20)    [Atomic - single postal code]
└── ...
```

**Verification:**
- ✅ No multi-valued attributes (e.g., no comma-separated phone numbers)
- ✅ No repeating groups (e.g., contact1, contact2, contact3)
- ✅ Each field contains a single value
- ✅ All column names are unique within the table
- ✅ Each row is uniquely identified by primary key

**Example: `bills` table**
```
bills
├── id: NVARCHAR(450)              [Atomic]
├── billNumber: NVARCHAR(100)      [Atomic]
├── billingMonth: INT              [Atomic - single month number]
├── billingYear: INT               [Atomic - single year number]
├── previousReading: FLOAT         [Atomic - single numeric value]
├── currentReading: FLOAT          [Atomic - single numeric value]
└── ...
```

**Why NOT storing multiple utility bills in one record:**
- ❌ BAD: `billAmounts: "Electricity:1500,Water:500,Gas:300"` (violates 1NF)
- ✅ GOOD: Separate bill records for each utility type

---

## 2. Second Normal Form (2NF)

**Definition:** A table is in 2NF if:
1. It is in 1NF
2. All non-key attributes are fully functionally dependent on the entire primary key
3. No partial dependencies exist (applies to composite keys)

### Analysis

#### ✅ All Tables Meet 2NF Requirements

**Tables with Single Primary Keys:**
Most tables use single-column primary keys (id), so partial dependency cannot exist:
- `customers` (PK: id)
- `bills` (PK: id)
- `payments` (PK: id)
- `staff` (PK: id)
- `utility_types` (PK: id)
- `meters` (PK: id)
- `meter_readings` (PK: id)
- `complaints` (PK: id)
- `tariffs` (PK: id)

**Example Analysis: `bills` table**
```
Primary Key: id
Non-key attributes: billNumber, billingMonth, billingYear, totalAmount, customerId, etc.

All attributes depend on 'id' (the entire PK):
- billNumber depends on id ✅
- billingMonth depends on id ✅
- totalAmount depends on id ✅
- customerId depends on id ✅

No partial dependencies exist because PK is single-column.
```

**Unique Constraints (Composite) - Verification:**

Even though we have composite unique constraints, they don't create partial dependencies:

1. **`bills` - UNIQUE(customerId, billingMonth, billingYear)**
   - This is a unique constraint, not the primary key
   - Primary key is `id`
   - All attributes depend on `id`, not partially on customer/month/year

2. **`meters` - UNIQUE(customerId, utilityTypeId)**
   - This is a unique constraint, not the primary key
   - Primary key is `id`
   - All attributes depend on `id`

**Why our design prevents 2NF violations:**

❌ **Bad Design (violates 2NF):**
```sql
-- If we used composite PK (customerId, billingMonth, billingYear)
bills (customerId, billingMonth, billingYear, billNumber, totalAmount, customerName, customerAddress)

Problem: customerName and customerAddress depend only on customerId,
not on the full composite key (customerId, billingMonth, billingYear)
This is a partial dependency → Violates 2NF
```

✅ **Good Design (our implementation):**
```sql
-- Single PK, customer info in separate table
bills (id, customerId, billingMonth, billingYear, billNumber, totalAmount)
customers (id, name, address, ...)

All bill attributes depend on the entire PK (id)
Customer info is in customers table
No partial dependencies → Meets 2NF
```

---

## 3. Third Normal Form (3NF)

**Definition:** A table is in 3NF if:
1. It is in 2NF
2. No transitive dependencies exist
3. All non-key attributes depend directly on the primary key, not on other non-key attributes

### Analysis

#### ✅ All Tables Meet 3NF Requirements

**Example 1: `customers` table**
```
customers (id, name, type, contact, email, address, city, postalCode, ...)

Primary Key: id

Direct Dependencies (all non-key → PK):
- name → id ✅
- type → id ✅
- contact → id ✅
- email → id ✅
- address → id ✅
- city → id ✅
- postalCode → id ✅

No transitive dependencies detected.
```

**Example 2: `bills` table**
```
bills (id, billNumber, customerId, billingMonth, billingYear, totalAmount, ...)

Primary Key: id

All attributes depend directly on id:
- billNumber → id ✅
- customerId → id ✅
- totalAmount → id ✅

Customer details (name, address, etc.) are NOT in bills table.
They are in customers table, referenced by customerId.
This eliminates transitive dependency.
```

**Why This Prevents Transitive Dependencies:**

❌ **Bad Design (violates 3NF):**
```sql
bills (id, customerId, customerName, customerCity, totalAmount)

Transitive dependency chain:
id → customerId → customerName
id → customerId → customerCity

customerName depends on customerId, not directly on id
This is a transitive dependency → Violates 3NF
```

✅ **Good Design (our implementation):**
```sql
bills (id, customerId, totalAmount)
customers (id, name, city)

No transitive dependencies:
- bills.customerId → bills.id (direct)
- customers.name → customers.id (direct)
- To get customer name, JOIN tables

This design is in 3NF ✅
```

**Example 3: `meters` table**
```
meters (id, meterNumber, customerId, utilityTypeId, installationDate, status)

Primary Key: id

Dependencies:
- meterNumber → id ✅
- customerId → id ✅
- utilityTypeId → id ✅
- installationDate → id ✅
- status → id ✅

Utility details (name, unit, description) are in utility_types table.
Customer details are in customers table.
No transitive dependencies.
```

**Example 4: `tariffs` table**
```
tariffs (id, name, utilityTypeId, minUsage, maxUsage, rate, fixedCharge, ...)

Primary Key: id

Dependencies:
- name → id ✅
- utilityTypeId → id ✅
- rate → id ✅

Utility type details (unit, description) are in utility_types table.
No transitive dependencies.
```

---

## 4. Normalization Benefits in Our Design

### 4.1 Data Integrity
✅ **Elimination of Update Anomalies**
- Customer information is stored once in `customers` table
- If a customer changes address, update only one record
- All bills automatically reference the updated information via foreign key

✅ **Elimination of Insertion Anomalies**
- Can add a customer without having bills
- Can add utility types without tariffs
- Can add meters without readings

✅ **Elimination of Deletion Anomalies**
- Deleting a bill doesn't delete customer information
- Cascade deletes are controlled via foreign key constraints
- Orphan records are prevented

### 4.2 Reduced Redundancy
- Customer details stored once, referenced by `customerId` in bills
- Utility type details stored once, referenced by `utilityTypeId` in meters
- No duplicate storage of customer names, addresses, etc.

### 4.3 Referential Integrity
All foreign keys maintain referential integrity:
```sql
bills.customerId → customers.id
meters.customerId → customers.id
meters.utilityTypeId → utility_types.id
meter_readings.meterId → meters.id
payments.billId → bills.id
complaints.customerId → customers.id
tariffs.utilityTypeId → utility_types.id
```

---

## 5. Normalization Verification Summary

| Table | 1NF | 2NF | 3NF | Notes |
|-------|-----|-----|-----|-------|
| utility_types | ✅ | ✅ | ✅ | Single PK, atomic values, no transitive deps |
| tariffs | ✅ | ✅ | ✅ | Single PK, utility info separated |
| customers | ✅ | ✅ | ✅ | Single PK, atomic values, no transitive deps |
| meters | ✅ | ✅ | ✅ | Single PK, customer & utility info separated |
| meter_readings | ✅ | ✅ | ✅ | Single PK, meter info separated |
| bills | ✅ | ✅ | ✅ | Single PK, customer info separated |
| payments | ✅ | ✅ | ✅ | Single PK, bill info separated |
| complaints | ✅ | ✅ | ✅ | Single PK, customer info separated |
| staff | ✅ | ✅ | ✅ | Single PK, atomic values, no transitive deps |

---

## 6. Relationship Diagram (Normalization Perspective)

```
utility_types (1)
    │
    ├─── (M) tariffs
    │         └── Stores pricing slabs for utility
    │
    └─── (M) meters
              ├── Links to (1) customers
              └── (M) meter_readings

customers (1)
    │
    ├─── (M) meters
    │         └── (M) meter_readings
    │
    ├─── (M) bills
    │         └── (M) payments
    │
    └─── (M) complaints

bills (1)
    └─── (M) payments
```

**Normalization Verification:**
- Each entity is stored in its own table
- Relationships are maintained via foreign keys
- No redundant data across tables
- All tables are in 3NF

---

## 7. Denormalization Considerations

**Where We Maintain Normalization:**
- Customer information is NOT duplicated in bills
- Utility type information is NOT duplicated in meters
- Meter information is NOT duplicated in readings

**Calculated Fields (Not Normalization Violations):**
In the `bills` table, we store:
- `consumption` = currentReading - previousReading
- `outstandingAmount` = totalAmount - paidAmount

**Justification:**
These are **derived attributes** but stored for:
1. Performance (avoid recalculating on every query)
2. Historical accuracy (values at time of billing)
3. Trigger-maintained consistency

This is an acceptable **controlled denormalization** for performance optimization while maintaining 3NF principles for core data.

---

## Conclusion

The Utility Management System database is **fully normalized to Third Normal Form (3NF)**:

✅ **1NF:** All tables contain atomic values with no repeating groups
✅ **2NF:** No partial dependencies exist; all non-key attributes depend on the entire primary key
✅ **3NF:** No transitive dependencies; all non-key attributes depend directly on the primary key

This design ensures:
- Data integrity and consistency
- Minimal redundancy
- Easy maintenance and updates
- Scalability for future requirements
- Referential integrity through foreign keys
