import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from './src/hooks/useAuth';
import { useTasks } from './src/hooks/useTasks';
import { usePermissions } from './src/hooks/usePermissions';
import { GeoLocation, Photo, Task } from './src/types/task';
import { Header } from './src/components/Header';
import { TaskFilterBar } from './src/components/TaskFilterBar';
import { TaskItem } from './src/components/TaskItem';
import { TaskModal } from './src/components/TaskModal';
import { EmptyState } from './src/components/EmptyState';
import { PhotoPreviewModal } from './src/components/PhotoPreviewModal';
import { PermissionRationale } from './src/components/PermissionRationale';
import { LoginScreen } from './src/screens/LoginScreen';

export default function App() {
  const {
    user,
    initializing: authInitializing,
    submitting: authSubmitting,
    error: authError,
    login,
    register,
    logout,
    checkPendingSync,
    clearError,
  } = useAuth();

  const { ensurePermission, rationaleModalProps } = usePermissions();

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
  } = useTasks({
    userId: user?.id ?? 'local',
    ensureLocationPermission: ensurePermission,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

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

  const handlePerformLogout = useCallback(async () => {
    setModalVisible(false);
    setTaskToEdit(null);
    setPreviewPhoto(null);
    await logout();
  }, [logout]);

  const handleLogout = useCallback(async () => {
    const hasPending = await checkPendingSync();
    if (hasPending) {
      Alert.alert(
        'Cambios pendientes de sincronizar',
        'Tienes operaciones pendientes en la cola. Tus tareas locales se conservarán para cuando vuelvas a iniciar sesión. ¿Deseas cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar sesión',
            style: 'destructive',
            onPress: () => {
              void handlePerformLogout();
            },
          },
        ]
      );
      return;
    }

    await handlePerformLogout();
  }, [checkPendingSync, handlePerformLogout]);

  const handleSubmitTask = useCallback(
    async (
      title: string,
      description: string,
      id?: string,
      photo?: Photo | null,
      location?: GeoLocation | null
    ): Promise<boolean> => {
      if (id) {
        return await editTask(id, title, description, photo);
      } else {
        return await addTask(title, description, photo, location);
      }
    },
    [addTask, editTask]
  );

  const keyExtractor = useCallback((item: Task) => item.id, []);

  const renderTaskItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskItem
        task={item}
        onToggle={toggleTask}
        onEdit={handleOpenEdit}
        onDelete={deleteTask}
        onPreviewPhoto={setPreviewPhoto}
      />
    ),
    [toggleTask, handleOpenEdit, deleteTask]
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <StatusBar style="dark" />

        {authInitializing ? (
          <View style={styles.authLoadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.authLoadingText}>Verificando sesión...</Text>
          </View>
        ) : !user ? (
          <LoginScreen
            submitting={authSubmitting}
            error={authError}
            onLogin={login}
            onRegister={register}
            onClearError={clearError}
          />
        ) : (
          <View style={styles.screen}>
            {/* Encabezado Principal */}
            <Header
              totalCount={stats.total}
              pendingCount={stats.pending}
              username={user.username}
              onLogout={() => void handleLogout()}
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
                keyExtractor={keyExtractor}
                renderItem={renderTaskItem}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
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
              userId={user.id}
              onClose={handleCloseModal}
              onSubmit={handleSubmitTask}
              taskToEdit={taskToEdit}
            />

            <PhotoPreviewModal
              visible={Boolean(previewPhoto)}
              photo={previewPhoto}
              onClose={() => setPreviewPhoto(null)}
            />

            <PermissionRationale {...rationaleModalProps} />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  authLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  authLoadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
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
