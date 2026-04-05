import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '../constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, BASE_URL } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    height: user?.height?.toString() || '',
    weight: user?.weight?.toString() || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || 'erkek'
  });

  const handleEditToggle = async () => {
    if (isEditing) {
      // Save to API
      setLoading(true);
      try {
        const response = await fetch(`${BASE_URL}/user/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            height: editData.height,
            weight: editData.weight,
            age: editData.age,
            gender: editData.gender
          })
        });

        const data = await response.json();
        if (response.ok) {
          Alert.alert('Başarılı', 'Profiliniz ve YZ analiziniz güncellendi.');
          // In a real app, I would update the user object in AuthContext here
          // For now, assume it's saved on server.
          setIsEditing(false);
        } else {
          Alert.alert('Hata', data.error || 'Profil güncellenemedi.');
        }
      } catch (error) {
        Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı.');
      } finally {
        setLoading(false);
      }
    } else {
      // Reset edit data to current user before editing
      setEditData({
        height: user?.height?.toString() || '',
        weight: user?.weight?.toString() || '',
        age: user?.age?.toString() || '',
        gender: user?.gender || 'erkek'
      });
      setIsEditing(true);
    }
  };

  const heightM = parseFloat(user?.height || '0') / 100;
  const weightKg = parseFloat(user?.weight || '0');
  
  let bmi = 0;
  let bmiText = "Bilinmiyor";
  let bmiPercentage = 0;
  let barColor = Colors.tertiary;

  if (heightM > 0 && weightKg > 0) {
    bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
    if (bmi < 18.5) {
      bmiText = "Zayıf";
      barColor = "#f59e0b";
    } else if (bmi >= 18.5 && bmi <= 24.9) {
      bmiText = "Normal";
      barColor = Colors.tertiary;
    } else if (bmi >= 25 && bmi <= 29.9) {
      bmiText = "Fazla Kilolu";
      barColor = "#f59e0b";
    } else {
      bmiText = "Obez";
      barColor = Colors.error;
    }
    bmiPercentage = Math.min(100, Math.max(0, ((bmi - 12) / 28) * 100));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Hero Profile Section */}
      <View style={styles.heroSection}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarOuter}>
            <MaterialIcons name="account-circle" size={120} color={Colors.primary} />
          </View>
        </View>
        
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.editButtonContainer} onPress={handleEditToggle} disabled={loading}>
            <LinearGradient
              colors={isEditing ? [Colors.tertiary, Colors.tertiaryFixed] : [Colors.primary, Colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.editButton}
            >
              {loading ? (
                <ActivityIndicator color={isEditing ? Colors.onTertiaryContainer : "#fff"} />
              ) : (
                <>
                  <MaterialIcons name={isEditing ? "check" : "edit"} size={20} color={isEditing ? Colors.onTertiaryContainer : "#fff"} />
                  <Text style={[styles.editButtonText, isEditing && { color: Colors.onTertiaryContainer }]}>
                    {isEditing ? "Kaydet" : "Profili Düzenle"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {!isEditing && (
            <TouchableOpacity style={[styles.editButtonContainer, { shadowColor: Colors.error }]} onPress={logout}>
              <View style={[styles.editButton, { backgroundColor: Colors.error }]}>
                <MaterialIcons name="logout" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Çıkış</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {/* Metric Card: Bio Data */}
        <View style={styles.metricCardFull}>
          <View style={styles.metricLeft}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 101, 145, 0.1)' }]}>
              <MaterialIcons name="person" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricLabel}>YAŞ VE CİNSİYET</Text>
              {isEditing ? (
                <View style={styles.inputRow}>
                  <TextInput 
                    style={styles.inputStyle} 
                    keyboardType="numeric"
                    value={editData.age}
                    onChangeText={(val) => setEditData({...editData, age: val})}
                  />
                  <Text style={styles.metricUnit}>yıl •</Text>
                  <TouchableOpacity onPress={() => setEditData({...editData, gender: editData.gender === 'erkek' ? 'kadın' : 'erkek'})}>
                    <Text style={styles.metricValue}>{editData.gender === 'erkek' ? 'Erkek' : 'Kadın'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.metricValue}>{user?.age || '--'} yy • {user?.gender === 'kadın' ? 'Kadın' : 'Erkek'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Metric Card: Height & Weight */}
        <View style={styles.metricRow}>
          <View style={styles.metricCardHalf}>
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe', marginBottom: 16 }]}>
              <MaterialIcons name="straighten" size={24} color="#0284c7" />
            </View>
            <Text style={styles.metricLabel}>BOY</Text>
            {isEditing ? (
              <View style={styles.inputRow}>
                <TextInput 
                  style={styles.inputStyle} 
                  keyboardType="numeric"
                  value={editData.height}
                  onChangeText={(val) => setEditData({...editData, height: val})}
                />
                <Text style={styles.metricUnit}>cm</Text>
              </View>
            ) : (
              <Text style={styles.metricValueLarge}>{user?.height || '--'} <Text style={styles.metricUnit}>cm</Text></Text>
            )}
          </View>
          <View style={styles.metricCardHalf}>
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe', marginBottom: 16 }]}>
              <MaterialIcons name="monitor-weight" size={24} color="#0284c7" />
            </View>
            <Text style={styles.metricLabel}>KİLO</Text>
            {isEditing ? (
              <View style={styles.inputRow}>
                <TextInput 
                  style={styles.inputStyle} 
                  keyboardType="numeric"
                  value={editData.weight}
                  onChangeText={(val) => setEditData({...editData, weight: val})}
                />
                <Text style={styles.metricUnit}>kg</Text>
              </View>
            ) : (
              <Text style={styles.metricValueLarge}>{user?.weight || '--'} <Text style={styles.metricUnit}>kg</Text></Text>
            )}
          </View>
        </View>

        {/* Status Indicator Card */}
        <View style={[styles.metricCardFull, { backgroundColor: 'rgba(0, 108, 73, 0.05)', flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusDot, { backgroundColor: barColor }]} />
            <Text style={[styles.statusTitle, { color: barColor }]}>VKİ DURUM GÖSTERGESİ</Text>
          </View>
          <View style={styles.statusBody}>
            <View style={styles.statusRow}>
              <Text style={styles.statusRowLabel}>VKİ Endeksi</Text>
              <Text style={[styles.statusRowValue, { color: barColor }]}>{bmi > 0 ? `${bmi} (${bmiText})` : '--'}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${bmiPercentage}%`, backgroundColor: barColor }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Mandatory Disclaimer */}
      <View style={styles.footerSection}>
        <Text style={styles.disclaimerText}>
          YASAL UYARI: CodeX HealthCare genel sağlık bilgilerini yalnızca eğitim amaçlı sağlar. Profesyonel tıbbi tavsiye, tanı veya tedavinin yerini tutmaz. Tıbbi durumunuzla ilgili tüm sorularınız için her zaman doktorunuzun veya yetkili sağlık uzmanının görüşünü alın.
        </Text>
      </View>
      
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 180, // space for tab bar and logout
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  avatarOuter: {
    width: 128,
    height: 128,
    borderRadius: 24, // xl
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: Colors.tertiaryContainer,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userName: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 24,
    color: Colors.onBackground,
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 24,
  },
  editButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  editButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#fff',
  },
  metricsGrid: {
    gap: 16,
    marginBottom: 48,
  },
  metricCardFull: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.onSurface,
  },
  activeBadge: {
    backgroundColor: 'rgba(0, 177, 123, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.tertiary,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCardHalf: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  metricValueLarge: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 22,
    color: Colors.onSurface,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  inputStyle: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 22,
    color: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    padding: 0,
    fontStyle: 'italic',
    minWidth: 40,
  },
  inputTextGroup: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    padding: 0,
    minWidth: 80,
  },
  bloodTypeEditContainer: {
    width: '100%',
  },
  editSubLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  btnGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  btBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    alignItems: 'center',
  },
  btBtnActive: {
    backgroundColor: Colors.tertiary,
    borderColor: Colors.tertiary,
  },
  btBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: Colors.onSurface,
  },
  btBtnTextActive: {
    color: '#fff',
  },
  metricUnit: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontStyle: 'normal',
  },
  bloodTypeBg: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 30,
    color: 'rgba(25, 28, 30, 0.2)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.tertiary,
  },
  statusTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: Colors.tertiary,
    letterSpacing: -0.5,
  },
  statusBody: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRowLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  statusRowValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: Colors.tertiary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.tertiary,
    borderRadius: 3,
  },
  footerSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  disclaimerText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: 'rgba(62, 72, 80, 0.6)',
    lineHeight: 18,
    textAlign: 'center',
  }
});
