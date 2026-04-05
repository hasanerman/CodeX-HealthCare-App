import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';

export default function TopAppBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const fetchNotifications = async () => {
    Alert.alert('Sistem Mesajı', 'Yeni bir bildiriminiz bulunmamaktadır.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'android' ? 0 : 4), paddingBottom: 10 }]}>
      <View style={styles.leftSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => router.navigate('/profile')}>
          <MaterialIcons name="account-circle" size={40} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{user?.name?.split(' ')[0] || 'CodeX'}</Text>
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/screening')}>
          <MaterialIcons name="help-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/calendar')}>
          <MaterialIcons name="event" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={fetchNotifications}>
          <MaterialIcons name="notifications" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.06,
    shadowRadius: 40,
    elevation: 4, // for android
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primaryFixed,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 20,
    color: '#0c4a6e', // text-sky-900 approx
    letterSpacing: -0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
