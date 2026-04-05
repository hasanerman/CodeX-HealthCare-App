import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth, BASE_URL } from '../context/AuthContext';

export default function LabReportsScreen() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setLoading(true);
        setAnalysisResult(null);

        const formData = new FormData();
        // @ts-ignore
        formData.append('report', {
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name,
        });

        if (user?.id) {
          formData.append('userId', String(user.id));
        }

        const response = await fetch(`${BASE_URL}/analyze-report`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (response.ok) {
          setAnalysisResult(data);
        } else {
          Alert.alert('Hata', data.error || 'Rapor analiz edilemedi.');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Hero Title */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Mobil Laboratuvar Analizörü</Text>
        <Text style={styles.heroSubtitle}>Klinik metrikleri çözmek için Yapay Zekanın gücünden yararlanılıyor.</Text>
      </View>

      {/* Drag & Drop Zone */}
      <View style={styles.uploadSection}>
        <View style={styles.uploadBox}>
          {loading ? (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[styles.uploadTitle, { marginTop: 16 }]}>Rapor Analiz Ediliyor...</Text>
              <Text style={styles.uploadSubtitle}>Lütfen bekleyin, bu işlem 1 dakika sürebilir.</Text>
            </View>
          ) : (
            <>
              <View style={styles.uploadIconContainer}>
                <MaterialIcons name="upload-file" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.uploadTitle}>Laboratuvar raporunu yükleyin</Text>
              <Text style={styles.uploadSubtitle}>PDF, JPG, PNG formatlarını destekler</Text>
              
              <TouchableOpacity style={styles.selectFileButtonWrap} onPress={handleFileSelect}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.selectFileButton}
                >
                  <Text style={styles.selectFileButtonText}>Dosya Seç</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Analysis Results Section */}
      {analysisResult && (
        <>
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Analiz Sonuçları</Text>
              <View style={styles.metricsBadge}>
                <Text style={styles.metricsBadgeText}>
                  {analysisResult.critical_values?.length || 0} Metrik Bulundu
                </Text>
              </View>
            </View>

            <View style={styles.resultsList}>
              {analysisResult.critical_values?.map((item: any, index: number) => (
                <View key={index} style={styles.resultCard}>
                  <View style={styles.resultCardLeft}>
                    <View style={[styles.resultIconBox, { backgroundColor: item.status?.toLowerCase().includes('yüksek') || item.status?.toLowerCase().includes('düşük') ? 'rgba(186, 26, 26, 0.1)' : 'rgba(0, 177, 123, 0.1)' }]}>
                      <MaterialIcons 
                        name={item.status?.toLowerCase().includes('yüksek') || item.status?.toLowerCase().includes('düşük') ? "warning" : "check-circle"} 
                        size={24} 
                        color={item.status?.toLowerCase().includes('yüksek') || item.status?.toLowerCase().includes('düşük') ? Colors.error : Colors.tertiary} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultLabel}>{item.name}</Text>
                      <Text style={styles.resultValue}>{item.value} <Text style={styles.resultUnit}>{item.unit}</Text></Text>
                      <Text style={{ fontFamily: 'Inter-Medium', fontSize: 10, color: Colors.outline }}>Ref: {item.reference_range}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.status?.toLowerCase().includes('yüksek') || item.status?.toLowerCase().includes('düşük') ? Colors.errorContainer : 'rgba(0, 177, 123, 0.2)' }]}>
                    <Text style={[styles.statusBadgeText, { color: item.status?.toLowerCase().includes('yüksek') || item.status?.toLowerCase().includes('düşük') ? Colors.onErrorContainer : Colors.onTertiaryContainer }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Clinical Interpretation */}
          <View style={styles.interpretationSection}>
            <MaterialIcons name="psychology" size={60} color={Colors.onSurface} style={styles.psychologyIcon} />
            <View style={styles.interpretationHeader}>
              <MaterialIcons name="auto-awesome" size={20} color={Colors.primary} />
              <Text style={styles.interpretationTitle}>Klinik Yorumlama</Text>
            </View>
            
            <Text style={styles.interpretationText}>
              {analysisResult.summary}
            </Text>

            {analysisResult.medication_suggestions && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.resultLabel, { marginBottom: 4 }]}>Öneriler:</Text>
                <Text style={styles.interpretationText}>{analysisResult.medication_suggestions}</Text>
              </View>
            )}

            <View style={styles.interpretationTags}>
              <View style={styles.interpretationTag}>
                <Text style={styles.interpretationTagText}>YZ ANALİZLİ</Text>
              </View>
              <View style={styles.interpretationTag}>
                <Text style={styles.interpretationTagText}>TIBBİ REHBER</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Legal Disclaimer */}
      <View style={styles.footerSection}>
        <Text style={styles.disclaimerText}>
          Yasal Uyarı: Yapay zeka ile oluşturulan bu analiz sadece bilgi amaçlıdır ve tıbbi tavsiye, teşhis veya tedavi teşkil etmez. Tıbbi durumunuzla ilgili tüm sorularınız için her zaman doktorunuzun veya diğer nitelikli sağlık uzmanlarının tavsiyesini alın.
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
    paddingBottom: 120, // space for tab bar
  },
  heroSection: {
    marginBottom: 32,
  },
  heroTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 30,
    color: Colors.onSurface,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    marginTop: 8,
  },
  uploadSection: {
    marginBottom: 40,
  },
  uploadBox: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.onSurface,
  },
  uploadSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 24,
    marginTop: 4,
  },
  selectFileButtonWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  selectFileButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  selectFileButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  resultsSection: {
    marginBottom: 40,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  resultsTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: Colors.onSurface,
  },
  metricsBadge: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  metricsBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: Colors.primary,
  },
  resultsList: {
    gap: 16,
  },
  resultCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 16,
    paddingRight: 8,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  resultCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  resultIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resultValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.onSurface,
  },
  resultUnit: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.outline,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
  },
  interpretationSection: {
    backgroundColor: Colors.surfaceContainer,
    padding: 20,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 48,
  },
  psychologyIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.1,
  },
  interpretationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  interpretationTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.onSurface,
  },
  interpretationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 16,
  },
  textError: {
    fontFamily: 'Inter-Bold',
    color: Colors.error,
  },
  interpretationTags: {
    flexDirection: 'row',
    gap: 8,
  },
  interpretationTag: {
    backgroundColor: 'rgba(0, 177, 123, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interpretationTagText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.onTertiaryContainer,
  },
  footerSection: {
    paddingBottom: 40,
  },
  disclaimerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  }
});
