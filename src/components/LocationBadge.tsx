import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GeoLocation } from '../types/task';
import {
  buildMapsUrl,
  formatCoordinates,
  isLowAccuracy,
} from '../services/locationService';

export interface LocationBadgeProps {
  location: GeoLocation;
  compact?: boolean;
  immutableHint?: boolean;
}

export const LocationBadge: React.FC<LocationBadgeProps> = ({
  location,
  compact = false,
  immutableHint = false,
}) => {
  const lowAccuracy = isLowAccuracy(location);
  const accuracyLabel =
    location.accuracy !== null ? `±${Math.round(location.accuracy)} m` : null;

  const handleOpenMap = async () => {
    const nativeUrl = buildMapsUrl(location, Platform.OS);
    try {
      const supported = await Linking.canOpenURL(nativeUrl);
      if (supported) {
        await Linking.openURL(nativeUrl);
        return;
      }
    } catch {
      // Continuar al fallback web si falla canOpenURL
    }
    await Linking.openURL(buildMapsUrl(location, 'web'));
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.infoRow}>
        <Ionicons name="location-sharp" size={15} color="#2563EB" />
        <Text style={styles.coordsText}>{formatCoordinates(location)}</Text>
        {accuracyLabel && (
          <Text style={styles.accuracyText}>{accuracyLabel}</Text>
        )}
      </View>

      {(lowAccuracy || immutableHint) && (
        <View style={styles.badgesRow}>
          {lowAccuracy && (
            <View style={styles.lowAccuracyBadge}>
              <Ionicons name="warning-outline" size={12} color="#B45309" />
              <Text style={styles.lowAccuracyText}>Baja precisión</Text>
            </View>
          )}
          {immutableHint && (
            <Text style={styles.immutableText}>
              Registrada al crear (inmutable)
            </Text>
          )}
        </View>
      )}

      <Pressable
        onPress={() => void handleOpenMap()}
        style={({ pressed }) => [
          styles.mapButton,
          compact && styles.mapButtonCompact,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Abrir ubicación en mapa"
      >
        <Ionicons name="map-outline" size={14} color="#2563EB" />
        <Text style={styles.mapButtonText}>Abrir en mapa</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  containerCompact: {
    marginTop: 0,
    marginBottom: 8,
    padding: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  coordsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  accuracyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  lowAccuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  lowAccuracyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  immutableText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  mapButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  mapButtonCompact: {
    minHeight: 36,
    paddingVertical: 4,
  },
  mapButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  buttonPressed: {
    opacity: 0.72,
  },
});
