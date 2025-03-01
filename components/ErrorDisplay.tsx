import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppError, getErrorDisplayMessage } from '../lib/errorHandling';

interface ErrorDisplayProps {
  error: AppError | string | null;
  onRetry?: () => void;
  style?: object;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry,
  style
}) => {
  if (!error) return null;
  
  const errorMessage = typeof error === 'string' 
    ? error 
    : getErrorDisplayMessage(error);
  
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FF5A5F" />
      <Text style={styles.errorText}>{errorMessage}</Text>
      {onRetry && (
        <Pressable 
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed
          ]}
          onPress={onRetry}
        >
          <MaterialCommunityIcons name="refresh" size={16} color="#FF5A5F" />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFEEEE',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF5A5F',
  },
  errorText: {
    color: '#484848',
    fontSize: 14,
    marginVertical: 8,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF5A5F',
    marginTop: 8,
  },
  retryButtonPressed: {
    opacity: 0.7,
  },
  retryText: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
});