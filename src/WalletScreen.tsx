// src/WalletScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletScreenProps {
  navigation: any;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  category: 'incentive' | 'wallet_added' | 'wallet_withdrawn' | 'ride_earning' | 'working_hours_deduction';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface WalletData {
  balance: number;
  currency: string;
  totalEarnings: number;
  pendingAmount: number;
  transactions: Transaction[];
}

const WalletScreen: React.FC<WalletScreenProps> = ({ navigation }) => {
  const [walletData, setWalletData] = useState<WalletData>({
    balance: 0,
    currency: 'INR',
    totalEarnings: 0,
    pendingAmount: 0,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const driverInfoStr = await AsyncStorage.getItem('driverInfo');

      if (!driverInfoStr) {
        Alert.alert('Error', 'Authentication required');
        navigation.goBack();
        return;
      }

      const driverInfo = JSON.parse(driverInfoStr);

      // Use wallet balance from login response stored in AsyncStorage
      // Since backend doesn't have /wallet endpoint yet, we show the balance from driverInfo
      setWalletData({
        balance: driverInfo.wallet || 0,
        currency: 'INR',
        totalEarnings: driverInfo.wallet || 0, // For now, same as balance
        pendingAmount: 0, // Will be available when backend adds endpoint
        transactions: [], // Will be populated when backend adds endpoint
      });
    } catch (error: any) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (category: string) => {
    switch (category) {
      case 'incentive':
        return 'card-giftcard';
      case 'wallet_added':
        return 'add-circle';
      case 'wallet_withdrawn':
        return 'remove-circle';
      case 'ride_earning':
        return 'local-taxi';
      case 'working_hours_deduction':
        return 'access-time';
      default:
        return 'payment';
    }
  };

  const getTransactionLabel = (category: string) => {
    switch (category) {
      case 'incentive':
        return 'Incentive Amount';
      case 'wallet_added':
        return 'Wallet Added';
      case 'wallet_withdrawn':
        return 'Wallet Withdrawn';
      case 'ride_earning':
        return 'Ride Earning';
      case 'working_hours_deduction':
        return 'Extended Hours Fee';
      default:
        return 'Transaction';
    }
  };

  const TransactionItem = ({ transaction }: { transaction: Transaction }) => (
    <View style={styles.transactionItem}>
      <View
        style={[
          styles.transactionIcon,
          {
            backgroundColor:
              transaction.type === 'credit' ? '#d5f4e6' : '#fadbd8',
          },
        ]}
      >
        <MaterialIcons
          name={getTransactionIcon(transaction.category)}
          size={20}
          color={transaction.type === 'credit' ? '#27ae60' : '#e74c3c'}
        />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>
          {getTransactionLabel(transaction.category)}
        </Text>
        <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text
          style={[
            styles.transactionAmount,
            {
              color: transaction.type === 'credit' ? '#27ae60' : '#e74c3c',
            },
          ]}
        >
          {transaction.type === 'credit' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </Text>
        <Text
          style={[
            styles.transactionStatus,
            {
              color:
                transaction.status === 'completed'
                  ? '#27ae60'
                  : transaction.status === 'pending'
                  ? '#f39c12'
                  : '#e74c3c',
            },
          ]}
        >
          {transaction.status}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
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
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2ecc71']} />
        }
      >
        {/* Balance Card */}
        <LinearGradient
          colors={['#2ecc71', '#27ae60']}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <MaterialIcons name="account-balance-wallet" size={30} color="#fff" />
            <Text style={styles.balanceLabel}>Current Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(walletData.balance)}
          </Text>
          <TouchableOpacity style={styles.withdrawButton}>
            <MaterialIcons name="upload" size={20} color="#2ecc71" />
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Card - Total Earnings Only */}
        <View style={styles.statsContainer}>
          <View style={styles.statCardFull}>
            <MaterialIcons name="trending-up" size={32} color="#27ae60" />
            <Text style={styles.statValue}>
              {formatCurrency(walletData.totalEarnings)}
            </Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        {/* Add Wallet Amount Button */}
        <View style={styles.addWalletSection}>
          <TouchableOpacity style={styles.addWalletButton} onPress={() => {
            Alert.alert('Recharge Wallet', 'Payment integration coming soon!');
          }}>
            <LinearGradient
              colors={['#2ecc71', '#27ae60']}
              style={styles.addWalletGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="add-circle" size={24} color="#fff" />
              <Text style={styles.addWalletText}>Add Wallet Amount - Recharge Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          {walletData.transactions.length > 0 ? (
            walletData.transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={60} color="#bdc3c7" />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start earning by completing rides
              </Text>
            </View>
          )}
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
  balanceCard: {
    margin: 15,
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 15,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
    marginLeft: 8,
  },
  addWalletSection: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  addWalletButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addWalletGradient: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  addWalletText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  statsContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardFull: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  transactionsSection: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  transactionItem: {
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
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionStatus: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 5,
  },
});

export default WalletScreen;
