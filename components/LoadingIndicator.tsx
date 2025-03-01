import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
  timeout?: number;
  onTimeout?: () => void;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'large',
  color = '#FF5A5F',
  message,
  fullScreen = false,
  timeout = 0,
  onTimeout,
}) => {
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (timeout > 0 && onTimeout) {
      timer = setTimeout(() => {
        setTimeoutReached(true);
        onTimeout();
      }, timeout);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timeout, onTimeout]);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{timeoutReached ? 'Taking longer than expected...' : message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  message: {
    marginTop: 12,
    color: '#767676',
    fontSize: 14,
    textAlign: 'center',
  },
});