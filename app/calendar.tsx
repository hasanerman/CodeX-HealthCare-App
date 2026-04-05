import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useAuth, BASE_URL } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

// Türkçe takvim yapılandırması
LocaleConfig.locales['tr'] = {
  monthNames: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  monthNamesShort: ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],
  dayNames: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
  dayNamesShort: ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

type CalendarEvent = {
  id: number;
  title: string;
  notes: string;
  kind: 'medication' | 'event' | 'reminder';
  event_date: string;
  event_time?: string;
};

export default function CalendarScreen() {
  const { token } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Yeni etkinlik form state
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newKind, setNewKind] = useState<'medication' | 'event' | 'reminder'>('medication');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (token) {
      fetchMonthEvents(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth() + 1);
    }
  }, [token]);

  const fetchMonthEvents = async (year: number, month: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/calendar/events?year=${year}&month=${month}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Calendar Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newTitle) {
      Alert.alert('Dikkat', 'Lütfen bir başlık girin.');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          notes: newNotes,
          kind: newKind,
          event_date: selectedDate,
          event_time: newTime || null
        })
      });

      if (response.ok) {
        setModalVisible(false);
        setNewTitle('');
        setNewNotes('');
        setNewTime('');
        fetchMonthEvents(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth() + 1);
      }
    } catch (error) {
      Alert.alert('Hata', 'Kayıt eklenemedi.');
    }
  };

  const handleDeleteEvent = async (id: number) => {
    Alert.alert('Sil', 'Bu kaydı silmek istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      { 
        text: 'Sil', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const response = await fetch(`${BASE_URL}/calendar/events/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              fetchMonthEvents(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth() + 1);
            }
          } catch (error) {
            Alert.alert('Hata', 'Silinemedi.');
          }
        }
      }
    ]);
  };

  // Takvimde işaretlenecek günler
  const markedDates: any = {};
  events.forEach(ev => {
    markedDates[ev.event_date] = { 
      marked: true, 
      dotColor: ev.kind === 'medication' ? Colors.tertiary : Colors.primary 
    };
  });
  markedDates[selectedDate] = { 
    ...markedDates[selectedDate], 
    selected: true, 
    selectedColor: Colors.primary 
  };

  const filteredEvents = events.filter(ev => ev.event_date === selectedDate);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, '#f8fafc']} style={styles.content}>
        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={day => setSelectedDate(day.dateString)}
            onMonthChange={month => fetchMonthEvents(month.year, month.month)}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#64748b',
              selectedDayBackgroundColor: Colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: Colors.primary,
              dayTextColor: '#1e293b',
              textDisabledColor: '#cbd5e1',
              dotColor: Colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: Colors.primary,
              monthTextColor: '#0f172a',
              textMonthFontFamily: 'Manrope-ExtraBold',
              textDayHeaderFontFamily: 'Inter-Bold',
              textDayFontSize: 14,
            }}
          />
        </View>

        <View style={styles.eventsHeader}>
          <Text style={styles.selectedDateText}>
            {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
          </Text>
          <Text style={styles.eventCount}>{filteredEvents.length} Kayıt</Text>
        </View>

        <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
          {filteredEvents.map(event => (
            <View key={event.id} style={styles.eventCard}>
              <View style={[styles.kindIndicator, { backgroundColor: event.kind === 'medication' ? '#dcfce7' : '#e0f2fe' }]}>
                <MaterialIcons 
                  name={event.kind === 'medication' ? 'medication' : 'event'} 
                  size={20} 
                  color={event.kind === 'medication' ? Colors.tertiary : Colors.primary} 
                />
              </View>
              <View style={styles.eventInfo}>
                <View style={styles.eventTitleRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.event_time && (
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>{event.event_time.substring(0, 5)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.eventNotes} numberOfLines={1}>{event.notes || 'Not yok'}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteEvent(event.id)} style={styles.deleteBtn}>
                <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          {filteredEvents.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Bugün için planlanan bir kayıt yok.</Text>
            </View>
          )}
          {loading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />}
        </ScrollView>
      </LinearGradient>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <MaterialIcons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Event Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Hatırlatıcı Ekle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.modalLabel}>TÜR</Text>
              <View style={styles.kindSelector}>
                {(['medication', 'event', 'reminder'] as const).map(k => (
                  <TouchableOpacity 
                    key={k} 
                    style={[styles.kindBtn, newKind === k && styles.kindBtnActive]}
                    onPress={() => setNewKind(k)}
                  >
                    <Text style={[styles.kindBtnText, newKind === k && styles.kindBtnTextActive]}>
                      {k === 'medication' ? 'İlaç' : k === 'event' ? 'Randevu' : 'Hatırlatıcı'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>BAŞLIK</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="Örn: Aspirin veya Kontrol" 
                value={newTitle} 
                onChangeText={setNewTitle}
              />

              <Text style={styles.modalLabel}>SAAT (İSTEĞE BAĞLI)</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="Örn: 09:30" 
                value={newTime} 
                onChangeText={setNewTime}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.modalLabel}>NOTLAR</Text>
              <TextInput 
                style={[styles.modalInput, { height: 80 }]} 
                placeholder="Örn: Yemekten sonra tok karnına" 
                value={newNotes} 
                onChangeText={setNewNotes}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddEvent}>
                <Text style={styles.saveBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  calendarCard: { 
    backgroundColor: '#fff', 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
    paddingBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  eventsHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24, 
    paddingBottom: 12 
  },
  selectedDateText: { fontFamily: 'Manrope-ExtraBold', fontSize: 18, color: '#0f172a' },
  eventCount: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.primary },
  eventsList: { flex: 1, paddingHorizontal: 20 },
  eventCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  kindIndicator: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  eventInfo: { flex: 1, marginLeft: 16 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventTitle: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#1e293b' },
  timeBadge: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timeText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#64748b' },
  eventNotes: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b', marginTop: 2 },
  deleteBtn: { padding: 8 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#94a3b8', marginTop: 12 },
  fab: { 
    position: 'absolute', 
    bottom: 120, 
    right: 24, 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: Colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24,
    minHeight: height * 0.7
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Manrope-ExtraBold', fontSize: 20, color: '#0f172a' },
  modalForm: { gap: 16 },
  modalLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: '#94a3b8', letterSpacing: 1 },
  modalInput: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    padding: 16, 
    fontFamily: 'Inter-Medium', 
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  kindSelector: { flexDirection: 'row', gap: 10 },
  kindBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  kindBtnActive: { backgroundColor: '#0f172a' },
  kindBtnText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#64748b' },
  kindBtnTextActive: { color: '#fff' },
  saveBtn: { 
    backgroundColor: Colors.primary, 
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginTop: 10 
  },
  saveBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' }
});
