import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth, BASE_URL } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

type Condition = {
  id: number;
  slug: string;
  title: string;
  description: string;
};

type Question = {
  id: number;
  prompt: string;
  options: { id: number; label: string }[];
};

type ScreeningResult = {
  score: number;
  maxScore: number;
  ai: {
    interpretation: string;
    suspicion_level_label: string;
    natural_methods: string[];
    doctor_importance: string;
    emergency_note?: string;
    disclaimer: string;
  };
  nearestHospital?: {
    name: string;
    distanceKm: number;
  };
};

export default function ScreeningScreen() {
  const { token } = useAuth();
  const [step, setStep] = useState<'list' | 'questions' | 'result'>('list');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [currentCondition, setCurrentCondition] = useState<Condition | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);

  useEffect(() => {
    fetchConditions();
  }, []);

  const fetchConditions = async () => {
    try {
      const response = await fetch(`${BASE_URL}/screening/conditions`);
      const data = await response.json();
      setConditions(data);
    } catch (error) {
      console.error('Fetch Conditions Error:', error);
    }
  };

  const startScreening = async (condition: Condition) => {
    setLoading(true);
    setCurrentCondition(condition);
    try {
      const response = await fetch(`${BASE_URL}/screening/conditions/${condition.slug}/questions`);
      const data = await response.json();
      setQuestions(data.questions);
      setStep('questions');
      setAnswers({});
    } catch (error) {
      Alert.alert('Hata', 'Sorular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const submitScreening = async () => {
    if (Object.keys(answers).length < questions.length) {
      Alert.alert('Eksik Cevap', 'Lütfen tüm soruları yanıtlayın.');
      return;
    }

    setLoading(true);
    try {
      let location = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          location = await Location.getCurrentPositionAsync({});
        }
      } catch (e) {}

      const formattedAnswers = Object.entries(answers).map(([qId, oId]) => ({
        questionId: parseInt(qId),
        optionId: oId
      }));

      const response = await fetch(`${BASE_URL}/screening/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: currentCondition?.slug,
          answers: formattedAnswers,
          lat: location?.coords.latitude,
          lon: location?.coords.longitude
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setStep('result');
      } else {
        throw new Error('Analiz hatası');
      }
    } catch (error) {
      Alert.alert('Hata', 'Analiz yapılamadı, lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analiz Yapılıyor...</Text>
      </View>
    );
  }

  // RENDER: LIST
  if (step === 'list') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Check-up</Text>
          <Text style={styles.subtitle}>Bir belirti gurubu seçin, yapay zeka durumunuzu analiz etsin.</Text>
        </View>

        <View style={styles.listContainer}>
          {conditions.map(c => (
            <TouchableOpacity key={c.id} style={styles.card} onPress={() => startScreening(c)}>
              <View style={styles.cardIcon}>
                <MaterialIcons name="health-and-safety" size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={1}>{c.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // RENDER: QUESTIONS
  if (step === 'questions') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('list')} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{currentCondition?.title}</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${(Object.keys(answers).length / questions.length) * 100}%` }]} />
          </View>
        </View>

        {questions.map((q, idx) => (
          <View key={q.id} style={styles.questionBlock}>
            <Text style={styles.questionPrompt}>{idx + 1}. {q.prompt}</Text>
            <View style={styles.optionsGrid}>
              {q.options.map(opt => (
                <TouchableOpacity 
                  key={opt.id} 
                  style={[styles.optionBtn, answers[q.id] === opt.id && styles.optionBtnActive]}
                  onPress={() => setAnswers({ ...answers, [q.id]: opt.id })}
                >
                  <Text style={[styles.optionLabel, answers[q.id] === opt.id && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.primaryBtn} onPress={submitScreening}>
          <Text style={styles.primaryBtnText}>Analizi Başlat</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // RENDER: RESULT
  if (step === 'result' && result) {
    const isEmergency = result.ai.suspicion_level_label.toLowerCase().includes('yüksek') || !!result.ai.emergency_note;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultScroll}>
        <View style={[styles.resultHero, { backgroundColor: isEmergency ? '#fee2e2' : '#f0f9ff' }]}>
          <MaterialIcons 
            name={isEmergency ? 'warning' : 'check-circle'} 
            size={64} 
            color={isEmergency ? '#ef4444' : Colors.primary} 
          />
          <Text style={[styles.resultStatus, { color: isEmergency ? '#b91c1c' : Colors.primary }]}>
            {result.ai.suspicion_level_label}
          </Text>
          <Text style={styles.resultIntro}>Analiz Sonucunuz</Text>
        </View>

        <View style={styles.resultContent}>
          {result.ai.emergency_note && (
            <View style={styles.emergencyBox}>
              <MaterialIcons name="emergency" size={24} color="#fff" />
              <Text style={styles.emergencyText}>{result.ai.emergency_note}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👨‍⚕️ Uzman Gözüyle</Text>
            <Text style={styles.sectionText}>{result.ai.interpretation}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🩺 Doktor Tavsiyesi</Text>
            <Text style={styles.sectionText}>{result.ai.doctor_importance}</Text>
          </View>

          {result.ai.natural_methods.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌿 Doğal Destekler</Text>
              {result.ai.natural_methods.map((m, i) => (
                <Text key={i} style={styles.bulletItem}>• {m}</Text>
              ))}
            </View>
          )}

          {result.nearestHospital && (
            <View style={styles.hospitalCard}>
              <MaterialIcons name="local-hospital" size={24} color="#fff" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.hospitalTitle}>Size En Yakın Hastane</Text>
                <Text style={styles.hospitalName}>{result.nearestHospital.name}</Text>
                <Text style={styles.hospitalDist}>{result.nearestHospital.distanceKm} km mesafede</Text>
              </View>
            </View>
          )}

          <Text style={styles.disclaimer}>{result.ai.disclaimer}</Text>

          <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep('list')}>
            <Text style={styles.outlineBtnText}>Yeni Tarama Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingBottom: 100 },
  resultScroll: { paddingBottom: 100 },
  header: { marginBottom: 32 },
  backBtn: { marginBottom: 16 },
  title: { fontFamily: 'Manrope-ExtraBold', fontSize: 28, color: '#0f172a' },
  subtitle: { fontFamily: 'Inter-Medium', fontSize: 15, color: '#64748b', marginTop: 8 },
  listContainer: { gap: 16 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardTitle: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#1e293b' },
  cardDesc: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#94a3b8', marginTop: 2 },
  
  progressContainer: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: Colors.primary },
  questionBlock: { marginBottom: 32 },
  questionPrompt: { fontFamily: 'Manrope-Bold', fontSize: 17, color: '#1e293b', marginBottom: 16 },
  optionsGrid: { gap: 10 },
  optionBtn: { padding: 16, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  optionBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  optionLabel: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#475569' },
  optionLabelActive: { color: '#fff' },
  
  primaryBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 20, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' },
  
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontFamily: 'Inter-Bold', color: Colors.primary },
  
  resultHero: { padding: 40, alignItems: 'center', backgroundColor: '#f0f9ff' },
  resultStatus: { fontFamily: 'Manrope-ExtraBold', fontSize: 24, marginTop: 16, textAlign: 'center' },
  resultIntro: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  resultContent: { padding: 24, gap: 24 },
  emergencyBox: { backgroundColor: '#ef4444', padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  emergencyText: { flex: 1, color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 15 },
  section: { 
    marginBottom: 24, 
    backgroundColor: '#f8fafc', 
    padding: 20, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sectionTitle: { fontFamily: 'Manrope-ExtraBold', fontSize: 18, color: '#0f172a', marginBottom: 8 },
  sectionText: { fontFamily: 'Inter-Medium', fontSize: 15, color: '#475569', lineHeight: 22 },
  bulletItem: { fontFamily: 'Inter-Medium', fontSize: 15, color: '#475569', marginLeft: 12 },
  hospitalCard: { backgroundColor: Colors.primary, padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center' },
  hospitalTitle: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter-Bold', fontSize: 11, textTransform: 'uppercase' },
  hospitalName: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 16, marginTop: 2 },
  hospitalDist: { color: '#fff', fontFamily: 'Inter-Medium', fontSize: 13, marginTop: 2 },
  disclaimer: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' },
  outlineBtn: { borderWidth: 1, borderColor: '#e2e8f0', padding: 18, borderRadius: 20, alignItems: 'center' },
  outlineBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#475569' }
});
