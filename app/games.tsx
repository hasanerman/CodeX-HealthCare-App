import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Colors } from '../constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, BASE_URL } from '../context/AuthContext';

const CARD_SYMBOLS = [
  'favorite', 'star', 'pets', 'wb-sunny', 
  'beach-access', 'brightness-3', 'directions-car', 'flight'
];

const INITIAL_CARDS = [...CARD_SYMBOLS, ...CARD_SYMBOLS].sort(() => Math.random() - 0.5);

export default function GamesScreen() {
  const { user, token } = useAuth();
  const [cards, setCards] = useState(INITIAL_CARDS.map((symbol, index) => ({ id: index, symbol, isFlipped: false, isMatched: false })));
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      if (cards[first].symbol === cards[second].symbol) {
        setCards(prev => prev.map(card => 
          (card.id === first || card.id === second) ? { ...card, isMatched: true } : card
        ));
        setFlippedCards([]);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(card => 
            (card.id === first || card.id === second) ? { ...card, isFlipped: false } : card
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [flippedCards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(card => card.isMatched)) {
      handleGameEnd();
    }
  }, [cards]);

  const handleCardPress = (id: number) => {
    if (flippedCards.length === 2 || cards[id].isFlipped || cards[id].isMatched || gameEnded) return;

    if (!startTime) setStartTime(Date.now());
    
    setCards(prev => prev.map(card => card.id === id ? { ...card, isFlipped: true } : card));
    setFlippedCards(prev => [...prev, id]);
    if (flippedCards.length === 1) setMoves(prev => prev + 1);
  };

  const handleGameEnd = async () => {
    setGameEnded(true);
    const duration = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
    
    Alert.alert(
      'Tebrikler! 🎉',
      `Oyunu ${moves} hamlede ve ${duration} saniyede bitirdiniz. Skorunuz kaydediliyor...`,
      [{ text: 'Tamam' }]
    );

    // Backend’e kaydet
    if (!token) return;
    setLoading(true);
    try {
      await fetch(`${BASE_URL}/games/save-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameType: 'memory',
          difficulty: 'normal',
          moves: moves,
          timeSeconds: duration
        })
      });
    } catch (error) {
      console.error('Skor kaydı hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    const shuffled = [...CARD_SYMBOLS, ...CARD_SYMBOLS].sort(() => Math.random() - 0.5);
    setCards(shuffled.map((symbol, index) => ({ id: index, symbol, isFlipped: false, isMatched: false })));
    setFlippedCards([]);
    setMoves(0);
    setStartTime(null);
    setGameEnded(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[Colors.primary, Colors.primaryContainer]} style={styles.header}>
        <Text style={styles.headerTitle}>Hafıza Oyunu</Text>
        <Text style={styles.headerSubtitle}>Kartları eşleştirerek zihnini zinde tut.</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Hamle</Text>
            <Text style={styles.statValue}>{moves}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Hedef</Text>
            <Text style={styles.statValue}>8 Çift</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity 
            key={card.id} 
            style={[styles.card, (card.isFlipped || card.isMatched) ? styles.cardFlipped : styles.cardBack]}
            onPress={() => handleCardPress(card.id)}
            disabled={loading}
          >
            {(card.isFlipped || card.isMatched) ? (
              <MaterialIcons name={card.symbol as any} size={32} color="#fff" />
            ) : (
              <MaterialIcons name="live-help" size={32} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
        <Text style={styles.resetButtonText}>Oyunu Yenile</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loaderText}>Skor Kaydediliyor...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');
const gap = 12;
const cardSize = (width - 48 - (gap * 3)) / 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingBottom: 40 },
  header: { padding: 24, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTitle: { fontFamily: 'Manrope-ExtraBold', fontSize: 24, color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 16, flex: 1, alignItems: 'center' },
  statLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  statValue: { fontFamily: 'Manrope-Bold', fontSize: 20, color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: gap, padding: 24, marginTop: -20 },
  card: { width: cardSize, height: cardSize, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardBack: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  cardFlipped: { backgroundColor: Colors.primary },
  resetButton: { marginHorizontal: 24, backgroundColor: Colors.surfaceContainerHigh, padding: 16, borderRadius: 16, alignItems: 'center' },
  resetButtonText: { fontFamily: 'Manrope-Bold', color: Colors.primary, fontSize: 15 },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, fontFamily: 'Inter-Bold', color: Colors.primary }
});
