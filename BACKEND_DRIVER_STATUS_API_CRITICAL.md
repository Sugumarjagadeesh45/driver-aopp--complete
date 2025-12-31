# 🚨 CRITICAL: Backend Driver Status API Required

## ❌ Critical Problem

**Issue:** Driver's online/offline state and working hours timer are NOT restored after logout/login.

**Current Behavior:**
1. Driver goes ONLINE → ₹100 debited ✅
2. Driver logs out (while ONLINE)
3. Driver logs in again
4. **UI shows OFFLINE** (red button) ❌
5. Driver clicks ONLINE again
6. **Wallet debited AGAIN** ❌
7. **Timer resets** ❌

**This causes:**
- Duplicate wallet debits
- Timer resets incorrectly
- Incorrect UI state
- Poor user experience

---

## ✅ Solution Implemented (Frontend)

The frontend has been updated to:

1. **Fetch driver status from backend on login** ([Screen1.tsx](src/Screen1.tsx:1172-1240))
2. **Restore online/offline state from backend**
3. **Restore working hours timer with remaining seconds**
4. **Prevent duplicate wallet debits** ([Screen1.tsx](src/Screen1.tsx:1096-1120))
5. **Update wallet balance in real-time**

---

## 📊 Required Backend API Endpoint

### **GET `/api/drivers/:driverId/status`**

**Description:** Fetch current driver status including online/offline state, working hours timer, and wallet balance

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Example Request:**
```
GET /api/drivers/dri10001/status
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "Content-Type": "application/json"
}
```

**Response Format:**
```json
{
  "success": true,
  "driverId": "dri10001",
  "isOnline": true,
  "walletBalance": 2250,
  "workingHours": {
    "active": true,
    "remainingSeconds": 38420,
    "totalHours": 12,
    "startedAt": "2025-12-30T10:30:00.000Z",
    "expiresAt": "2025-12-30T22:30:00.000Z"
  }
}
```

**Response When Driver is OFFLINE:**
```json
{
  "success": true,
  "driverId": "dri10001",
  "isOnline": false,
  "walletBalance": 2350,
  "workingHours": {
    "active": false,
    "remainingSeconds": 0,
    "totalHours": 0
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | API call status |
| `driverId` | string | Driver's unique ID |
| `isOnline` | boolean | **CRITICAL:** True if driver is currently online, false if offline |
| `walletBalance` | number | Current wallet balance |
| `workingHours.active` | boolean | **CRITICAL:** True if working hours timer is running |
| `workingHours.remainingSeconds` | number | **CRITICAL:** Seconds remaining in working hours timer |
| `workingHours.totalHours` | number | Total hours assigned (12 or 24) |
| `workingHours.startedAt` | string (ISO date) | When timer started |
| `workingHours.expiresAt` | string (ISO date) | When timer will expire |

---

## 🔧 Backend Implementation Guide

### 1. Database Schema Updates

#### **Driver Model:**
```javascript
// models/Driver.js
const driverSchema = new mongoose.Schema({
  driverId: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  wallet: { type: Number, default: 0 },

  // ✅ ADD THESE FIELDS
  isOnline: {
    type: Boolean,
    default: false
  },
  workingHoursTimerActive: {
    type: Boolean,
    default: false
  },
  workingHoursStartedAt: {
    type: Date,
    default: null
  },
  workingHoursTotalSeconds: {
    type: Number,
    default: 43200  // 12 hours
  },
  workingHoursTotalHours: {
    type: Number,
    default: 12
  }
});
```

---

### 2. Controller Implementation

```javascript
// controllers/driver.controller.js

/**
 * Get current driver status
 * GET /api/drivers/:driverId/status
 */
const getDriverStatus = async (req, res) => {
  try {
    const { driverId } = req.params;

    // Find driver in database
    const driver = await Driver.findOne({ driverId });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Calculate remaining seconds in working hours timer
    let remainingSeconds = 0;
    let active = false;

    if (driver.workingHoursTimerActive && driver.workingHoursStartedAt) {
      const now = new Date();
      const startedAt = new Date(driver.workingHoursStartedAt);
      const elapsedSeconds = Math.floor((now - startedAt) / 1000);
      remainingSeconds = Math.max(0, driver.workingHoursTotalSeconds - elapsedSeconds);

      // If timer expired, set as inactive
      if (remainingSeconds <= 0) {
        driver.workingHoursTimerActive = false;
        driver.isOnline = false;
        await driver.save();
        active = false;
      } else {
        active = true;
      }
    }

    // Calculate expiry time
    let expiresAt = null;
    if (active && driver.workingHoursStartedAt) {
      expiresAt = new Date(
        driver.workingHoursStartedAt.getTime() +
        (driver.workingHoursTotalSeconds * 1000)
      );
    }

    return res.json({
      success: true,
      driverId: driver.driverId,
      isOnline: driver.isOnline,
      walletBalance: driver.wallet,
      workingHours: {
        active: active,
        remainingSeconds: remainingSeconds,
        totalHours: driver.workingHoursTotalHours || 12,
        startedAt: driver.workingHoursStartedAt,
        expiresAt: expiresAt
      }
    });

  } catch (error) {
    console.error('Error fetching driver status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch driver status'
    });
  }
};

module.exports = {
  getDriverStatus
};
```

---

### 3. Update `/drivers/working-hours/start` Endpoint

**Modify existing endpoint to save timer data to database:**

```javascript
// controllers/working-hours.controller.js

async function startWorkingHours(req, res) {
  try {
    const { driverId } = req.body;

    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // ✅ CHECK: If timer already active, don't debit again
    if (driver.workingHoursTimerActive) {
      const now = new Date();
      const startedAt = new Date(driver.workingHoursStartedAt);
      const elapsedSeconds = Math.floor((now - startedAt) / 1000);
      const remainingSeconds = Math.max(0, driver.workingHoursTotalSeconds - elapsedSeconds);

      if (remainingSeconds > 0) {
        console.log('⚠️ Working hours timer already active, not debiting wallet');
        return res.json({
          success: true,
          message: 'Timer already running',
          remainingSeconds: remainingSeconds,
          walletBalance: driver.wallet,
          alreadyActive: true
        });
      }
    }

    // Check wallet balance
    const deductionAmount = 100;
    if (driver.wallet < deductionAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Deduct from wallet
    driver.wallet -= deductionAmount;

    // ✅ SAVE TIMER DATA TO DATABASE
    driver.isOnline = true;
    driver.workingHoursTimerActive = true;
    driver.workingHoursStartedAt = new Date();
    driver.workingHoursTotalSeconds = 43200; // 12 hours
    driver.workingHoursTotalHours = 12;

    await driver.save();

    // Create transaction record
    await Transaction.create({
      driverId,
      type: 'debit',
      category: 'working_hours_deduction',
      amount: deductionAmount,
      description: 'Working hours started - ₹100 deducted',
      balanceAfter: driver.wallet,
      status: 'completed'
    });

    console.log(`💰 Deducted ₹${deductionAmount}. New Balance: ${driver.wallet}`);

    return res.json({
      success: true,
      message: 'Timer started successfully',
      remainingSeconds: 43200,
      totalHours: 12,
      walletBalance: driver.wallet  // ✅ RETURN WALLET BALANCE
    });

  } catch (error) {
    console.error('Error starting working hours:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start working hours'
    });
  }
}
```

---

### 4. Update `/drivers/working-hours/extend` Endpoint

**Save extended time to database:**

```javascript
async function extendWorkingHours(req, res) {
  try {
    const { driverId, additionalSeconds, debitAmount } = req.body;

    const driver = await Driver.findOne({ driverId });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Check wallet balance
    if (driver.wallet < debitAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Deduct from wallet
    driver.wallet -= debitAmount;

    // ✅ UPDATE TIMER IN DATABASE
    driver.workingHoursTotalSeconds += additionalSeconds;

    await driver.save();

    // Create transaction record
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

    // Calculate new remaining seconds
    const now = new Date();
    const startedAt = new Date(driver.workingHoursStartedAt);
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    const newRemainingSeconds = Math.max(0, driver.workingHoursTotalSeconds - elapsedSeconds);

    return res.json({
      success: true,
      message: 'Working hours extended',
      newRemainingSeconds: newRemainingSeconds,
      newWalletBalance: driver.wallet  // ✅ RETURN WALLET BALANCE
    });

  } catch (error) {
    console.error('Error extending working hours:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to extend working hours'
    });
  }
}
```

---

### 5. Update Socket Events

**When driver goes offline:**

```javascript
socket.on('driverOffline', async (data) => {
  try {
    const { driverId } = data;

    // ✅ UPDATE DATABASE
    await Driver.updateOne(
      { driverId },
      {
        isOnline: false,
        workingHoursTimerActive: false
      }
    );

    console.log(`Driver ${driverId} is now OFFLINE`);
  } catch (error) {
    console.error('Error updating driver offline status:', error);
  }
});
```

---

### 6. Route Configuration

```javascript
// routes/driver.routes.js
const express = require('express');
const router = express.Router();
const { getDriverStatus } = require('../controllers/driver.controller');
const { authenticateToken } = require('../middleware/auth');

// GET /api/drivers/:driverId/status
router.get('/drivers/:driverId/status', authenticateToken, getDriverStatus);

module.exports = router;
```

---

## 🔄 Complete Flow After Implementation

### Scenario 1: Driver Goes ONLINE, Logs Out, Logs In

```
1. Driver clicks ONLINE
   ↓
2. Backend:
   - Checks if timer already active ✅
   - If NO: Deducts ₹100, starts timer
   - If YES: Returns existing timer, no debit
   - Saves: isOnline=true, timerActive=true, startedAt=now
   ↓
3. Driver logs out (while ONLINE)
   ↓
4. Driver logs in again
   ↓
5. Frontend calls: GET /drivers/dri10001/status
   ↓
6. Backend calculates remaining seconds:
   - elapsedSeconds = now - startedAt
   - remainingSeconds = totalSeconds - elapsedSeconds
   ↓
7. Backend returns:
   - isOnline: true
   - workingHours.active: true
   - workingHours.remainingSeconds: 38420
   - walletBalance: 2250
   ↓
8. Frontend restores:
   - Button shows GREEN (ONLINE) ✅
   - Timer resumes from 38420s ✅
   - Wallet shows ₹2250 ✅
   ↓
9. Driver clicks ONLINE again (by mistake)
   ↓
10. Frontend checks: timer already active? YES
    ↓
11. Frontend: Just set UI to ONLINE, NO API call ✅
    - OR -
    Backend: Timer already active, return existing, NO debit ✅
```

### Scenario 2: Driver Goes OFFLINE, Logs Out, Logs In

```
1. Driver clicks OFFLINE
   ↓
2. Backend updates:
   - isOnline = false
   - timerActive = false
   ↓
3. Driver logs out
   ↓
4. Driver logs in
   ↓
5. GET /drivers/dri10001/status returns:
   - isOnline: false
   - workingHours.active: false
   ↓
6. Frontend shows:
   - Button shows RED (OFFLINE) ✅
   - No timer running ✅
```

---

## 🎯 Testing After Implementation

### Test 1: Online Status Persistence
```bash
1. Login → Should show OFFLINE (red)
2. Click ONLINE → Wallet debited ₹100
3. Check console: "💰 Wallet Debited. New Balance: ₹2250"
4. Logout
5. Login again
6. Expected:
   - Button is GREEN ✅
   - Console shows: "🟢 Driver is ONLINE - restoring state"
   - Console shows: "⏱️ Restoring timer: XXXXs remaining"
   - Wallet shows ₹2250 ✅
```

### Test 2: Prevent Duplicate Debit
```bash
1. Go ONLINE → Wallet debited ₹100
2. Logout
3. Login → Button is GREEN
4. Click ONLINE again
5. Expected:
   - Console shows: "⚠️ Working hours timer already active"
   - Wallet NOT debited again ✅
   - Timer continues from where it left off ✅
```

### Test 3: Timer Continuation
```bash
1. Go ONLINE → Timer starts at 12:00:00
2. Wait 5 minutes (timer now at 11:55:00)
3. Logout
4. Login
5. Expected:
   - Timer shows ~11:55:00 (continues from where it was) ✅
   - NOT reset to 12:00:00 ✅
```

### Test 4: Wallet Balance Real-Time Update
```bash
1. Check wallet in Menu: ₹2350
2. Click ONLINE
3. Expected:
   - Wallet updates immediately to ₹2250 ✅
   - No need to logout/refresh ✅
4. Open Profile → Shows ₹2250 ✅
5. Click Extra Half Time (₹50 debit)
6. Expected:
   - Wallet updates immediately to ₹2200 ✅
```

---

## 📋 Summary

### Frontend (Complete):
- ✅ Fetches driver status from backend on login
- ✅ Restores online/offline state from backend
- ✅ Restores working hours timer with remaining seconds
- ✅ Prevents duplicate wallet debits
- ✅ Updates wallet balance in real-time

### Backend (Required):
- ❌ Create `GET /api/drivers/:driverId/status` endpoint
- ❌ Add fields to Driver model: `isOnline`, `workingHoursTimerActive`, `workingHoursStartedAt`, `workingHoursTotalSeconds`
- ❌ Modify `/drivers/working-hours/start` to check if timer already active
- ❌ Modify `/drivers/working-hours/extend` to update database
- ❌ Update socket events to save online/offline status

### Expected Result:
- ✅ Driver goes ONLINE → Logout → Login → Still shows ONLINE
- ✅ Timer continues from where it left off (no reset)
- ✅ No duplicate wallet debits
- ✅ Wallet balance updates immediately in UI
- ✅ Perfect user experience!

---

*This is a CRITICAL fix required for proper app functionality*
