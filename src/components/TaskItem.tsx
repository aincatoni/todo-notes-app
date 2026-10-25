import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../types/task';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const handleDeletePress = () => {
    Alert.alert(
      'Eliminar tarea',
      `¿Estás seguro de que deseas eliminar la tarea "${task.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDelete(task.id),
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.card, task.completed && styles.cardCompleted]}>
      {/* Botón de toggle / Checkbox */}
      <Pressable
        onPress={() => onToggle(task.id)}
        style={styles.checkboxTouchArea}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={
          task.completed
            ? `Marcar "${task.title}" como pendiente`
            : `Marcar "${task.title}" como completada`
        }
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
          {task.completed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </Pressable>

      {/* Contenido principal: Título, descripción y fecha */}
      <View style={styles.content}>
        <Text
          style={[styles.title, task.completed && styles.titleCompleted]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        {Boolean(task.description) && (
          <Text
            style={[styles.description, task.completed && styles.descriptionCompleted]}
            numberOfLines={3}
          >
            {task.description}
          </Text>
        )}

        <View style={styles.footerRow}>
          <Ionicons name="time-outline" size={12} color="#94A3B8" />
          <Text style={styles.dateText}>{formatDate(task.createdAt)}</Text>
          {Boolean(task.updatedAt) && (
            <Text style={styles.editedBadge}>• editado</Text>
          )}
        </View>
      </View>

      {/* Botones de acción: Editar y Eliminar */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => onEdit(task)}
          style={({ pressed }) => [
            styles.actionButton,
            styles.editButton,
            pressed && styles.actionButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Editar tarea ${task.title}`}
        >
          <Ionicons name="pencil-sharp" size={17} color="#2563EB" />
        </Pressable>

        <Pressable
          onPress={handleDeletePress}
          style={({ pressed }) => [
            styles.actionButton,
            styles.deleteButton,
            pressed && styles.actionButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar tarea ${task.title}`}
        >
          <Ionicons name="trash-outline" size={17} color="#DC2626" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.88,
  },
  checkboxTouchArea: {
    padding: 4,
    marginRight: 8,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  descriptionCompleted: {
    color: '#94A3B8',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  editedBadge: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  actionButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },
});
