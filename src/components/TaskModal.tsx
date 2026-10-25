import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../types/task';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, id?: string) => Promise<boolean>;
  taskToEdit?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  taskToEdit,
}) => {
  const isEditing = Boolean(taskToEdit);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar campos cuando se abre en modo edición o creación
  useEffect(() => {
    if (visible) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || '');
      } else {
        setTitle('');
        setDescription('');
      }
      setErrorMessage('');
      setSubmitting(false);
    }
  }, [visible, taskToEdit]);

  const handleSave = async () => {
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
      taskToEdit?.id
    );

    setSubmitting(false);

    if (success) {
      // Limpiar campos tras guardar exitosamente (requisito del encargo)
      setTitle('');
      setDescription('');
      onClose();
    } else {
      setErrorMessage('Ocurrió un error al guardar la tarea.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

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
              onPress={onClose}
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
          </ScrollView>

          {/* Botones de acción */}
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
              disabled={submitting}
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
      </KeyboardAvoidingView>
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
