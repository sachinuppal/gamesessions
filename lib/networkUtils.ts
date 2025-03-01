import NetInfo from '@react-native-community/netinfo';

// Check if the device is currently connected to the internet
export const isConnected = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
};

// Listen for network state changes
export const addNetworkListener = (
  callback: (isConnected: boolean) => void
): (() => void) => {
  return NetInfo.addEventListener(state => {
    callback(state.isConnected ?? false);
  });
};

// Check if the connection is metered (mobile data)
export const isMeteredConnection = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.details && state.details.isConnectionExpensive;
};

// Get connection type (wifi, cellular, none, etc.)
export const getConnectionType = async (): Promise<string> => {
  const state = await NetInfo.fetch();
  return state.type;
};

// Check if the connection is strong enough for data-intensive operations
export const hasStrongConnection = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  
  // If not connected, return false
  if (!state.isConnected) return false;
  
  // If on wifi, assume strong connection
  if (state.type === 'wifi') return true;
  
  // For cellular connections, check strength
  if (state.type === 'cellular') {
    // Check cellular generation (2g, 3g, 4g, 5g)
    const generation = state.details?.cellularGeneration;
    
    // Consider 4g and 5g as strong connections
    return generation === '4g' || generation === '5g';
  }
  
  // For other connection types, assume not strong
  return false;
};