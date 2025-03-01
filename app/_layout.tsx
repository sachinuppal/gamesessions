import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { autoTerminateSessions, markSettlementsByGoons } from '../lib/utils';
import { View, Text, StyleSheet } from 'react-native';
import { OfflineNotice } from '../components/OfflineNotice';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  useEffect(() => {
    // Signal that the framework is ready
    window.frameworkReady?.();
    
    // Check for sessions that need to be auto-terminated and settlements that need to be marked as settled by goons
    // Use a timeout to delay these operations to prevent blocking the initial render
    const timer = setTimeout(() => {
      const checkSessionsAndSettlements = async () => {
        try {
          await autoTerminateSessions();
          await markSettlementsByGoons();
        } catch (error) {
          console.error('Error checking sessions and settlements:', error);
        }
      };
      
      checkSessionsAndSettlements();
      
      // Set up interval to check every hour
      const interval = setInterval(checkSessionsAndSettlements, 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }, 2000); // Delay by 2 seconds to allow the app to render first
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <OfflineNotice />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#484848',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#f7f7f7',
          },
          headerTitle: ({ children }) => {
            // Only show the custom header for the main screens
            if (children === 'Active Session' || children === 'Session Summary' || children === 'End Session') {
              return (
                <View style={styles.headerContainer}>
                  <Text style={styles.headerTitle}>{children}</Text>
                </View>
              );
            }
            return (
              <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Game Session Tracker</Text>
              </View>
            );
          },
        }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="poker"
          options={{
            title: 'Poker Sessions',
          }}
        />
        <Stack.Screen
          name="rummy"
          options={{
            title: 'Rummy Games',
          }}
        />
        <Stack.Screen
          name="bridge"
          options={{
            title: 'Bridge Games',
          }}
        />
        <Stack.Screen
          name="sequence"
          options={{
            title: 'Sequence Games',
          }}
        />
        <Stack.Screen
          name="scrabble"
          options={{
            title: 'Scrabble Games',
          }}
        />
        <Stack.Screen
          name="chess"
          options={{
            title: 'Chess Games',
          }}
        />
        <Stack.Screen
          name="housie"
          options={{
            title: 'Housie Games',
          }}
        />
        <Stack.Screen
          name="codenames"
          options={{
            title: 'Codenames Games',
          }}
        />
        <Stack.Screen
          name="new-session"
          options={{
            title: 'New Poker Session',
          }}
        />
        <Stack.Screen
          name="new-poker-session"
          options={{
            title: 'New Poker Session',
          }}
        />
        <Stack.Screen
          name="new-rummy-session"
          options={{
            title: 'New Rummy Game',
          }}
        />
        <Stack.Screen
          name="new-bridge-session"
          options={{
            title: 'New Bridge Game',
          }}
        />
        <Stack.Screen
          name="new-sequence-session"
          options={{
            title: 'New Sequence Game',
          }}
        />
        <Stack.Screen
          name="new-scrabble-session"
          options={{
            title: 'New Scrabble Game',
          }}
        />
        <Stack.Screen
          name="new-chess-session"
          options={{
            title: 'New Chess Game',
          }}
        />
        <Stack.Screen
          name="new-housie-session"
          options={{
            title: 'New Housie Game',
          }}
        />
        <Stack.Screen
          name="new-codenames-session"
          options={{
            title: 'New Codenames Game',
          }}
        />
        <Stack.Screen
          name="session/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="rummy-session/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="bridge-session/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sequence-session/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="scrabble-session/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="chess-session/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="housie-session/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="codenames-session/[id]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
  },
});