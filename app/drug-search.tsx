import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, BASE_URL } from '../context/AuthContext';

export default function DrugSearchScreen() {
  const { user, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [drugResult, setDrugResult] = useState<any>(null);

  const handleSearch = async (name?: string) => {
    const query = name || searchQuery;
    if (!query) return;
    setLoading(true);
    setDrugResult(null);
    try {
      const response = await fetch(`${BASE_URL}/drug/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drugName: query,
          userId: user?.id
        })
      });
      const data = await response.json();
      if (response.ok) {
        setDrugResult(data);
      } else {
        Alert.alert('Arama Hatası', data.error || `Sunucu hatası: ${response.status}`);
      }
    } catch (error: any) {
      Alert.alert('Bağlantı Hatası', `Sunucuya bağlanılamadı: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeImage = async (uri: string) => {
    setLoading(true);
    setDrugResult(null);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append('image', {
        uri: uri,
        type: 'image/jpeg',
        name: 'drug.jpg',
      });
      if (user?.id) {
        formData.append('userId', String(user.id));
      }

      const response = await fetch(`${BASE_URL}/drug/analyze-image`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setDrugResult(data);
      } else {
        Alert.alert('Hata', data.error || 'Görsel analiz edilemedi.');
      }
    } catch (error) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraPress = () => {
    Alert.alert(
      'İlaç Tara',
      'Lütfen bir seçenek belirleyin:',
      [
        {
          text: 'Kamera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Erişim Reddedildi', 'Kamerayı kullanabilmek için izne ihtiyacımız var.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              handleAnalyzeImage(result.assets[0].uri);
            }
          }
        },
        {
          text: 'Galeri',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Erişim Reddedildi', 'Galeriye erişebilmek için izne ihtiyacımız var.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              handleAnalyzeImage(result.assets[0].uri);
            }
          }
        },
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Page Title & Intro */}
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>İlaç Arama</Text>
        <Text style={styles.pageSubtitle}>Yüksek hassasiyetli farmakolojik verilere erişin</Text>
      </View>

      {/* Search Bar with Camera/Lens */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color={Colors.outline} style={styles.searchIconLeft} />
        <TextInput
          style={styles.searchInput}
          placeholder="İlaç adını arayın veya etiketi taratın..."
          placeholderTextColor={Colors.outline}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => handleSearch()}
        />
        <TouchableOpacity style={styles.cameraButton} onPress={handleCameraPress}>
          <MaterialIcons name="camera-enhance" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ marginBottom: 32 }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ textAlign: 'center', marginTop: 12, color: Colors.primary, fontFamily: 'Inter-Medium' }}>
            YZ Analiz Ediyor...
          </Text>
        </View>
      )}

      {/* Search Result */}
      {drugResult && (
        <View style={styles.resultContainer}>
          <View style={styles.glassCard}>
            {/* Header with Icon and Name */}
            <View style={styles.resultHeader}>
              <View style={[styles.interactionIconBox, { backgroundColor: Colors.primaryContainer, width: 56, height: 56, borderRadius: 16 }]}>
                <MaterialIcons name="medication" size={32} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.drugName}>{drugResult.name || drugResult.drugName}</Text>
                <View style={styles.activeIngredientBadge}>
                  <Text style={styles.activeIngredientBadgeText}>
                    {drugResult.activeIngredient || drugResult.active_ingredients || 'ETKİN MADDE ANALİZİ'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Indications Card */}
            {drugResult.indications && (
              <View style={styles.infoSection}>
                <View style={styles.infoIconBox}>
                  <MaterialIcons name="info-outline" size={20} color={Colors.primary} />
                  <Text style={styles.infoTitle}>Endikasyonlar (Kullanım Amacı)</Text>
                </View>
                <Text style={styles.infoText}>{drugResult.indications}</Text>
              </View>
            )}

            {/* Critical Safety Warning */}
            {(drugResult.sideEffects || drugResult.warnings) && (
              <View style={[styles.infoSection, { backgroundColor: 'rgba(251, 191, 36, 0.08)', borderColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 1 }]}>
                <View style={styles.infoIconBox}>
                  <MaterialIcons name="warning" size={20} color="#d97706" />
                  <Text style={[styles.infoTitle, { color: '#92400e' }]}>Güvenlik Uyarıları ve Yan Etkiler</Text>
                </View>
                <Text style={[styles.infoText, { color: '#92400e' }]}>
                  {drugResult.sideEffects || drugResult.warnings}
                </Text>
              </View>
            )}

            {/* Therapeutic Interactions */}
            {drugResult.interactions && (
              <View style={styles.infoSection}>
                <View style={[styles.infoIconBox, { justifyContent: 'space-between' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialIcons name="compare-arrows" size={20} color={Colors.error} />
                    <Text style={[styles.infoTitle, { color: Colors.error }]}>Terapötik Etkileşimler</Text>
                  </View>
                  <Text style={styles.liveAnalysisBadge}>CANLI ANALİZ</Text>
                </View>
                
                <View style={styles.interactionsList}>
                  {Array.isArray(drugResult.interactions) ? drugResult.interactions.map((item: any, idx: number) => (
                    <View key={idx} style={styles.interactionMiniRow}>
                      <MaterialIcons name="circle" size={6} color={Colors.error} style={{ marginTop: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.interactionDrug}>{item.drug || item}</Text>
                        <Text style={styles.interactionDesc}>{item.description || 'Dikkatli kullanım önerilir'}</Text>
                      </View>
                    </View>
                  )) : (
                    <Text style={styles.infoText}>{drugResult.interactions}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Full Pharmacology Profile Button */}
            <TouchableOpacity style={styles.profileButtonContainer} onPress={() => Alert.alert('Bilgi', 'Tam farmakoloji profili yakında eklenecektir.')}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.profileButton}
              >
                <Text style={styles.profileButtonText}>Tam Farmakoloji Dosyası</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Suggested Searches */}
      <View style={styles.suggestedSection}>
        <View style={styles.suggestedHeader}>
          <MaterialIcons name="history" size={18} color={Colors.onSurfaceVariant} />
          <Text style={styles.suggestedTitle}>SON ARAMALAR</Text>
        </View>
        <View style={styles.suggestedTags}>
          {['Metformin', 'Lisinopril', 'Atorvastatin', 'Aspirin'].map(tag => (
            <TouchableOpacity key={tag} style={styles.tag} onPress={() => {
              setSearchQuery(tag);
              handleSearch(tag);
            }}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 120, // space for tab bar
  },
  headerSection: {
    marginBottom: 24,
  },
  pageTitle: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 30,
    color: Colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  searchIconLeft: {
    position: 'absolute',
    left: 20,
    top: 16,
    zIndex: 1,
  },
  searchInput: {
    height: 56,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 16,
    paddingLeft: 48,
    paddingRight: 56,
    fontFamily: 'Inter-Medium',
    color: Colors.onSurface,
    fontSize: 16,
  },
  cameraButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  drugName: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 22,
    color: Colors.onSurface,
    lineHeight: 28,
  },
  drugRecordId: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    marginTop: 4,
  },
  activeIngredientBadge: {
    backgroundColor: 'rgba(0, 177, 123, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '50%',
  },
  activeIngredientBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: Colors.onTertiaryContainer,
    letterSpacing: 1,
  },
  warningBox: {
    backgroundColor: 'rgba(254, 252, 232, 0.8)', // amber-50
    borderWidth: 1,
    borderColor: '#fef3c7', // amber-100
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningHeaderText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 10,
    color: '#92400e', // amber-800
    letterSpacing: 1.5,
  },
  warningText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(120, 53, 15, 0.8)', // amber-900 / 80
    lineHeight: 22,
  },
  interactionsSection: {
    marginBottom: 32,
  },
  interactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  interactionsTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: Colors.onSurface,
  },
  liveAnalysisBadge: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 1,
  },
  interactionsList: {
    gap: 12,
  },
  interactionRow: {
    backgroundColor: Colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interactionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  interactionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interactionDrug: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: Colors.onSurface,
  },
  interactionDesc: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#fff',
    letterSpacing: -0.5,
  },
  profileButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  profileButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#fff',
  },
  suggestedSection: {
    marginBottom: 16,
  },
  suggestedTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1.5,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  suggestedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.onSecondaryContainer,
  },
  infoSection: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  infoIconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: Colors.onSurface,
  },
  infoText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  interactionMiniRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  }
});
