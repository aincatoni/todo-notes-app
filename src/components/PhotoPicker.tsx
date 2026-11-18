import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PermissionOutcome, PermissionResource } from '../ports/permissions';
import { Photo } from '../types/task';

const OUTCOME_LABEL: Record<PermissionOutcome, string> = {
  granted: 'Concedido',
  denied: 'Denegado',
  blocked: 'Bloqueado',
};

const RESOURCE_BUTTONS: {
  action: 'camera' | 'mediaLibrary' | 'location';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { action: 'camera', label: 'Tomar foto', icon: 'camera-outline' },
  { action: 'mediaLibrary', label: 'Elegir de galería', icon: 'images-outline' },
  { action: 'location', label: 'Verificar GPS', icon: 'location-outline' },
];

export interface PhotoNotice {
  text: string;
  blocked?: boolean;
  suggestGallery?: boolean;
}

export interface PhotoPickerProps {
  photo: Photo | null;
  busy: boolean;
  permissionOutcomes: Partial<Record<PermissionResource, PermissionOutcome>>;
  notice: PhotoNotice | null;
  onTakePhoto: () => void;
  onPickFromGallery: () => void;
  onCheckLocation: () => void;
  onRemovePhoto: () => void;
  onPreviewPhoto: (photo: Photo) => void;
  onOpenSettings: () => void;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  photo,
  busy,
  permissionOutcomes,
  notice,
  onTakePhoto,
  onPickFromGallery,
  onCheckLocation,
  onRemovePhoto,
  onPreviewPhoto,
  onOpenSettings,
}) => {
  const handleResourcePress = (action: 'camera' | 'mediaLibrary' | 'location') => {
    if (action === 'camera') {
      onTakePhoto();
      return;
    }
    if (action === 'mediaLibrary') {
      onPickFromGallery();
      return;
    }
    onCheckLocation();
  };

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          Recursos del dispositivo (Cámara, Galería y GPS)
        </Text>
        {busy && <ActivityIndicator size="small" color="#2563EB" />}
      </View>

      {photo && (
        <View style={styles.previewCard}>
          <Pressable
            onPress={() => onPreviewPhoto(photo)}
            style={({ pressed }) => [
              styles.thumbnailWrapper,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ampliar foto adjunta"
          >
            <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
            <View style={styles.zoomHint}>
              <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.photoMeta}>
            <Text style={styles.photoSourceText}>
              {photo.takenWith === 'camera'
                ? 'Tomada con cámara'
                : 'Elegida de galería'}
            </Text>
            <Text style={styles.photoDimensionsText}>
              {photo.width}×{photo.height} px
            </Text>
            <View style={styles.photoActionsRow}>
              <Pressable
                onPress={() => onPreviewPhoto(photo)}
                style={({ pressed }) => [
                  styles.smallSecondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ver foto ampliada"
              >
                <Text style={styles.smallSecondaryText}>Ampliar</Text>
              </Pressable>

              <Pressable
                onPress={onRemovePhoto}
                style={({ pressed }) => [
                  styles.smallDangerButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Quitar foto"
              >
                <Text style={styles.smallDangerText}>Quitar foto</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.permissionButtonsRow}>
        {RESOURCE_BUTTONS.map(({ action, label, icon }) => {
          const outcome = permissionOutcomes[action];
          return (
            <Pressable
              key={action}
              onPress={() => handleResourcePress(action)}
              disabled={busy}
              style={({ pressed }) => [
                styles.permissionButton,
                pressed && styles.buttonPressed,
                busy && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Ionicons name={icon} size={18} color="#2563EB" />
              <Text style={styles.permissionButtonText}>{label}</Text>
              {outcome && (
                <Text
                  style={[
                    styles.outcomeBadge,
                    outcome === 'granted' && styles.outcomeGranted,
                    outcome === 'denied' && styles.outcomeDenied,
                    outcome === 'blocked' && styles.outcomeBlocked,
                  ]}
                >
                  {OUTCOME_LABEL[outcome]}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {notice && (
        <View
          style={[
            styles.noticeBanner,
            notice.blocked && styles.noticeBannerBlocked,
          ]}
        >
          <Text style={styles.noticeText}>{notice.text}</Text>
          <View style={styles.noticeActions}>
            {notice.suggestGallery && (
              <Pressable
                onPress={onPickFromGallery}
                style={({ pressed }) => [
                  styles.noticeGalleryButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Usar galería como alternativa"
              >
                <Text style={styles.noticeActionText}>Elegir de galería</Text>
              </Pressable>
            )}
            {notice.blocked && (
              <Pressable
                onPress={onOpenSettings}
                style={({ pressed }) => [
                  styles.noticeSettingsButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Abrir ajustes"
              >
                <Text style={styles.noticeActionText}>Abrir ajustes</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  zoomHint: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMeta: {
    flex: 1,
    gap: 4,
  },
  photoSourceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  photoDimensionsText: {
    fontSize: 12,
    color: '#64748B',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  smallSecondaryButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
  },
  smallSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  smallDangerButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
  },
  smallDangerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  permissionButtonsRow: {
    gap: 8,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  permissionButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  outcomeBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  outcomeGranted: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  outcomeDenied: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  outcomeBlocked: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  noticeBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  noticeBannerBlocked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  noticeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noticeGalleryButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
  },
  noticeSettingsButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
  },
  noticeActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
