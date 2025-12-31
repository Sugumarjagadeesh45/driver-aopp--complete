import { Platform } from 'react-native';

// --- Select URLs based on environment ---
// Set to `true` for local development, `false` for production
const IS_DEVELOPMENT = true;  // ✅ LOCALHOST MODE - Using local development server

// ✅ LOCALHOST CONFIGURATION - PORT 5001
// For Android Emulator, 'localhost' of the host machine is 10.0.2.2
const LOCAL_API_URL_ANDROID = 'http://10.0.2.2:5001/api';
const LOCAL_SOCKET_URL_ANDROID = 'http://10.0.2.2:5001';

// For iOS Simulator, 'localhost' works directly
const LOCAL_API_URL_IOS = 'http://localhost:5001/api';
const LOCAL_SOCKET_URL_IOS = 'http://localhost:5001';

// Production server (currently disabled)
const PROD_API_URL = 'http://localhost:5001/api';
const PROD_SOCKET_URL = 'http://localhost:5001';

export const API_BASE = IS_DEVELOPMENT
  ? Platform.select({
      android: LOCAL_API_URL_ANDROID,
      ios: LOCAL_API_URL_IOS,
    })
  : PROD_API_URL;

export const SOCKET_URL = IS_DEVELOPMENT
  ? Platform.select({
      android: LOCAL_SOCKET_URL_ANDROID,
      ios: LOCAL_SOCKET_URL_IOS,
    })
  : PROD_SOCKET_URL;

console.log(`🚀 App configured for: ${IS_DEVELOPMENT ? 'LOCAL SERVER' : 'LIVE SERVER'}`);
console.log(`- API Base: ${API_BASE}`);
console.log(`- Socket URL: ${SOCKET_URL}`);