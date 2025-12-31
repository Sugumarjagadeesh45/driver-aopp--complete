# 🔧 Backend API Required - Wallet History with Pagination

## 📋 Overview

The Wallet History page ([WalletScreen.tsx](src/WalletScreen.tsx)) is ready and fully implemented with pagination support (10 transactions per page). However, it requires a backend API endpoint to fetch transaction history.

---

## ✅ Frontend Implementation (Complete)

The frontend has been updated with:

1. ✅ Pagination state management (page, totalPages, hasMore)
2. ✅ "Load More" button for loading next page
3. ✅ Page indicator showing "Page X of Y"
4. ✅ Pull-to-refresh to reset to page 1
5. ✅ Loading states for initial load and "Load More"
6. ✅ Empty state when no transactions exist
7. ✅ Professional UI with transaction cards

**Files Updated:**
- `WalletScreen.tsx` (lines 50-156, 340-393, 552-609)

---

## 📊 Required Backend API Endpoint

### **GET `/api/drivers/wallet/history/:driverId`**

**Description:** Fetch paginated transaction history for a driver

**Query Parameters:**
- `page` (number, required): Page number (starts from 1)
- `limit` (number, required): Items per page (frontend uses 10)

**Example Request:**
```
GET /api/drivers/wallet/history/dri10001?page=1&limit=10
```

**Response Format:**
```json
{
  "success": true,
  "driverId": "dri10001",
  "totalEarnings": 5250,
  "pendingAmount": 150,
  "transactions": [
    {
      "id": "txn_001",
      "type": "debit",
      "category": "working_hours_deduction",
      "amount": 100,
      "description": "Working hours started - ₹100 deducted",
      "date": "2025-12-30T10:30:00.000Z",
      "status": "completed"
    },
    {
      "id": "txn_002",
      "type": "debit",
      "category": "working_hours_deduction",
      "amount": 50,
      "description": "Extra Half Time - 05:59:59 added",
      "date": "2025-12-30T14:15:00.000Z",
      "status": "completed"
    },
    {
      "id": "txn_003",
      "type": "credit",
      "category": "wallet_added",
      "amount": 500,
      "description": "Wallet recharged by driver",
      "date": "2025-12-30T09:00:00.000Z",
      "status": "completed"
    },
    {
      "id": "txn_004",
      "type": "credit",
      "category": "incentive",
      "amount": 200,
      "description": "Weekly incentive bonus",
      "date": "2025-12-29T18:00:00.000Z",
      "status": "completed"
    },
    {
      "id": "txn_005",
      "type": "credit",
      "category": "ride_earning",
      "amount": 450,
      "description": "Ride #12345 completed",
      "date": "2025-12-29T16:30:00.000Z",
      "status": "completed"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalTransactions": 47,
    "limit": 10,
    "hasMore": true
  }
}
```

---

## 🔧 Backend Implementation Guide

### 1. Database Schema - Transaction Model

```javascript
// models/Transaction.js
const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  driverId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'incentive',           // Bonus/incentive given by admin
      'wallet_added',        // Driver added money to wallet
      'wallet_withdrawn',    // Driver withdrew money
      'ride_earning',        // Earnings from completed ride
      'working_hours_deduction'  // Deductions for online time/extra time
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  balanceAfter: {
    type: Number,  // Wallet balance after this transaction
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed'
  },
  metadata: {
    type: Object,  // Additional data (rideId, adminId, etc.)
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient pagination
transactionSchema.index({ driverId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
```

---

### 2. API Controller Implementation

```javascript
// controllers/wallet.controller.js
const Transaction = require('../models/Transaction');
const Driver = require('../models/Driver');

/**
 * Get paginated wallet transaction history for a driver
 * GET /api/drivers/wallet/history/:driverId
 */
const getWalletHistory = async (req, res) => {
  try {
    const { driverId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters'
      });
    }

    // Check if driver exists
    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Fetch transactions with pagination (sorted by newest first)
    const transactions = await Transaction.find({ driverId })
      .sort({ createdAt: -1 })  // Newest first
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalTransactions = await Transaction.countDocuments({ driverId });
    const totalPages = Math.ceil(totalTransactions / limit);
    const hasMore = page < totalPages;

    // Calculate total earnings (sum of all credit transactions)
    const earningsResult = await Transaction.aggregate([
      { $match: { driverId, type: 'credit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalEarnings = earningsResult.length > 0 ? earningsResult[0].total : 0;

    // Calculate pending amount (pending transactions)
    const pendingResult = await Transaction.aggregate([
      { $match: { driverId, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingAmount = pendingResult.length > 0 ? pendingResult[0].total : 0;

    // Format transactions for frontend
    const formattedTransactions = transactions.map(txn => ({
      id: txn.transactionId,
      type: txn.type,
      category: txn.category,
      amount: txn.amount,
      description: txn.description,
      date: txn.createdAt,
      status: txn.status
    }));

    return res.json({
      success: true,
      driverId,
      totalEarnings,
      pendingAmount,
      transactions: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        limit,
        hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching wallet history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet history'
    });
  }
};

module.exports = {
  getWalletHistory
};
```

---

### 3. Route Configuration

```javascript
// routes/wallet.routes.js
const express = require('express');
const router = express.Router();
const { getWalletHistory } = require('../controllers/wallet.controller');

// GET /api/drivers/wallet/history/:driverId
router.get('/drivers/wallet/history/:driverId', getWalletHistory);

module.exports = router;
```

**Add to main app:**
```javascript
// app.js or server.js
const walletRoutes = require('./routes/wallet.routes');
app.use('/api', walletRoutes);
```

---

## 📝 Creating Transactions

### When to Create Transaction Records:

#### 1. **Working Hours Started (₹100 deduction)**

```javascript
// In working-hours.controller.js
async function startWorkingHours(req, res) {
  const { driverId } = req.body;

  const driver = await Driver.findOne({ driverId });
  const deductionAmount = 100;

  // Deduct from wallet
  driver.wallet -= deductionAmount;
  await driver.save();

  // ✅ CREATE TRANSACTION RECORD
  await Transaction.create({
    driverId,
    type: 'debit',
    category: 'working_hours_deduction',
    amount: deductionAmount,
    description: 'Working hours started - ₹100 deducted',
    balanceAfter: driver.wallet,
    status: 'completed'
  });

  return res.json({
    success: true,
    walletBalance: driver.wallet,
    remainingSeconds: 43200
  });
}
```

#### 2. **Extra Half Time (₹50 deduction)**

```javascript
// In working-hours.controller.js
async function extendWorkingHours(req, res) {
  const { driverId, additionalSeconds, debitAmount } = req.body;

  const driver = await Driver.findOne({ driverId });

  // Deduct from wallet
  driver.wallet -= debitAmount;
  await driver.save();

  // ✅ CREATE TRANSACTION RECORD
  const hours = Math.floor(additionalSeconds / 3600);
  const minutes = Math.floor((additionalSeconds % 3600) / 60);
  const seconds = additionalSeconds % 60;
  const timeAdded = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  await Transaction.create({
    driverId,
    type: 'debit',
    category: 'working_hours_deduction',
    amount: debitAmount,
    description: `Extra Time - ${timeAdded} added`,
    balanceAfter: driver.wallet,
    status: 'completed'
  });

  return res.json({
    success: true,
    newWalletBalance: driver.wallet,
    newRemainingSeconds: currentSeconds + additionalSeconds
  });
}
```

#### 3. **Wallet Added by Driver/Admin**

```javascript
async function addWalletAmount(req, res) {
  const { driverId, amount, addedBy } = req.body;

  const driver = await Driver.findOne({ driverId });
  driver.wallet += amount;
  await driver.save();

  // ✅ CREATE TRANSACTION RECORD
  await Transaction.create({
    driverId,
    type: 'credit',
    category: 'wallet_added',
    amount,
    description: addedBy === 'admin'
      ? `Wallet credited by admin`
      : `Wallet recharged by driver`,
    balanceAfter: driver.wallet,
    status: 'completed',
    metadata: { addedBy }
  });

  return res.json({
    success: true,
    newBalance: driver.wallet
  });
}
```

#### 4. **Ride Earnings**

```javascript
async function completeRide(req, res) {
  const { driverId, rideId, fareAmount } = req.body;

  const driver = await Driver.findOne({ driverId });
  driver.wallet += fareAmount;
  await driver.save();

  // ✅ CREATE TRANSACTION RECORD
  await Transaction.create({
    driverId,
    type: 'credit',
    category: 'ride_earning',
    amount: fareAmount,
    description: `Ride #${rideId} completed`,
    balanceAfter: driver.wallet,
    status: 'completed',
    metadata: { rideId }
  });

  return res.json({
    success: true,
    earning: fareAmount,
    newBalance: driver.wallet
  });
}
```

#### 5. **Incentives/Bonuses**

```javascript
async function addIncentive(req, res) {
  const { driverId, amount, description } = req.body;

  const driver = await Driver.findOne({ driverId });
  driver.wallet += amount;
  await driver.save();

  // ✅ CREATE TRANSACTION RECORD
  await Transaction.create({
    driverId,
    type: 'credit',
    category: 'incentive',
    amount,
    description: description || 'Incentive bonus',
    balanceAfter: driver.wallet,
    status: 'completed'
  });

  return res.json({
    success: true,
    newBalance: driver.wallet
  });
}
```

#### 6. **Wallet Withdrawal**

```javascript
async function withdrawWallet(req, res) {
  const { driverId, amount } = req.body;

  const driver = await Driver.findOne({ driverId });

  if (driver.wallet < amount) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient balance'
    });
  }

  driver.wallet -= amount;
  await driver.save();

  // ✅ CREATE TRANSACTION RECORD
  await Transaction.create({
    driverId,
    type: 'debit',
    category: 'wallet_withdrawn',
    amount,
    description: `Withdrawal of ₹${amount}`,
    balanceAfter: driver.wallet,
    status: 'completed'
  });

  return res.json({
    success: true,
    withdrawnAmount: amount,
    newBalance: driver.wallet
  });
}
```

---

## 🎯 Testing After Implementation

### Step 1: Create some test transactions

Use Postman or similar to create test data:

```bash
# Add wallet amount
POST /api/drivers/wallet/add
{
  "driverId": "dri10001",
  "amount": 500,
  "addedBy": "admin"
}

# Start working hours (creates -₹100 transaction)
POST /api/drivers/working-hours/start
{
  "driverId": "dri10001"
}

# Extend working hours (creates -₹50 transaction)
POST /api/drivers/working-hours/extend
{
  "driverId": "dri10001",
  "additionalSeconds": 21599,
  "debitAmount": 50
}
```

### Step 2: Test pagination

```bash
# Get page 1
GET /api/drivers/wallet/history/dri10001?page=1&limit=10

# Get page 2
GET /api/drivers/wallet/history/dri10001?page=2&limit=10
```

### Step 3: Test in app

1. Open driver app
2. Navigate to Menu → Wallet
3. Should see:
   - Current balance ✅
   - Total earnings ✅
   - Transaction list (10 items) ✅
   - "Load More" button if more than 10 transactions ✅
   - Page indicator "Page 1 of X" ✅

4. Click "Load More"
   - Next 10 transactions should appear ✅
   - Page indicator updates to "Page 2 of X" ✅

5. Pull to refresh
   - Resets to page 1 ✅
   - Shows first 10 transactions ✅

---

## 📋 Summary

### Frontend (Complete):
- ✅ Pagination UI with "Load More" button
- ✅ Page indicator
- ✅ Pull-to-refresh
- ✅ Loading states
- ✅ Empty state
- ✅ Professional transaction cards

### Backend (Required):
- ❌ Transaction model/schema
- ❌ GET `/api/drivers/wallet/history/:driverId` endpoint
- ❌ Create transaction records when:
  - Working hours started (-₹100)
  - Extra time added (-₹50 or -₹100)
  - Wallet recharged (+amount)
  - Ride completed (+earnings)
  - Incentive given (+amount)
  - Withdrawal (-amount)

### Expected Result:
Once backend is implemented:
- ✅ Driver opens Wallet screen
- ✅ Sees complete transaction history
- ✅ Can load more transactions (10 per page)
- ✅ Can pull to refresh
- ✅ All transactions are properly categorized and timestamped

---

*This document provides complete implementation guide for Wallet History API with pagination support*
