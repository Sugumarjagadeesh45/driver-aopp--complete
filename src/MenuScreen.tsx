// src/MenuScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuScreenProps {
  navigation: any;
  route: any;
}

interface DriverInfo {
  driverId: string;
  name: string;
  phone: string;
  email?: string;
  profilePicture?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  wallet?: number; // Wallet balance from login response
}

const MenuScreen: React.FC<MenuScreenProps> = ({ navigation, route }) => {
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const APP_VERSION = '1.0.0';

  useEffect(() => {
    loadDriverData();
  }, []);

  const loadDriverData = async () => {
    try {
      setLoading(true);

      // Load driver info from AsyncStorage
      const driverInfoStr = await AsyncStorage.getItem('driverInfo');

      if (driverInfoStr) {
        const info = JSON.parse(driverInfoStr);
        setDriverInfo(info);

        // Use wallet balance from login response stored in AsyncStorage
        if (info.wallet !== undefined) {
          setWalletBalance(info.wallet);
        }
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      Alert.alert('Error', 'Failed to load driver information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'authToken',
                'driverInfo',
                'driverId',
                'driverName',
                'phoneNumber'
              ]);
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const MenuItem = ({ icon, iconFamily = 'MaterialIcons', title, onPress, color = '#2ecc71' }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
        {iconFamily === 'MaterialIcons' ? (
          <MaterialIcons name={icon} size={24} color={color} />
        ) : (
          <FontAwesome5 name={icon} size={20} color={color} />
        )}
      </View>
      <Text style={styles.menuItemText}>{title}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#bdc3c7" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2ecc71', '#27ae60', '#229954']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {driverInfo?.profilePicture ? (
              <Image
                source={{ uri: driverInfo.profilePicture }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialIcons name="person" size={50} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{driverInfo?.name || 'Driver'}</Text>
          <Text style={styles.profilePhone}>{driverInfo?.phone || 'N/A'}</Text>
          {driverInfo?.vehicleType && (
            <View style={styles.vehicleBadge}>
              <MaterialIcons name="directions-car" size={16} color="#2ecc71" />
              <Text style={styles.vehicleText}>
                {driverInfo.vehicleType}
                {driverInfo.vehicleNumber && ` - ${driverInfo.vehicleNumber}`}
              </Text>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="person"
            title="Profile"
            onPress={() => navigation.navigate('Profile')}
            color="#2ecc71"
          />

          <MenuItem
            icon="account-balance-wallet"
            title={`Wallet - ₹${walletBalance.toFixed(2)}`}
            onPress={() => navigation.navigate('Wallet')}
            color="#f39c12"
          />

          <MenuItem
            icon="history"
            title="Ride History"
            onPress={() => navigation.navigate('RideHistory')}
            color="#3498db"
          />

          <MenuItem
            icon="settings"
            title="Settings"
            onPress={() => navigation.navigate('Settings')}
            color="#95a5a6"
          />

          <MenuItem
            icon="share"
            iconFamily="FontAwesome5"
            title="Refer & Earn"
            onPress={() => navigation.navigate('Refer')}
            color="#2ecc71"
          />

          <MenuItem
            icon="logout"
            title="Logout"
            onPress={handleLogout}
            color="#e74c3c"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>App Version {APP_VERSION}</Text>
          <Text style={styles.footerCopyright}>© 2025 Eazy Go Driver</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImageContainer: {
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#2ecc71',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#27ae60',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  profilePhone: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f8f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 5,
  },
  vehicleText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
    marginLeft: 5,
  },
  menuSection: {
    paddingHorizontal: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 5,
  },
  footerCopyright: {
    fontSize: 13,
    color: '#bdc3c7',
  },
});

export default MenuScreen;
