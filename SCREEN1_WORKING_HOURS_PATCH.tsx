// ========================================
// WORKING HOURS SYSTEM - COMPLETE PATCH FOR SCREEN1.TSX
// ========================================
// Copy and paste each section into your Screen1.tsx file at the specified locations

// ========================================
// SECTION 1: ADD STATE VARIABLES (After line 171, after alertProgress state)
// ========================================

  // ========================================
  // WORKING HOURS TIMER STATES - START
  // ========================================

  // Timer state
  const [workingHoursTimer, setWorkingHoursTimer] = useState({
    active: false,
    remainingSeconds: 0,
    formattedTime: '12:00:00',
    warningsIssued: 0,
    walletDeducted: false,
    totalHours: 12,
  });

  // Warning modal state
  const [showWorkingHoursWarning, setShowWorkingHoursWarning] = useState(false);
  const [currentWarning, setCurrentWarning] = useState({
    number: 0,
    message: '',
    remainingTime: '',
  });

  // Timer polling interval ref
  const timerPollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Debouncing ref for preventing duplicate API calls
  const onlineStatusChanging = useRef(false);

  // ========================================
  // WORKING HOURS TIMER STATES - END
  // ========================================


// ========================================
// SECTION 2: ADD API FUNCTIONS (After your existing functions, before useEffect hooks)
// ========================================

  // ========================================
  // WORKING HOURS API FUNCTIONS - START
  // ========================================

  /**
   * Start Working Hours Timer
   * Called when driver goes ONLINE
   */
  const startWorkingHoursTimer = useCallback(async () => {
    try {
      console.log('⏱️ Starting working hours timer for driver:', driverId);

      const response = await fetch(`${API_BASE}/drivers/start-working-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Working hours timer started:', result);

        // Start polling for timer updates
        startTimerPolling();

        return true;
      } else {
        console.warn('⚠️ Timer start response:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to start working hours timer:', error);
      return false;
    }
  }, [driverId]);

  /**
   * Stop Working Hours Timer
   * Called when driver goes OFFLINE
   */
  const stopWorkingHoursTimer = useCallback(async () => {
    try {
      console.log('🛑 Stopping working hours timer for driver:', driverId);

      // Stop polling first
      if (timerPollingInterval.current) {
        clearInterval(timerPollingInterval.current);
        timerPollingInterval.current = null;
      }

      const response = await fetch(`${API_BASE}/drivers/stop-working-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Working hours timer stopped');

        // Reset timer state
        setWorkingHoursTimer({
          active: false,
          remainingSeconds: 0,
          formattedTime: '12:00:00',
          warningsIssued: 0,
          walletDeducted: false,
          totalHours: 12,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to stop working hours timer:', error);
      return false;
    }
  }, [driverId]);

  /**
   * Start Timer Polling
   * Fetches timer status every 5 seconds
   */
  const startTimerPolling = useCallback(() => {
    console.log('🔄 Starting timer status polling...');

    // Clear any existing interval
    if (timerPollingInterval.current) {
      clearInterval(timerPollingInterval.current);
    }

    // Fetch immediately
    fetchTimerStatus();

    // Then poll every 5 seconds
    timerPollingInterval.current = setInterval(() => {
      fetchTimerStatus();
    }, 5000);
  }, [driverId]);

  /**
   * Fetch Timer Status
   * Gets current timer state from backend
   */
  const fetchTimerStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/drivers/working-hours-status/${driverId}`
      );

      const result = await response.json();

      if (result.success) {
        // Update timer state
        setWorkingHoursTimer({
          active: result.timerActive || false,
          remainingSeconds: result.remainingSeconds || 0,
          formattedTime: result.formattedTime || '12:00:00',
          warningsIssued: result.warningsIssued || 0,
          walletDeducted: result.walletDeducted || false,
          totalHours: Math.floor((result.remainingSeconds || 0) / 3600),
        });

        // If timer is not active, stop polling
        if (!result.timerActive && timerPollingInterval.current) {
          clearInterval(timerPollingInterval.current);
          timerPollingInterval.current = null;
          console.log('⏸️ Timer inactive, stopped polling');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching timer status:', error);
    }
  }, [driverId]);

  /**
   * Purchase Extended Hours
   * Deducts ₹100 and adds 12 hours
   */
  const handlePurchaseExtendedHours = useCallback(async () => {
    try {
      setShowWorkingHoursWarning(false);

      const response = await fetch(`${API_BASE}/drivers/purchase-extended-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          additionalHours: 12
        })
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          "✅ Extended Hours Purchased",
          `₹100 deducted from wallet.\n\nYou now have 12 more hours to work.\n\nNew wallet balance: ₹${result.newBalance}`,
          [{ text: "OK" }]
        );

        // Refresh timer status immediately
        fetchTimerStatus();
      } else {
        Alert.alert("❌ Purchase Failed", result.message || "Insufficient wallet balance");
      }
    } catch (error) {
      console.error('❌ Failed to purchase extended hours:', error);
      Alert.alert("❌ Error", "Failed to purchase extended hours. Please try again.");
    }
  }, [driverId, fetchTimerStatus]);

  /**
   * Skip Warning
   * Dismisses warning without purchasing hours
   */
  const handleSkipWarning = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/drivers/skip-warning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          warningNumber: currentWarning.number
        })
      });

      const result = await response.json();

      setShowWorkingHoursWarning(false);

      if (result.success) {
        const message = currentWarning.number === 3
          ? "⚠️ Final warning skipped. ₹100 will be deducted when time expires if you continue working."
          : "⚠️ Warning skipped. You will receive another warning soon.";

        Alert.alert("Warning Skipped", message, [{ text: "OK" }]);
      }
    } catch (error) {
      console.error('❌ Failed to skip warning:', error);
    }
  }, [driverId, currentWarning.number]);

  /**
   * Format seconds to HH:MM:SS
   */
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========================================
  // WORKING HOURS API FUNCTIONS - END
  // ========================================


// ========================================
// SECTION 3: ADD SOCKET EVENT HANDLERS (Add these handler functions)
// ========================================

  // ========================================
  // SOCKET EVENT HANDLERS - START
  // ========================================

  /**
   * Handle Socket Disconnect
   */
  const handleDisconnect = useCallback((reason: any) => {
    console.log('🔌 Socket disconnected:', reason);
    setSocketConnected(false);
    setIsRegistered(false);
  }, []);

  /**
   * Handle Working Hours Warning
   * Triggered at 1h, 30m, and 10m remaining
   */
  const handleWorkingHoursWarning = useCallback((data: any) => {
    console.log('⚠️ Working hours warning received:', data);

    setCurrentWarning({
      number: data.warningNumber,
      message: data.message,
      remainingTime: formatTime(data.remainingSeconds),
    });

    setShowWorkingHoursWarning(true);

    // Also show alert
    Alert.alert(
      `⚠️ Working Hours Warning ${data.warningNumber}/3`,
      data.message,
      [{ text: "View Details", onPress: () => setShowWorkingHoursWarning(true) }]
    );
  }, []);

  /**
   * Handle Auto-Stop Event
   * Triggered when 12 hours expire
   */
  const handleAutoStop = useCallback((data: any) => {
    console.log('🛑 Auto-stop event received:', data);

    // Force driver offline
    setIsDriverOnline(false);
    setDriverStatus("offline");
    setWorkingHoursTimer(prev => ({ ...prev, active: false }));

    // Stop background tracking
    stopBackgroundLocationTracking();

    Alert.alert(
      "🛑 Auto-Stop: Shift Ended",
      "Your 12-hour working time has been completed.\n\nYou have been automatically set to OFFLINE.\n\nThank you for your service!",
      [{ text: "OK" }]
    );
  }, []);

  /**
   * Handle Socket Connect
   */
  const handleConnect = useCallback(() => {
    if (!isMounted.current) return;

    console.log('🔌 Socket connected, ID:', socket?.id);
    setSocketConnected(true);

    // Only register if driver is online
    if (location && driverId && isDriverOnline) {
      AsyncStorage.getItem("driverVehicleType").then(vehicleType => {
        const finalVehicleType = (vehicleType || "TAXI").toUpperCase(); // ✅ UPPERCASE

        console.log(`📝 Registering driver with socket...`, {
          driverId,
          driverName,
          vehicleType: finalVehicleType,
          location: { latitude: location.latitude, longitude: location.longitude }
        });

        socket.emit("registerDriver", {
          driverId,
          driverName,
          latitude: location.latitude,
          longitude: location.longitude,
          vehicleType: finalVehicleType, // ✅ Must be UPPERCASE
        });

        setIsRegistered(true);
        console.log(`✅ Driver registered as ${finalVehicleType}`);

        // Start location updates
        startLocationUpdates();
      });
    } else {
      console.log('⚠️ Skipping driver registration:', {
        hasLocation: !!location,
        hasDriverId: !!driverId,
        isOnline: isDriverOnline
      });
    }
  }, [location, driverId, driverName, isDriverOnline]);

  /**
   * Start Location Updates
   * Emits driver location to socket
   */
  const startLocationUpdates = useCallback(() => {
    if (!isDriverOnline || !location || !socket) return;

    console.log('📍 Starting location update broadcasts');

    // Emit initial location
    socket.emit("driverLocationUpdate", {
      driverId,
      latitude: location.latitude,
      longitude: location.longitude,
      status: driverStatus === "onRide" ? "onRide" : "Live",
      vehicleType: "TAXI"
    });
  }, [isDriverOnline, location, driverId, driverStatus, socket]);

  // ========================================
  // SOCKET EVENT HANDLERS - END
  // ========================================


// ========================================
// SECTION 4: REPLACE EXISTING toggleOnlineStatus FUNCTION
// Find your existing toggleOnlineStatus function and REPLACE IT COMPLETELY with this:
// ========================================

const toggleOnlineStatus = useCallback(async () => {
  // Prevent duplicate calls
  if (onlineStatusChanging.current) {
    console.log('⚠️ Status change already in progress, ignoring...');
    return;
  }

  onlineStatusChanging.current = true;

  try {
    if (isDriverOnline) {
      // ========== GOING OFFLINE ==========

      // Check if wallet was already deducted
      if (workingHoursTimer.walletDeducted) {
        Alert.alert(
          "⚠️ Confirm Offline",
          "₹100 has already been deducted from your wallet for extended hours.\n\nIf you go OFFLINE now, the amount will NOT be refunded.\n\nAre you sure you want to go OFFLINE?",
          [
            {
              text: "No, Stay Online",
              style: "cancel",
              onPress: () => {
                onlineStatusChanging.current = false;
              }
            },
            {
              text: "Yes, Go Offline",
              onPress: async () => {
                await stopWorkingHoursTimer();
                setIsDriverOnline(false);
                setDriverStatus("offline");
                stopBackgroundLocationTracking();

                if (socket && socket.connected) {
                  socket.emit("driverOffline", { driverId });
                }

                await AsyncStorage.setItem("driverOnlineStatus", "offline");
                console.log("🔴 Driver is now offline");

                onlineStatusChanging.current = false;
              }
            }
          ]
        );
        return;
      }

      // Normal offline (no deduction)
      await stopWorkingHoursTimer();
      setIsDriverOnline(false);
      setDriverStatus("offline");
      stopBackgroundLocationTracking();

      if (socket && socket.connected) {
        socket.emit("driverOffline", { driverId });
      }

      await AsyncStorage.setItem("driverOnlineStatus", "offline");
      console.log("🔴 Driver is now offline");

    } else {
      // ========== GOING ONLINE ==========

      if (!location) {
        Alert.alert("Location Required", "Please enable location services to go online.");
        onlineStatusChanging.current = false;
        return;
      }

      setIsDriverOnline(true);
      setDriverStatus("online");
      startBackgroundLocationTracking();

      // ✅ START WORKING HOURS TIMER
      const timerStarted = await startWorkingHoursTimer();

      if (!timerStarted) {
        console.warn('⚠️ Working hours timer did not start, but driver is online');
      }

      // Register with socket
      if (socket && !socket.connected) {
        socket.connect();
      }

      await AsyncStorage.setItem("driverOnlineStatus", "online");
      console.log("🟢 Driver is now online with working hours timer");
    }
  } finally {
    // Reset debouncing flag after 2 seconds
    setTimeout(() => {
      onlineStatusChanging.current = false;
    }, 2000);
  }
}, [
  isDriverOnline,
  location,
  driverId,
  workingHoursTimer.walletDeducted,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  startWorkingHoursTimer,
  stopWorkingHoursTimer
]);


// ========================================
// SECTION 5: ADD SOCKET CONNECTION useEffect
// Add this useEffect after your existing useEffect hooks
// ========================================

useEffect(() => {
  if (!socket) {
    console.error('❌ Socket not initialized');
    return;
  }

  // Only connect when driver is online
  if (isDriverOnline) {
    if (!socket.connected) {
      console.log('🔌 Connecting to socket server...');
      socket.connect();
    }

    // Set up event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
    });

    // Working hours listeners
    socket.on('workingHoursWarning', handleWorkingHoursWarning);
    socket.on('autoStopCompleted', handleAutoStop);

    // Ride listeners (keep your existing ones)
    // socket.on('newRideRequest', handleNotificationRideRequest);
    // socket.on('rideTakenByDriver', handleRideTaken);

  } else {
    // Driver is offline - disconnect socket
    if (socket.connected) {
      console.log('🔌 Disconnecting from socket server...');
      socket.disconnect();
    }
  }

  // Cleanup
  return () => {
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('workingHoursWarning', handleWorkingHoursWarning);
    socket.off('autoStopCompleted', handleAutoStop);
  };
}, [
  isDriverOnline,
  location,
  driverId,
  driverName,
  handleConnect,
  handleDisconnect,
  handleWorkingHoursWarning,
  handleAutoStop
]);


// ========================================
// SECTION 6: ADD UI COMPONENTS TO YOUR RETURN STATEMENT
// Add these components inside your main <View> in the return statement
// ========================================

{/* ========================================
    WORKING HOURS TIMER DISPLAY
    Add this near the top of your UI, after MapView
    ======================================== */}

{/* Timer Display - Top Right Corner */}
{workingHoursTimer.active && isDriverOnline && (
  <View style={styles.workingHoursTimerContainer}>
    <MaterialIcons name="access-time" size={18} color="#FF6B6B" />
    <Text style={styles.workingHoursTimerText}>
      {workingHoursTimer.formattedTime}
    </Text>
    <Text style={styles.workingHoursLabel}>Working Time</Text>
  </View>
)}

{/* ========================================
    WORKING HOURS WARNING MODAL
    Add this at the end of your return statement, before the last </View>
    ======================================== */}

{/* Warning Modal */}
<Modal
  visible={showWorkingHoursWarning}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setShowWorkingHoursWarning(false)}
>
  <View style={styles.warningModalContainer}>
    <View style={styles.warningModalContent}>
      <MaterialIcons name="warning" size={60} color="#FF6B6B" />

      <Text style={styles.warningTitle}>
        ⚠️ Working Hours Warning {currentWarning.number}/3
      </Text>

      <ScrollView style={styles.warningMessageContainer}>
        <Text style={styles.warningMessage}>
          {currentWarning.message}
        </Text>

        {currentWarning.remainingTime && (
          <Text style={styles.warningRemainingTime}>
            Time Remaining: {currentWarning.remainingTime}
          </Text>
        )}
      </ScrollView>

      <View style={styles.warningButtons}>
        <TouchableOpacity
          style={[styles.warningButton, styles.skipButton]}
          onPress={handleSkipWarning}
        >
          <Text style={styles.buttonText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.warningButton, styles.continueButton]}
          onPress={handlePurchaseExtendedHours}
        >
          <Text style={styles.buttonText}>Continue (₹100)</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


// ========================================
// SECTION 7: ADD STYLES
// Add these styles to your StyleSheet.create({ ... })
// ========================================

// Working Hours Timer Display (Top Right)
workingHoursTimerContainer: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 60 : 20,
  right: 20,
  backgroundColor: '#fff',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
  borderWidth: 2,
  borderColor: '#FF6B6B',
  zIndex: 1000,
},
workingHoursTimerText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#FF6B6B',
  marginLeft: 6,
  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
},
workingHoursLabel: {
  fontSize: 9,
  color: '#666',
  marginLeft: 6,
  fontWeight: '600',
},

// Warning Modal
warningModalContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.7)',
},
warningModalContent: {
  width: '85%',
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 25,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
},
warningTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#FF6B6B',
  marginTop: 15,
  marginBottom: 15,
  textAlign: 'center',
},
warningMessageContainer: {
  maxHeight: 200,
  marginBottom: 20,
  width: '100%',
},
warningMessage: {
  fontSize: 16,
  color: '#333',
  textAlign: 'center',
  lineHeight: 24,
},
warningRemainingTime: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#FF6B6B',
  textAlign: 'center',
  marginTop: 10,
  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
},
warningButtons: {
  flexDirection: 'row',
  gap: 15,
  width: '100%',
},
warningButton: {
  flex: 1,
  padding: 15,
  borderRadius: 12,
  alignItems: 'center',
},
skipButton: {
  backgroundColor: '#95a5a6',
},
continueButton: {
  backgroundColor: '#2ecc71',
},
buttonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},


// ========================================
// SECTION 8: ADD CLEANUP
// Add this to your existing cleanup useEffect (the one with return () => {...})
// ========================================

// Clean up timer polling
if (timerPollingInterval.current) {
  clearInterval(timerPollingInterval.current);
}


// ========================================
// THAT'S IT! Your working hours system is now integrated! 🎉
// ========================================
