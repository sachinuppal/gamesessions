import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
  iconColor?: string;
  iconSize?: number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  iconColor = '#FF5A5F',
  iconSize = 64,
}) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#767676',
    fontSize: 16,
    textAlign: 'center',
    maxWidth: '80%',
  },
});