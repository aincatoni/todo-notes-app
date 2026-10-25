import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  totalCount: number;
  pendingCount: number;
  onOpenCreateModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  pendingCount,
  onOpenCreateModal,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.badgeText}>EVA1 • CIISA 2026</Text>
        <Text style={styles.title}>Mis Notas y Tareas</Text>
        <Text style={styles.subtitle}>
          {pendingCount === 0
            ? '¡Todo al día! No tienes tareas pendientes'
            : `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} de ${totalCount}`}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
