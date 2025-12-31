# 🔧 Backend API Fix Required - Wallet Balance

## ❌ Current Problem

**Issue:** Wallet balance is NOT updating in the frontend Menu screen after going ONLINE.

**Root Cause:** Backend API `/drivers/working-hours/start` is deducting ₹100 correctly, but NOT returning the new wallet balance in the response.

---

## 📊 Current Backend Behavior

### API Endpoint: `POST /api/drivers/working-hours/start`

**Current Response:**
```json
{
  "success": true,
  "message": "Timer started successfully",
  "totalHours": 12,
  "remainingSeconds": 43200
}
```

**What's Missing:** `walletBalance` field

**Console Logs Show:**
```
📝 Transaction created for shift start deduction: -₹100
💰 Deducted ₹100 from driver dri10001. New Balance: 2250
```

The backend IS deducting ₹100 correctly and has the new balance (2250), but it's NOT sending it back to the frontend.

---

## ✅ Required Fix

### Update Response Format

**New Response (Required):**
```json
{
  "success": true,
  "message": "Timer started successfully",
  "totalHours": 12,
  "remainingSeconds": 43200,
  "walletBalance": 2250  // ✅ ADD THIS FIELD
}
```

---

## 🔧 Backend Code Changes Needed

### File: `working-hours.controller.js` (or similar)

**Current Code (Approximate):**
```javascript
async startTimer(req, res) {
  const { driverId } = req.body;

  // Deduct ₹100 from wallet
  const driver = await Driver.findOne({ driverId });
  driver.wallet -= 100;
  await driver.save();

  // Create transaction
  await Transaction.create({
    driverId,
    type: 'DEBIT',
    amount: -100,
    description: 'Shift start deduction'
  });

  // Start timer
  const timer = await WorkingHoursTimer.create({
    driverId,
    totalHours: 12,
    remainingSeconds: 43200
  });

  // ❌ PROBLEM: Not returning wallet balance
  return res.json({
    success: true,
    message: 'Timer started successfully',
    totalHours: 12,
    remainingSeconds: 43200
  });
}
```

**Fixed Code:**
```javascript
async startTimer(req, res) {
  const { driverId } = req.body;

  // Deduct ₹100 from wallet
  const driver = await Driver.findOne({ driverId });
  driver.wallet -= 100;
  await driver.save();

  // Create transaction
  await Transaction.create({
    driverId,
    type: 'DEBIT',
    amount: -100,
    description: 'Shift start deduction'
  });

  // Start timer
  const timer = await WorkingHoursTimer.create({
    driverId,
    totalHours: 12,
    remainingSeconds: 43200
  });

  // ✅ FIX: Return wallet balance
  return res.json({
    success: true,
    message: 'Timer started successfully',
    totalHours: 12,
    remainingSeconds: 43200,
    walletBalance: driver.wallet  // ✅ ADD THIS LINE
  });
}
```

---

## 🔄 Frontend Handling

The frontend is already prepared to handle the wallet balance:

**Screen1.tsx (line 860-868):**
```typescript
// ✅ FIX: Update wallet balance (check if backend returns it)
if (result.walletBalance !== undefined) {
  console.log(`💰 Wallet Debited. New Balance: ₹${result.walletBalance}`);
  updateLocalWalletBalance(result.walletBalance);
} else {
  // Backend didn't return wallet balance, fetch it separately
  console.log('⚠️ Backend did not return walletBalance, fetching separately...');
  fetchAndUpdateWalletBalance();
}
```

**Fallback Mechanism:**
If backend doesn't return `walletBalance`, frontend will make a separate API call to:
```
GET /api/drivers/:driverId/wallet
```

This requires creating a new endpoint.

---

## 📋 Required Backend Changes

### 1. Update `/drivers/working-hours/start` Response (REQUIRED)
Add `walletBalance` to response.

### 2. Create `/drivers/:driverId/wallet` Endpoint (Optional - Fallback)

**Endpoint:** `GET /api/drivers/:driverId/wallet`

**Response:**
```json
{
  "success": true,
  "walletBalance": 2250,
  "driverId": "dri10001"
}
```

**Code Example:**
```javascript
router.get('/drivers/:driverId/wallet', async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findOne({ driverId });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    return res.json({
      success: true,
      walletBalance: driver.wallet,
      driverId: driver.driverId
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching wallet balance'
    });
  }
});
```

---

## 🎯 Testing After Fix

### Step 1: Start the backend server
### Step 2: Open the driver app
### Step 3: Check wallet balance in Menu (e.g., ₹2350)
### Step 4: Click ONLINE button

**Expected Console Logs:**
```
⏱️ Starting working hours timer for driver: dri10001
💰 Wallet Debited. New Balance: ₹2250
✅ Local wallet updated to: ₹2250
```

### Step 5: Open Menu screen

**Expected Result:**
- Wallet balance shows: **₹2250** (decreased by ₹100) ✅
- Working Hours timer shows: **11:59:59** (counting down) ✅

---

## 📊 API Endpoints Summary

### Required Changes:

1. **POST `/api/drivers/working-hours/start`** (MODIFY)
   - Add `walletBalance` to response
   - Already deducts ₹100 correctly ✅
   - Just needs to return the new balance

2. **POST `/api/drivers/working-hours/extend`** (MODIFY - if not done)
   - Should also return `newWalletBalance` after extending time
   - Used by "Extra Half Time" and "Extra Full Time" buttons

3. **GET `/api/drivers/:driverId/wallet`** (CREATE - Optional)
   - Fallback endpoint to fetch wallet balance
   - Used if main endpoints don't return balance

---

## ✅ Summary

**What's Working:**
- ✅ Backend correctly deducts ₹100 from wallet
- ✅ Backend saves transaction to database
- ✅ Timer starts correctly
- ✅ Frontend has all the logic to update wallet

**What's Missing:**
- ❌ Backend not returning `walletBalance` in response
- ❌ Frontend can't update Menu UI without the new balance

**Fix Required:**
- Add ONE line to backend: `walletBalance: driver.wallet`
- That's it! 🎉

---

*This document explains the backend changes needed to fix wallet balance updates*
