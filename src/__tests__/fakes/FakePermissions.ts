import {
  PermissionPort,
  PermissionRequestOptions,
  PermissionResource,
  SystemPermissionState,
} from '../../ports/permissions';

export interface PermissionCallRecord {
  resource: PermissionResource;
  options?: PermissionRequestOptions;
}

const DEFAULT_STATE: SystemPermissionState = {
  status: 'undetermined',
  canAskAgain: true,
};

export class FakePermissions implements PermissionPort {
  private readonly states = new Map<PermissionResource, SystemPermissionState>();
  private readonly nextRequestResults = new Map<
    PermissionResource,
    SystemPermissionState
  >();

  public readonly getStatusCalls: PermissionCallRecord[] = [];
  public readonly requestCalls: PermissionCallRecord[] = [];
  public openSettingsCalls = 0;

  setInitialState(
    resource: PermissionResource,
    state: SystemPermissionState
  ): void {
    this.states.set(resource, { ...state });
  }

  setNextRequestResult(
    resource: PermissionResource,
    state: SystemPermissionState
  ): void {
    this.nextRequestResults.set(resource, { ...state });
  }

  private assertForegroundOnly(
    resource: PermissionResource,
    options?: PermissionRequestOptions
  ): void {
    if (resource === 'location' && options?.scope === 'background') {
      throw new Error(
        'R25: El permiso de ubicación en segundo plano está prohibido'
      );
    }
  }

  async getStatus(
    resource: PermissionResource,
    options?: PermissionRequestOptions
  ): Promise<SystemPermissionState> {
    this.assertForegroundOnly(resource, options);
    this.getStatusCalls.push({ resource, options });
    return { ...(this.states.get(resource) ?? DEFAULT_STATE) };
  }

  async request(
    resource: PermissionResource,
    options?: PermissionRequestOptions
  ): Promise<SystemPermissionState> {
    this.assertForegroundOnly(resource, options);
    this.requestCalls.push({ resource, options });

    const nextResult = this.nextRequestResults.get(resource);
    if (nextResult) {
      const copy = { ...nextResult };
      this.states.set(resource, copy);
      this.nextRequestResults.delete(resource);
      return { ...copy };
    }

    return { ...(this.states.get(resource) ?? DEFAULT_STATE) };
  }

  async openSettings(): Promise<void> {
    this.openSettingsCalls += 1;
  }
}
