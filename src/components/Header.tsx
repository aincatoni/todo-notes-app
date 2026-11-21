import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  totalCount: number;
  pendingCount: number;
  username?: string;
  onLogout?: () => void;
  onOpenCreateModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  pendingCount,
  username,
  onLogout,
  onOpenCreateModal,
}) => {
  const formattedUsername =
    username && username.includes('@') ? username : `@${username ?? ''}`;

  return (
    <View style={styles.container}>
      {Boolean(username) && (
        <View style={styles.userBar}>
          <View style={styles.userBadge}>
            <Ionicons
              name="person-circle-outline"
              size={16}
              color="#1E40AF"
            />
            <Text style={styles.userBadgeText} numberOfLines={1}>
              {formattedUsername}
            </Text>
          </View>

          {onLogout && (
            <Pressable
              onPress={onLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons name="log-out-outline" size={16} color="#DC2626" />
              <Text style={styles.logoutButtonText}>Salir</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.mainRow}>
        <View style={styles.textContainer}>
          <Text style={styles.badgeText}>EVA2 • IPSS 2026</Text>
          <Text style={styles.title}>Mis Notas y Tareas</Text>
          <Text style={styles.subtitle}>
            {pendingCount === 0
              ? '¡Todo al día! No tienes tareas pendientes'
              : `${pendingCount} pendiente${
                  pendingCount === 1 ? '' : 's'
                } de ${totalCount}`}
          </Text>
        </View>

        <Pressable
          onPress={onOpenCreateModal}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Agregar nueva tarea"
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Nueva</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
  },
  userBadgeText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 5,
  },
  logoutButtonPressed: {
    backgroundColor: '#FEE2E2',
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonPressed: {
    backgroundColor: '#1D4ED8',
    transform: [{ scale: 0.97 }],
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 4,
  },
});
