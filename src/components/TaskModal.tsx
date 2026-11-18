import React, { useEffect, useState } from 'react';
import {
  AppState,
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Photo, Task } from '../types/task';
import { PermissionOutcome, PermissionResource } from '../ports/permissions';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionRationale } from './PermissionRationale';
import { PhotoNotice, PhotoPicker } from './PhotoPicker';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { cameraPort, clock, photoFilesPort } from '../composition';
import { createPhotoService } from '../services/photoService';
import { isAppError } from '../domain/errors';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    id?: string,
    photo?: Photo | null
  ) => Promise<boolean>;
  taskToEdit?: Task | null;
}

interface TaskModalContentProps {
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    id?: string,
    photo?: Photo | null
  ) => Promise<boolean>;
  taskToEdit?: Task | null;
}

const TaskModalContent: React.FC<TaskModalContentProps> = ({
  onClose,
  onSubmit,
  taskToEdit,
}) => {
  const isEditing = Boolean(taskToEdit);
  const [draftTaskId] = useState(
    () => taskToEdit?.id ?? `draft-${clock.now()}`
  );
  const [title, setTitle] = useState(taskToEdit?.title ?? '');
  const [description, setDescription] = useState(taskToEdit?.description ?? '');
  const [photo, setPhoto] = useState<Photo | null>(taskToEdit?.photo ?? null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [permissionOutcomes, setPermissionOutcomes] = useState<
    Partial<Record<PermissionResource, PermissionOutcome>>
  >({});
  const [permissionNotice, setPermissionNotice] = useState<
    (PhotoNotice & { resource?: PermissionResource }) | null
  >(null);

  const {
    ensurePermission,
    getPermissionStatus,
    openSettings,
    rationaleModalProps,
  } = usePermissions();

  useEffect(() => {
    let isMounted = true;

    const syncPermissionsFromSystem = async () => {
      const resources: PermissionResource[] = [
        'camera',
        'mediaLibrary',
        'location',
      ];
      const states = await Promise.all(
        resources.map(async (resource) => ({
          resource,
          state: await getPermissionStatus(resource),
        }))
      );

      if (!isMounted) {
        return;
      }

      const resolvedMap: Partial<Record<PermissionResource, PermissionOutcome>> =
        {};
      for (const { resource, state } of states) {
        if (state.status === 'granted') {
          resolvedMap[resource] = 'granted';
        } else if (state.status === 'denied' && !state.canAskAgain) {
          resolvedMap[resource] = 'blocked';
        } else if (state.status === 'denied') {
          resolvedMap[resource] = 'denied';
        }
      }

      setPermissionOutcomes(resolvedMap);

      setPermissionNotice((prev) => {
        if (!prev?.blocked) {
          return prev;
        }
        if (prev.resource && resolvedMap[prev.resource] === 'granted') {
          return null;
        }
        if (!prev.resource && Object.values(resolvedMap).includes('granted')) {
          return null;
        }
        return prev;
      });
    };

    void syncPermissionsFromSystem();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void syncPermissionsFromSystem();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [getPermissionStatus]);

  const handleAcquirePhoto = async (source: 'camera' | 'gallery') => {
    Keyboard.dismiss();
    setCapturingPhoto(true);

    const resource: PermissionResource =
      source === 'camera' ? 'camera' : 'mediaLibrary';
    const photoService = createPhotoService({
      camera: cameraPort,
      photoFiles: photoFilesPort,
      permissions: { ensure: ensurePermission },
      clock,
    });
    const tempPrevious =
      photo && photo.uri !== taskToEdit?.photo?.uri ? photo : null;

    try {
      const captured =
        source === 'camera'
          ? await photoService.captureFromCamera({
              userId: 'local',
              taskId: draftTaskId,
              previousPhoto: tempPrevious,
            })
          : await photoService.pickFromGallery({
              userId: 'local',
              taskId: draftTaskId,
              previousPhoto: tempPrevious,
            });

      setPhoto(captured);
      setPermissionOutcomes((prev) => ({ ...prev, [resource]: 'granted' }));
      setPermissionNotice(null);
    } catch (err) {
      if (!isAppError(err)) {
        setPermissionNotice({
          text: 'No se pudo obtener la imagen.',
          suggestGallery: source === 'camera',
          resource,
        });
        return;
      }

      if (err.code === 'CAPTURE_CANCELLED') {
        return;
      }

      if (err.code === 'PERMISSION_BLOCKED') {
        setPermissionOutcomes((prev) => ({ ...prev, [resource]: 'blocked' }));
        setPermissionNotice({
          text: 'El permiso está bloqueado. Habilítalo desde Ajustes del sistema.',
          blocked: true,
          suggestGallery: source === 'camera',
          resource,
        });
        return;
      }

      if (err.code === 'PERMISSION_DENIED') {
        setPermissionOutcomes((prev) => ({ ...prev, [resource]: 'denied' }));
        setPermissionNotice({
          text:
            source === 'camera'
              ? 'Permiso de cámara denegado. Puedes usar "Elegir de galería".'
              : 'Permiso de galería denegado.',
          suggestGallery: source === 'camera',
          resource,
        });
        return;
      }

      setPermissionNotice({
        text: err.message,
        suggestGallery: source === 'camera',
        resource,
      });
    } finally {
      setCapturingPhoto(false);
    }
  };

  const handleCheckLocationPermission = async () => {
    Keyboard.dismiss();
    const outcome = await ensurePermission('location');
    setPermissionOutcomes((prev) => ({ ...prev, location: outcome }));

    if (outcome === 'granted') {
      setPermissionNotice(null);
      return;
    }

    if (outcome === 'blocked') {
      setPermissionNotice({
        text: 'El permiso está bloqueado. Habilítalo desde Ajustes del sistema.',
        blocked: true,
        resource: 'location',
      });
      return;
    }

    setPermissionNotice({
      text: 'Permiso de ubicación denegado. La tarea podrá guardarse sin ubicación.',
      blocked: false,
      resource: 'location',
    });
  };

  const handleRemoveDraftPhoto = () => {
    if (photo && photo.uri !== taskToEdit?.photo?.uri) {
      void photoFilesPort.delete(photo.uri);
    }
    setPhoto(null);
  };

  const handleCancelModal = () => {
    Keyboard.dismiss();
    if (photo && photo.uri !== taskToEdit?.photo?.uri) {
      void photoFilesPort.delete(photo.uri);
    }
    onClose();
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('El título de la tarea es obligatorio.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const success = await onSubmit(
      trimmedTitle,
      description.trim(),
      taskToEdit?.id,
      photo
    );

    setSubmitting(false);

    if (success) {
      // Limpiar campos tras guardar exitosamente (requisito del encargo)
      setTitle('');
      setDescription('');
      setPhoto(null);
      onClose();
    } else {
      setErrorMessage('Ocurrió un error al guardar la tarea.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.overlay}
    >
      <Pressable style={styles.backdrop} onPress={handleCancelModal} />

      <View style={styles.modalContent}>
        {/* Header del modal */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Ionicons
              name={isEditing ? 'pencil' : 'add-circle'}
              size={22}
              color="#2563EB"
            />
          </View>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
          </Text>
          <Pressable
            onPress={handleCancelModal}
            style={styles.closeButton}
            accessibilityLabel="Cerrar ventana"
          >
            <Ionicons name="close" size={22} color="#64748B" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mensaje de error de validación */}
          {Boolean(errorMessage) && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Campo Título */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Título <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                Boolean(errorMessage) && styles.inputError,
              ]}
              placeholder="Ej. Revisar apunte de React Native"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errorMessage) setErrorMessage('');
              }}
              maxLength={80}
              autoFocus={true}
            />
            <Text style={styles.helperText}>
              {title.length}/80 caracteres
            </Text>
          </View>

          {/* Campo Descripción */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detalles adicionales, notas o subtareas..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.helperText}>
              {description.length}/300 caracteres
            </Text>
          </View>

          {/* Periféricos y permisos incrementales (Fases 2 y 3) */}
          <PhotoPicker
            photo={photo}
            busy={capturingPhoto}
            permissionOutcomes={permissionOutcomes}
            notice={permissionNotice}
            onTakePhoto={() => void handleAcquirePhoto('camera')}
            onPickFromGallery={() => void handleAcquirePhoto('gallery')}
            onCheckLocation={() => void handleCheckLocationPermission()}
            onRemovePhoto={handleRemoveDraftPhoto}
            onPreviewPhoto={setPreviewPhoto}
            onOpenSettings={() => void openSettings()}
          />
        </ScrollView>

        {/* Botones de acción */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleCancelModal}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}
            disabled={submitting || capturingPhoto}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>

          <Pressable
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.buttonPressed,
              (submitting || capturingPhoto) && styles.buttonDisabled,
            ]}
            disabled={submitting || capturingPhoto}
          >
            <Text style={styles.submitButtonText}>
              {submitting
                ? 'Guardando...'
                : isEditing
                ? 'Actualizar'
                : 'Guardar Tarea'}
            </Text>
          </Pressable>
        </View>
      </View>

      <PhotoPreviewModal
        visible={Boolean(previewPhoto)}
        photo={previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        asOverlay={true}
      />

      <PermissionRationale {...rationaleModalProps} />
    </KeyboardAvoidingView>
  );
};

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  taskToEdit,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {visible ? (
        <TaskModalContent
          key={taskToEdit?.id ?? 'new'}
          onClose={onClose}
          onSubmit={onSubmit}
          taskToEdit={taskToEdit}
        />
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  closeButton: {
    padding: 6,
  },
  body: {
    paddingVertical: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  requiredMark: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF5F5',
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
});
