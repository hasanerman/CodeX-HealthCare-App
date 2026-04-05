import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth, BASE_URL } from '../context/AuthContext';
import React, { useEffect, useState } from 'react';

export default function HomeScreen() {
  const { user, token, logout } = useAuth();
  const [lastReport, setLastReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      if (!token) return;

      const response = await fetch(`${BASE_URL}/user/last-report`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        logout();
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setLastReport(null);
        return;
      }
      
      const data = await response.json();
      
      if (response.ok && data && data.response) {
        try {
          const parsedReport = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
          setLastReport({ ...data, parsed: parsedReport });
        } catch (parseError) {
          setLastReport(null);
        }
      } else {
        setLastReport(null);
      }
    } catch (error) {
      console.error('Error fetching last report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Greeting */}
      <View style={styles.sectionSpacing}>
        <Text style={styles.greetingTitle}>Hoş geldiniz, {user?.name}</Text>
        <Text style={styles.greetingSubtitle}>Sağlık telemetrisi senkronizasyonu tamamlandı. Durum: Optimum.</Text>
      </View>

      {/* Profile Summary Grid */}
      <View style={styles.profileGrid}>
        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Boy</Text>
          <View style={styles.profileValueRow}>
            <Text style={styles.profileValue}>{user?.height || '--'}</Text>
            <Text style={styles.profileUnit}>cm</Text>
          </View>
        </View>
        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Kilo</Text>
          <View style={styles.profileValueRow}>
            <Text style={styles.profileValue}>{user?.weight || '--'}</Text>
            <Text style={styles.profileUnit}>kg</Text>
          </View>
        </View>
        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Yaş</Text>
          <View style={styles.profileValueRow}>
            <Text style={styles.profileValue}>{user?.age || '--'}</Text>
            <Text style={styles.profileUnit}>yıl</Text>
          </View>
        </View>
      </View>

      {/* Latest Lab Result Summary Card */}
      <View style={styles.labCard}>
        <MaterialIcons name="biotech" size={140} color={Colors.primary} style={styles.labCardBackgroundIcon} />

        <View style={styles.labCardHeader}>
          <View>
            <Text style={styles.labCardTitle}>En Son Laboratuvar Sonuç Özeti</Text>
            <Text style={styles.labCardDate}>
              {lastReport ? new Date(lastReport.created_at).toLocaleDateString('tr-TR') : 'Rapor bulunamadı'}
            </Text>
          </View>
        </View>

        {lastReport ? (
          <View style={styles.findingList}>
            {lastReport.parsed?.critical_values?.map((item: any, index: number) => (
              <View key={index} style={styles.findingRow}>
                <View style={[styles.findingRowLeft, { paddingRight: 8 }]}>
                  <View style={[styles.findingIconContainer, { backgroundColor: index % 3 === 0 ? Colors.primaryFixed : index % 3 === 1 ? Colors.secondaryFixed : Colors.tertiaryFixed }]}>
                    <MaterialIcons name={index % 3 === 0 ? "bloodtype" : index % 3 === 1 ? "monitor-heart" : "water-drop"} size={24} color={index % 3 === 0 ? Colors.primary : index % 3 === 1 ? Colors.secondary : Colors.tertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.findingName}>{item.name}</Text>
                    <Text style={styles.findingRef}>Ref: {item.reference_range}</Text>
                  </View>
                </View>
                <View style={styles.findingRowRight}>
                  <Text style={styles.findingValue}>{item.value}</Text>
                  <Text style={[styles.findingStatusText, { color: item.status?.toLowerCase().includes('yüksek') || item.status?.toLowerCase().includes('düşük') ? Colors.error : Colors.tertiary }]}>
                    {item.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Analiz edilmiş bir raporunuz bulunmamaktadır.</Text>
          </View>
        )}

        {/* AI Insight */}
        {lastReport && lastReport.parsed?.summary && (
          <View style={styles.aiInsightBox}>
            <View style={styles.aiInsightHeader}>
              <MaterialIcons name="auto-awesome" size={14} color={Colors.tertiary} />
              <Text style={styles.aiInsightTitle}>YZ KLİNİK İÇGÖRÜSÜ</Text>
            </View>
            <Text style={styles.aiInsightContent}>
              "{lastReport.parsed.summary}"
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
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
  sectionSpacing: {
    marginBottom: 24,
  },
  greetingTitle: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 30,
    color: Colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
  },
  profileGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  profileCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  profileLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  profileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  profileValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    color: Colors.onSurface,
  },
  profileUnit: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.onSurface,
    marginLeft: 2,
  },
  labCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.06,
    shadowRadius: 40,
    elevation: 4,
    overflow: 'hidden',
    marginBottom: 32,
  },
  labCardBackgroundIcon: {
    position: 'absolute',
    top: -20,
    right: -20,
    opacity: 0.05,
  },
  labCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  labCardTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: Colors.onSurface,
    marginBottom: 4,
  },
  labCardDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  findingList: {
    gap: 24,
    marginBottom: 32,
  },
  findingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  findingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  findingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingName: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  findingRef: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  findingRowRight: {
    alignItems: 'flex-end',
    minWidth: 75,
    paddingLeft: 4,
  },
  findingValue: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 16,
    color: Colors.onSurface,
  },
  findingStatusText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    color: Colors.tertiary,
    marginTop: 2,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  emptyStateText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  aiInsightBox: {
    backgroundColor: 'rgba(0, 177, 123, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 108, 73, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiInsightTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.tertiary,
    letterSpacing: 1.5,
  },
  aiInsightContent: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.onTertiaryContainer,
    lineHeight: 22,
  }
});