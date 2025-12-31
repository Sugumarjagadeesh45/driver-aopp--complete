# 🔧 Backend Fix Required - Online/Offline Status Persistence

## ❌ Current Problem

**Issue:** When a driver logs out and logs back in (or opens the app on a different device), the ONLINE/OFFLINE UI state does not correctly restore.

**Root Cause:** The backend is not:
1. Returning the `onlineStatus` field in the driver object during login
2. Saving the online/offline status to the database when driver changes status

---

## 📊 Current Behavior

### What Happens Now:
```
Driver goes ONLINE
        ↓
Frontend saves to local AsyncStorage only
        ↓
Driver logs out
        ↓
Driver logs in again
        ↓
Backend returns driver data WITHOUT onlineStatus field
        ↓
❌ Frontend cannot restore correct online/offline state
```

---

## ✅ Required Fix

### 1. Update Driver Schema (Database)

Add `onlineStatus` field to the Driver model:

```javascript
// Driver Model (e.g., models/Driver.js)
const driverSchema = new mongoose.Schema({
  driverId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  password: String,
  vehicleType: String,
  vehicleNumber: String,
  wallet: { type: Number, default: 0 },

  // ✅ ADD THIS FIELD
  onlineStatus: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },

  // ... other fields
});
```

---

### 2. Update Login Response

**File:** `auth.controller.js` (or similar)

**Current Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "driver": {
    "driverId": "dri10001",
    "name": "John Doe",
    "phone": "+919876543210",
    "vehicleType": "taxi",
    "vehicleNumber": "KA01AB1234",
    "wallet": 2350
    // ❌ Missing onlineStatus
  }
}
```

**Required Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "driver": {
    "driverId": "dri10001",
    "name": "John Doe",
    "phone": "+919876543210",
    "vehicleType": "taxi",
    "vehicleNumber": "KA01AB1234",
    "wallet": 2350,
    "onlineStatus": "offline"  // ✅ ADD THIS FIELD
  }
}
```

**Code Example:**
```javascript
// auth.controller.js - Login endpoint
async function login(req, res) {
  try {
    const { phoneNumber } = req.body;

    const driver = await Driver.findOne({ phone: phoneNumber });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const token = jwt.sign({ driverId: driver.driverId }, JWT_SECRET);

    // ✅ FIX: Include onlineStatus in response
    return res.json({
      success: true,
      token,
      driver: {
        driverId: driver.driverId,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        wallet: driver.wallet,
        onlineStatus: driver.onlineStatus || 'offline', // ✅ ADD THIS
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
}
```

---

### 3. Update Online/Offline Endpoints

**Endpoint:** Socket event `driverOnline` or API endpoint

When driver goes ONLINE, update database:

```javascript
// Socket event handler or API endpoint
socket.on('driverOnline', async (data) => {
  try {
    const { driverId } = data;

    // ✅ FIX: Update database with online status
    await Driver.updateOne(
      { driverId },
      { onlineStatus: 'online' }
    );

    console.log(`Driver ${driverId} is now ONLINE`);
  } catch (error) {
    console.error('Error updating driver online status:', error);
  }
});

socket.on('driverOffline', async (data) => {
  try {
    const { driverId } = data;

    // ✅ FIX: Update database with offline status
    await Driver.updateOne(
      { driverId },
      { onlineStatus: 'offline' }
    );

    console.log(`Driver ${driverId} is now OFFLINE`);
  } catch (error) {
    console.error('Error updating driver offline status:', error);
  }
});
```

**Alternative (REST API endpoints):**

```javascript
// POST /api/drivers/status/online
router.post('/drivers/status/online', async (req, res) => {
  try {
    const { driverId } = req.body;

    const driver = await Driver.findOneAndUpdate(
      { driverId },
      { onlineStatus: 'online' },
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Driver is now online',
      onlineStatus: driver.onlineStatus
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
});

// POST /api/drivers/status/offline
router.post('/drivers/status/offline', async (req, res) => {
  try {
    const { driverId } = req.body;

    const driver = await Driver.findOneAndUpdate(
      { driverId },
      { onlineStatus: 'offline' },
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Driver is now offline',
      onlineStatus: driver.onlineStatus
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
});
```

---

## 🔄 Frontend Changes (Already Done)

The frontend has been updated to:

1. ✅ Read `onlineStatus` from `driverInfo` object during app startup
2. ✅ Update `driverInfo.onlineStatus` in AsyncStorage when going online/offline
3. ✅ Restore UI state from `driverInfo.onlineStatus` instead of separate key

**Files Updated:**
- `Screen1.tsx` (lines 1114-1125, 1024-1035, 1104-1115)
- `MenuScreen.tsx` (line 33 - added `onlineStatus` to interface)

---

## 🎯 Testing After Fix

### Step 1: Start backend server
### Step 2: Login to driver app
### Step 3: Check initial status
- Should be OFFLINE (red button) ✅

### Step 4: Click ONLINE button
**Expected:**
- Button turns green ✅
- Console shows: `📊 Updated driverInfo with online status`
- Database shows: `onlineStatus: 'online'`

### Step 5: Logout and login again
**Expected:**
- Button is GREEN (not red) ✅
- Console shows: `📊 Driver online status from backend: online`
- Console shows: `🟢 Restoring ONLINE status from backend data`

### Step 6: Click OFFLINE button
**Expected:**
- Button turns red ✅
- Console shows: `📊 Updated driverInfo with offline status`
- Database shows: `onlineStatus: 'offline'`

### Step 7: Logout and login again
**Expected:**
- Button is RED ✅
- Console shows: `📊 Driver online status from backend: offline`
- Console shows: `🔴 Driver was OFFLINE (status from backend)`

---

## 📋 Required Backend Changes Summary

### 1. Database Schema (REQUIRED)
Add `onlineStatus` field to Driver model:
- Type: String
- Enum: ['online', 'offline']
- Default: 'offline'

### 2. Login API (REQUIRED)
Return `onlineStatus` in driver object:
- Endpoint: `POST /api/auth/get-driver-info`
- Add `onlineStatus: driver.onlineStatus || 'offline'` to response

### 3. Socket/API Events (REQUIRED)
Update database when driver changes status:
- `driverOnline` event: Set `onlineStatus = 'online'`
- `driverOffline` event: Set `onlineStatus = 'offline'`

---

## ✅ Summary

**What's Working:**
- ✅ Frontend saves online status to local AsyncStorage
- ✅ Frontend reads online status from driverInfo object
- ✅ Frontend updates AsyncStorage when status changes

**What's Missing:**
- ❌ Backend not returning `onlineStatus` in login response
- ❌ Backend not saving `onlineStatus` to database

**Fix Required:**
1. Add `onlineStatus` field to Driver schema
2. Return `onlineStatus` in login API response
3. Update database when driver goes online/offline (socket events or API endpoints)

**Result After Fix:**
- ✅ Driver logs in → sees correct online/offline button state
- ✅ Driver can logout, login on different device → correct state restored
- ✅ Multi-device support (same driver on multiple devices)

---

*This document explains the backend changes needed to fix online/offline status persistence after logout/login*
