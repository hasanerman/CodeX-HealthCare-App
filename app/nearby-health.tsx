import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

type Place = {
  id: number;
  name: string;
  type: 'hospital' | 'pharmacy';
  distance: number;
  lat: number;
  lon: number;
};

export default function NearbyHealthScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearestHospital, setNearestHospital] = useState<Place | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Konum izni reddedildi.');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      await fetchNearbyPlaces(location.coords.latitude, location.coords.longitude);
    })();
  }, []);

  const fetchNearbyPlaces = async (lat: number, lon: number) => {
    try {
      const query = `
        [out:json][timeout:25];
        (
          nwr["amenity"~"hospital|clinic"](around:10000,${lat},${lon});
          nwr["amenity"="pharmacy"](around:10000,${lat},${lon});
        );
        out center;
      `;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });

      if (response.status === 429) {
        throw new Error('Çok fazla istek yapıldı, lütfen 1 dakika bekleyin.');
      }

      if (!response.ok) {
        throw new Error('API Sunucusu şu an yoğun, lütfen az sonra tekrar deneyin.');
      }

      const textData = await response.text();
      let data;
      try {
        data = JSON.parse(textData);
      } catch (e) {
        throw new Error('Sunucudan geçersiz veri (JSON Hatası) geldi.');
      }
      
      if (!data || !data.elements) {
        setPlaces([]);
        return;
      }

      const mappedPlaces: Place[] = data.elements.map((el: any) => {
        const placeLat = el.lat || (el.center ? el.center.lat : null);
        const placeLon = el.lon || (el.center ? el.center.lon : null);

        if (!placeLat || !placeLon) return null;

        const isHospital = el.tags.amenity === 'hospital' || el.tags.amenity === 'clinic';
        return {
          id: el.id,
          name: el.tags.name || (isHospital ? 'Hastane/Kuruluş' : 'Eczane'),
          type: isHospital ? 'hospital' : 'pharmacy',
          distance: calculateDistance(lat, lon, placeLat, placeLon),
          lat: placeLat,
          lon: placeLon,
        };
      }).filter((p: any) => p !== null).sort((a: any, b: any) => a.distance - b.distance);

      setPlaces(mappedPlaces);
      setNearestHospital(mappedPlaces.find(p => p.type === 'hospital') || null);
    } catch (error: any) {
      console.error('API Error:', error);
      Alert.alert('Sağlık Bilgisi', 'Yakındaki yerler şu an yüklenemedi, lütfen tekrar deneyin. (' + error.message + ')');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  const openInMaps = (lat: number, lon: number, name: string) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(name)}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${encodeURIComponent(name)})`
    }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
    });
  };

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; height: 100vh; overflow: hidden; background: #f0f4f8; }
        #map { height: 100%; width: 100%; }
        .marker-pin {
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          background: #3b82f6;
          position: absolute;
          transform: rotate(-45deg);
          left: 50%;
          top: 50%;
          margin: -20px 0 0 -20px;
          border: 3px solid #fff;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .marker-pin::after {
          content: '';
          width: 14px;
          height: 14px;
          margin: 6px 0 0 6px;
          background: #fff;
          position: absolute;
          border-radius: 50%;
        }
        .leaflet-popup-content-wrapper { border-radius: 12px; padding: 5px; }
        .leaflet-popup-content { font-family: sans-serif; font-weight: bold; font-size: 14px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const userLat = ${location?.coords.latitude || 0};
        const userLon = ${location?.coords.longitude || 0};
        
        var map = L.map('map', { zoomControl: false }).setView([userLat, userLon], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OSM'
        }).addTo(map);

        // Kullanıcı İşaretçisi
        const userIcon = L.divIcon({
          className: 'custom-icon',
          html: "<div class='marker-pin' style='background: #3b82f6;'></div>",
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });
        L.marker([userLat, userLon], { icon: userIcon }).addTo(map).bindPopup("<b>Siz</b>").openPopup();

        const places = ${JSON.stringify(places)};
        
        places.forEach(p => {
          const color = p.type === 'hospital' ? '#ef4444' : '#10b981';
          const icon = L.divIcon({
            className: 'custom-icon',
            html: "<div class='marker-pin' style='background: " + color + ";'></div>",
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });

          L.marker([p.lat, p.lon], { icon: icon })
            .addTo(map)
            .bindPopup("<b>" + p.name + "</b><br>" + (p.type === 'hospital' ? 'Hastane/Kuruluş' : 'Eczane'));
        });
      </script>
    </body>
    </html>
  `;

  if (loading && !location) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yakındaki Hastaneler Taranıyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.fullMap}>
        {location && (
          <WebView 
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            style={styles.webview}
            scalesPageToFit={false}
          />
        )}
      </View>

      {/* Floating Info Card */}
      {nearestHospital && (
        <View style={styles.floatingCard}>
          <View style={styles.cardHeader}>
            <View style={styles.hospitalBadge}>
              <MaterialIcons name="local-hospital" size={20} color="#fff" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.cardTitle}>En Yakın Hastane</Text>
              <Text style={styles.hospitalName} numberOfLines={1}>{nearestHospital.name}</Text>
            </View>
            <View style={styles.distanceTag}>
              <Text style={styles.distanceValue}>{nearestHospital.distance} km</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.routeButton} 
            onPress={() => openInMaps(nearestHospital.lat, nearestHospital.lon, nearestHospital.name)}
          >
            <MaterialIcons name="navigation" size={22} color="#fff" />
            <Text style={styles.routeButtonText}>Hemen Yol Tarifi Al</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Legend / Legend Toggle */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Hastane/Klinik</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Eczane</Text>
        </View>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  fullMap: { flex: 1 },
  webview: { flex: 1, width: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontFamily: 'Inter-Bold', color: Colors.primary },
  floatingCard: { 
    position: 'absolute', 
    bottom: 120, 
    left: 20, 
    right: 20, 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  hospitalBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, marginLeft: 16 },
  cardTitle: { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.2 },
  hospitalName: { fontFamily: 'Manrope-ExtraBold', fontSize: 17, color: Colors.onSurface, marginTop: 2 },
  distanceTag: { backgroundColor: Colors.surfaceContainerLow, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  distanceValue: { fontFamily: 'Manrope-Bold', fontSize: 13, color: Colors.primary },
  routeButton: { 
    backgroundColor: Colors.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderRadius: 16, 
    gap: 10 
  },
  routeButtonText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' },
  legend: { 
    position: 'absolute', 
    top: 20, 
    right: 20, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    padding: 12, 
    borderRadius: 16, 
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.onSurface }
});
