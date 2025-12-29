// src/SettingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  const SettingItem = ({ icon, title, subtitle, onPress, showSwitch, switchValue, onSwitchChange }: any) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingIcon}>
        <MaterialIcons name={icon} size={24} color="#2ecc71" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#bdc3c7', true: '#2ecc71' }}
          thumbColor="#fff"
        />
      ) : (
        <MaterialIcons name="chevron-right" size={24} color="#bdc3c7" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#95a5a6', '#7f8c8d', '#626567']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <SettingItem
            icon="notifications"
            title="Push Notifications"
            subtitle="Receive ride requests and updates"
            showSwitch
            switchValue={notifications}
            onSwitchChange={setNotifications}
          />
          <SettingItem
            icon="location-on"
            title="Location Sharing"
            subtitle="Share location with passengers"
            showSwitch
            switchValue={locationSharing}
            onSwitchChange={setLocationSharing}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Preferences</Text>
          <SettingItem
            icon="add-circle"
            title="Auto Accept Rides"
            subtitle="Automatically accept incoming requests"
            showSwitch
            switchValue={autoAccept}
            onSwitchChange={setAutoAccept}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingItem
            icon="person"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => Alert.alert('Coming Soon', 'Profile editing feature coming soon')}
          />
          <SettingItem
            icon="lock"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => Alert.alert('Coming Soon', 'Password change feature coming soon')}
          />
          <SettingItem
            icon="payment"
            title="Payment Methods"
            subtitle="Manage your payment options"
            onPress={() => Alert.alert('Coming Soon', 'Payment methods feature coming soon')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <SettingItem
            icon="help"
            title="Help & Support"
            subtitle="Get help with the app"
            onPress={() => Alert.alert('Support', 'Contact support@eazygo.com')}
          />
          <SettingItem
            icon="description"
            title="Terms & Conditions"
            onPress={() => Alert.alert('Terms & Conditions', 'View our terms of service')}
          />
          <SettingItem
            icon="privacy-tip"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'View our privacy policy')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <SettingItem
            icon="info"
            title="About"
            subtitle="Version 1.0.0"
            onPress={() => Alert.alert('Eazy Go Driver', 'Version 1.0.0\n© 2025 Eazy Go Driver')}
          />
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 10,
    marginLeft: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f8f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
  },
});

export default SettingsScreen;
