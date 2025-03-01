import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRef } from 'react';
import GameDrawer, { GameDrawerRef } from '../../components/GameDrawer';

export default function TabLayout() {
  const gameDrawerRef = useRef<GameDrawerRef>(null);

  const openGameDrawer = () => {
    if (gameDrawerRef.current) {
      gameDrawerRef.current.open();
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#484848',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#e4e4e4',
          },
          tabBarActiveTintColor: '#FF5A5F',
          tabBarInactiveTintColor: '#767676',
          headerTitle: ({ children }) => {
            return <Text style={styles.headerTitle}>{children}</Text>;
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color }) => (
              <MaterialCommunityIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ size, color }) => (
              <MaterialCommunityIcons name="history" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="games-tab"
          options={{
            title: 'Games',
            tabBarIcon: ({ size, color }) => (
              <MaterialCommunityIcons name="gamepad-variant" size={size} color={color} />
            ),
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={openGameDrawer}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              // Prevent default navigation
              e.preventDefault();
              // Open the drawer instead
              openGameDrawer();
            },
          }}
        />
        <Tabs.Screen
          name="rules"
          options={{
            title: 'Rules',
            tabBarIcon: ({ size, color }) => (
              <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ size, color }) => (
              <MaterialCommunityIcons name="cog" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <GameDrawer ref={gameDrawerRef} />
    </>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
  },
});