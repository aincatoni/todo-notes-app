import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PermissionResource } from '../ports/permissions';
import { PERMISSION_RATIONALE_COPY } from '../services/permissionService';

export interface PermissionRationaleProps {
  visible: boolean;
  resource: PermissionResource | null;
  mode: 'rationale' | 'blocked';
  onConfirm: () => void;
  onCancel: () => void;
}

const RESOURCE_ICON: Record<
  PermissionResource,
  keyof typeof Ionicons.glyphMap
> = {
  camera: 'camera-outline',
  mediaLibrary: 'images-outline',
  location: 'location-outline',
};

export const PermissionRationale: React.FC<PermissionRationaleProps> = ({
  visible,
  resource,
  mode,
  onConfirm,
  onCancel,
}) => {
  if (!visible || !resource) {
    return null;
  }

  const copy = PERMISSION_RATIONALE_COPY[resource];
  const isBlocked = mode === 'blocked';

  return (
    <View style={styles.overlay} accessibilityViewIsModal={true}>
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cerrar explicación de permiso"
      />
      <View style={styles.card}>
        <View
          style={[styles.iconCircle, isBlocked && styles.iconCircleBlocked]}
        >
          <Ionicons
            name={isBlocked ? 'lock-closed-outline' : RESOURCE_ICON[resource]}
            size={30}
            color={isBlocked ? '#DC2626' : '#2563EB'}
          />
        </View>

        <Text style={styles.title}>
          {isBlocked ? `${copy.title} bloqueado` : copy.title}
        </Text>

        <Text style={styles.description}>
          {isBlocked ? copy.blockedDescription : copy.description}
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isBlocked ? 'Cerrar' : 'Ahora no'}
          >
            <Text style={styles.secondaryButtonText}>
              {isBlocked ? 'Cerrar' : 'Ahora no'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.primaryButton,
              isBlocked && styles.blockedPrimaryButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isBlocked ? 'Abrir ajustes' : 'Continuar'}
          >
            <Text style={styles.primaryButtonText}>
              {isBlocked ? 'Abrir ajustes' : 'Continuar'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconCircleBlocked: {
    backgroundColor: '#FEF2F2',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  primaryButton: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  blockedPrimaryButton: {
    backgroundColor: '#DC2626',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
