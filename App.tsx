import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTasks } from './src/hooks/useTasks';
import { Task } from './src/types/task';
import { Header } from './src/components/Header';
import { TaskFilterBar } from './src/components/TaskFilterBar';
import { TaskItem } from './src/components/TaskItem';
import { TaskModal } from './src/components/TaskModal';
import { EmptyState } from './src/components/EmptyState';

export default function App() {
  const {
    tasks,
    filteredTasks,
    loading,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    addTask,
    editTask,
    toggleTask,
    deleteTask,
    stats,
  } = useTasks();

  const [modalVisible, setModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const handleOpenCreate = useCallback(() => {
    setTaskToEdit(null);
    setModalVisible(true);
  }, []);

  const handleOpenEdit = useCallback((task: Task) => {
    setTaskToEdit(task);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setTaskToEdit(null);
  }, []);

  const handleSubmitTask = useCallback(
    async (title: string, description: string, id?: string): Promise<boolean> => {
      if (id) {
        return await editTask(id, title, description);
      } else {
        return await addTask(title, description);
      }
    },
    [addTask, editTask]
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        <View style={styles.screen}>
          {/* Encabezado Principal */}
          <Header
            totalCount={stats.total}
            pendingCount={stats.pending}
            onOpenCreateModal={handleOpenCreate}
          />

          {/* Barra de Filtros y Búsqueda */}
          <TaskFilterBar
            filter={filter}
            onSelectFilter={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            counts={stats}
          />

          {/* Contenido / Lista de Tareas */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : (
            <FlatList
              data={filteredTasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TaskItem
                  task={item}
                  onToggle={toggleTask}
                  onEdit={handleOpenEdit}
                  onDelete={deleteTask}
                />
              )}
              ListEmptyComponent={
                <EmptyState
                  filter={filter}
                  hasSearchQuery={searchQuery.length > 0}
                  onOpenCreate={handleOpenCreate}
                  onResetFilter={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                />
              }
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Botón Flotante de Acción (FAB) para ergonomía táctil */}
          {tasks.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.fab,
                pressed && styles.fabPressed,
              ]}
              onPress={handleOpenCreate}
              accessibilityRole="button"
              accessibilityLabel="Crear nueva tarea"
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </Pressable>
          )}

          {/* Modal para Crear y Editar Tareas */}
          <TaskModal
            visible={modalVisible}
            onClose={handleCloseModal}
            onSubmit={handleSubmitTask}
            taskToEdit={taskToEdit}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 96, // Espacio para que el FAB no tape el último elemento
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabPressed: {
    backgroundColor: '#1D4ED8',
    transform: [{ scale: 0.95 }],
  },
});
