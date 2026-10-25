import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskFilter } from '../types/task';

interface EmptyStateProps {
  filter: TaskFilter;
  hasSearchQuery: boolean;
  onOpenCreate: () => void;
  onResetFilter: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  filter,
  hasSearchQuery,
  onOpenCreate,
  onResetFilter,
}) => {
  let iconName: keyof typeof Ionicons.glyphMap = 'clipboard-outline';
  let title = 'No tienes tareas registradas';
  let subtitle = 'Comienza organizando tu día agregando una nueva tarea o nota.';

  if (hasSearchQuery) {
    iconName = 'search-outline';
    title = 'Sin resultados';
    subtitle = 'No se encontraron tareas que coincidan con tu búsqueda.';
  } else if (filter === 'pending') {
    iconName = 'checkmark-done-circle-outline';
    title = '¡Sin tareas pendientes!';
    subtitle = 'Has completado todas tus tareas. Puedes relajarte o agregar una nueva.';
  } else if (filter === 'completed') {
    iconName = 'time-outline';
    title = 'No hay tareas completadas';
    subtitle = 'Cuando termines una tarea, márcala para verla registrada aquí.';
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={44} color="#60A5FA" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {hasSearchQuery ? (
        <Pressable
          onPress={onResetFilter}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
        >
          <Text style={styles.actionButtonText}>Limpiar búsqueda</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onOpenCreate}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Agregar Primera Tarea</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
