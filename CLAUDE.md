# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **EazyGo Driver** - a React Native driver application for a taxi/ride-hailing service. The app allows drivers to receive ride requests, track active rides with real-time location updates, and manage their online/offline status. It uses Socket.io for real-time communication with the backend and Firebase for authentication and push notifications.

## Development Commands

### Setup
```bash
# Install dependencies
npm install

# iOS only: Install CocoaPods dependencies
bundle install
cd ios && bundle exec pod install && cd ..
```

### Running the App
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Testing and Linting
```bash
# Run tests
npm test

# Run linter
npm run lint
```

## Architecture Overview

### Navigation Flow
The app uses React Navigation with a stack-based navigation system:

1. **LoginScreen** - Firebase phone authentication entry point
2. **Screen1** (DriverScreen) - Main driver dashboard with map, ride requests, and status management
3. **ActiveRideScreen** - Active ride tracking with pickup/dropoff navigation
4. **RejectRideScreen** - Interface for rejecting rides with reasons

Navigation is defined in [App.tsx](App.tsx) with `RootStackParamList` type definitions.

### Authentication & Session Management
- **Firebase Phone Auth**: OTP-based login via Firebase Authentication ([LoginScreen.tsx:20-21](LoginScreen.tsx#L20-L21))
- **Session Persistence**: AuthToken and driver info stored in AsyncStorage
- **Auto-login**: On app launch, checks AsyncStorage for valid credentials and navigates directly to Screen1 if found ([App.tsx:148-178](App.tsx#L148-L178))

### Real-time Communication
- **Socket.io Client**: Configured in [src/socket.ts](src/socket.ts)
- **WebSocket Transport**: Uses websocket-only transport with auto-reconnection
- **Key Events**:
  - `driverLocationUpdate` - Sends driver location updates
  - `rideRequest` - Receives new ride requests
  - `rideAccepted`, `rideRejected` - Ride status updates

### Backend Integration
- **API Configuration**: [src/apiConfig.ts](src/apiConfig.ts) contains server URLs
  - Production: `https://taxi.webase.co.in`
  - Localhost configuration available (commented out)
- **Axios Instance**: [utils/api.ts](utils/api.ts) configured with auth token interceptor
- **API Base URL**: `/api` suffix for HTTP requests

### Background Location Service
- **Implementation**: [src/BackgroundLocationService.tsx](src/BackgroundLocationService.tsx)
- **Purpose**: Tracks driver location in the background when driver is online
- **Android Service**: Native Android foreground service defined in [android/app/src/main/AndroidManifest.xml:54-58](android/app/src/main/AndroidManifest.xml#L54-L58)
- **Frequency**: Updates every 15 seconds
- **Key Functions**:
  - `startBackgroundService()` - Starts background location tracking
  - `stopBackgroundService()` - Stops tracking when driver goes offline

### Permissions (Android)
Critical permissions configured in AndroidManifest.xml:
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` - Required for background tracking
- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS` - For ride request notifications
- `SYSTEM_ALERT_WINDOW` / `USE_FULL_SCREEN_INTENT` - For heads-up notifications

### Maps Integration
- **Library**: react-native-maps with Google Maps
- **Google Maps API Key**: Configured in [AndroidManifest.xml:80](android/app/src/main/AndroidManifest.xml#L80)
- **Route Visualization**: Polylines for pickup and dropoff routes
- **Location Updates**: Uses `@react-native-community/geolocation`

### Notification System
- **Firebase Cloud Messaging (FCM)**: For push notifications
- **Notifee**: For local Android notifications with high priority
- **Implementation**: [src/Notifications.tsx](src/Notifications.tsx) (mostly commented out)
- **Channels**: High-priority channel for ride requests with sound and vibration

## Key State Management Patterns

### Driver Status States
Three states managed in Screen1.tsx:
- `offline` - Driver not receiving requests
- `online` - Driver available, location tracking active
- `onRide` - Driver currently on an active ride

### Ride Status Flow
1. `idle` - No active ride
2. `accepted` - Ride accepted, navigating to pickup
3. `onTheWay` - Heading to pickup location
4. `started` - Customer picked up, heading to dropoff
5. `completed` - Ride finished

### AsyncStorage Keys
- `authToken` - JWT token from backend
- `driverInfo` - JSON stringified driver object (driverId, name, phone)
- `driverId` - Driver's unique ID
- `driverName` - Driver's name
- `phoneNumber` - Driver's phone number
- `verificationId` - Firebase verification ID (during login)

## Important Configuration Files

- **Metro**: [metro.config.js](metro.config.js) - SVG transformer enabled
- **Babel**: [babel.config.js](babel.config.js) - React Native Reanimated plugin configured
- **TypeScript**: Extends `@react-native/typescript-config`
- **Android Package**: `com.webase.eazygodriver`

## Switching Between Local and Production Server

Edit [src/apiConfig.ts](src/apiConfig.ts):
- **Production** (currently active): `API_BASE = 'https://taxi.webase.co.in/api'`
- **Local Development** (commented): Uncomment localhost configuration with Platform-specific IP handling

## Critical Development Notes

1. **Socket Connection**: Must call `connectSocket()` before emitting events
2. **Background Service**: Android only - requires foreground service notification
3. **Google Maps**: Requires valid API key in AndroidManifest.xml for maps to display
4. **Firebase Setup**: Requires `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
5. **iOS CocoaPods**: Must run `bundle exec pod install` after any native dependency changes
6. **React Native Reanimated**: Must be last plugin in babel.config.js

## Common Debugging Steps

1. **Location Not Updating**: Check permissions in device settings and verify background location permission granted
2. **Socket Disconnection**: Check network connectivity and verify SOCKET_URL in apiConfig.ts
3. **Firebase Auth Issues**: Verify Firebase project configuration and google-services.json is up to date
4. **Maps Not Showing**: Verify Google Maps API key is valid and Maps SDK enabled in Google Cloud Console
