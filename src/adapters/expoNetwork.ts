import * as Network from 'expo-network';
import { NetworkPort } from '../ports/network';

function isNetworkOnline(state: {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}): boolean {
  if (!state.isConnected) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return true;
}

export const expoNetwork: NetworkPort = {
  async isOnline(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return isNetworkOnline(state);
    } catch {
      return false;
    }
  },

  subscribe(cb: (online: boolean) => void): () => void {
    const subscription = Network.addNetworkStateListener((event) => {
      cb(isNetworkOnline(event));
    });
    return () => {
      subscription.remove();
    };
  },
};
