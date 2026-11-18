import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { permissionPort } from '../composition';
import {
  PermissionOutcome,
  PermissionResource,
  SystemPermissionState,
} from '../ports/permissions';
import { createPermissionService } from '../services/permissionService';
import { PermissionRationaleProps } from '../components/PermissionRationale';

interface ModalState {
  visible: boolean;
  resource: PermissionResource | null;
  mode: 'rationale' | 'blocked';
}

const INITIAL_MODAL_STATE: ModalState = {
  visible: false,
  resource: null,
  mode: 'rationale',
};

const sessionDenialCounts = new Map<PermissionResource, number>();

export function usePermissions() {
  const [modalState, setModalState] = useState<ModalState>(INITIAL_MODAL_STATE);
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null);

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    };
  }, []);

  const confirmRationale = useCallback(
    (resource: PermissionResource): Promise<boolean> => {
      Keyboard.dismiss();
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          visible: true,
          resource,
          mode: 'rationale',
        });
      });
    },
    []
  );

  const ensurePermission = useCallback(
    async (resource: PermissionResource): Promise<PermissionOutcome> => {
      const service = createPermissionService(
        permissionPort,
        confirmRationale,
        sessionDenialCounts
      );
      const outcome = await service.ensure(resource);
      if (outcome === 'blocked') {
        Keyboard.dismiss();
        setModalState({
          visible: true,
          resource,
          mode: 'blocked',
        });
      }
      return outcome;
    },
    [confirmRationale]
  );

  const getPermissionStatus = useCallback(
    (resource: PermissionResource): Promise<SystemPermissionState> => {
      const service = createPermissionService(
        permissionPort,
        confirmRationale,
        sessionDenialCounts
      );
      return service.getStatus(resource);
    },
    [confirmRationale]
  );

  const openSettings = useCallback((): Promise<void> => {
    const service = createPermissionService(
      permissionPort,
      confirmRationale,
      sessionDenialCounts
    );
    return service.openSettings();
  }, [confirmRationale]);

  const handleConfirm = useCallback(() => {
    if (modalState.mode === 'blocked') {
      setModalState(INITIAL_MODAL_STATE);
      void openSettings();
      return;
    }

    const resolve = resolverRef.current;
    resolverRef.current = null;
    setModalState(INITIAL_MODAL_STATE);
    resolve?.(true);
  }, [modalState.mode, openSettings]);

  const handleCancel = useCallback(() => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setModalState(INITIAL_MODAL_STATE);
    resolve?.(false);
  }, []);

  const rationaleModalProps: PermissionRationaleProps = {
    visible: modalState.visible,
    resource: modalState.resource,
    mode: modalState.mode,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return {
    ensurePermission,
    getPermissionStatus,
    openSettings,
    rationaleModalProps,
  };
}
