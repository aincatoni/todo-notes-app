import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Photo } from '../types/task';

export interface PhotoPreviewModalProps {
  visible: boolean;
  photo: Photo | null;
  onClose: () => void;
  asOverlay?: boolean;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  visible,
  photo,
  onClose,
  asOverlay = false,
}) => {
  if (!visible || !photo) {
    return null;
  }

  const content = (
    <View style={styles.overlay} accessibilityViewIsModal={true}>
      <View style={styles.topBar}>
        <View style={styles.metaInfo}>
          <Ionicons
            name={photo.takenWith === 'camera' ? 'camera-outline' : 'images-outline'}
            size={18}
            color="#E2E8F0"
          />
          <Text style={styles.metaText}>
            {photo.takenWith === 'camera' ? 'Cámara' : 'Galería'} • {photo.width}×
            {photo.height}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar vista ampliada"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <Pressable
        style={styles.imageContainer}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar foto ampliada"
      >
        <Image
          source={{ uri: photo.uri }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );

  if (asOverlay) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    elevation: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
