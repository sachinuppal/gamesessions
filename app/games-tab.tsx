import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// This is a placeholder file for the games tab
// The actual content is shown in the GameDrawer component
export default function GamesTabScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Select a game from the menu</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    color: '#767676',
    textAlign: 'center',
  },
});