import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getRandomPokerPlayers } from '../lib/pokerPlayers';
import { useSettingsStore, BUY_IN_OPTIONS } from '../lib/settings';
import { markSessionAsOwned } from '../lib/deviceStorage';

export default function NewSessionScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { defaultBuyIn } = useSettingsStore();
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [selectedBuyIn, setSelectedBuyIn] = useState<number>(defaultBuyIn);
  const [players, setPlayers] = useState<Array<{ id: string; name: string; buyIn: number; isAutoFilled: boolean }>>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize players with auto-filled names
  useEffect(() => {
    initializePlayers(playerCount);
  }, []);

  const initializePlayers = (count: number) => {
    const randomNames = getRandomPokerPlayers(count);
    const newPlayers = Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      name: randomNames[i],
      buyIn: selectedBuyIn,
      isAutoFilled: true
    }));
    setPlayers(newPlayers);
  };

  const updatePlayerCount = (count: number) => {
    if (count < 1) count = 1;
    if (count > 9) count = 9;
    
    setPlayerCount(count);
    
    // Update players array based on new count
    if (count > players.length) {
      // Add more players with auto-filled names
      const additionalCount = count - players.length;
      const randomNames = getRandomPokerPlayers(additionalCount);
      
      setPlayers([
        ...players,
        ...Array.from({ length: additionalCount }, (_, i) => ({
          id: String(players.length + i + 1),
          name: randomNames[i],
          buyIn: selectedBuyIn,
          isAutoFilled: true
        }))
      ]);
    } else if (count < players.length) {
      // Remove excess players
      setPlayers(players.slice(0, count));
    }
  };

  const updateBuyInAmount = (amount: number) => {
    setSelectedBuyIn(amount);
    
    // Update all players' buy-in amounts
    setPlayers(players.map(player => ({
      ...player,
      buyIn: amount
    })));
  };

  const updatePlayerName = (id: string, name: string) => {
    setPlayers(
      players.map((player) =>
        player.id === id ? { ...player, name, isAutoFilled: false } : player
      )
    );
  };

  const handlePlayerNameFocus = (id: string) => {
    // Clear auto-filled name when user focuses on the input
    const player = players.find(p => p.id === id);
    if (player && player.isAutoFilled) {
      setPlayers(
        players.map((p) =>
          p.id === id ? { ...p, name: '', isAutoFilled: false } : p
        )
      );
    }
  };

  const startSession = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Validate player names
      const emptyPlayers = players.filter(p => !p.name.trim());
      if (emptyPlayers.length > 0) {
        throw new Error('All players must have names');
      }

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({})
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create players
      const { error: playersError } = await supabase
        .from('players')
        .insert(
          players.map(player => ({
            session_id: session.id,
            name: player.name,
            initial_buy_in: player.buyIn,
            total_buy_in: player.buyIn,
          }))
        );

      if (playersError) throw playersError;

      // Mark this session as owned by this device
      await markSessionAsOwned(session.id);

      // Navigate back with notification parameter if redirect is true
      if (redirect === 'true') {
        router.replace({
          pathname: '/',
          params: { newSession: 'true' }
        });
      } else {
        router.back();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Session',
          headerRight: () => (
            <Pressable
              onPress={startSession}
              disabled={isCreating}
              style={({ pressed }) => ({
                opacity: pressed || isCreating ? 0.7 : 1,
              })}>
              {isCreating ? (
                <ActivityIndicator color="#FF5A5F" />
              ) : (
                <Text style={styles.headerButton}>Start</Text>
              )}
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Setup</Text>
          <Text style={styles.sectionSubtitle}>
            Configure your poker session
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Player Count Selection */}
        <View style={styles.configSection}>
          <Text style={styles.configLabel}>Number of Players</Text>
          <View style={styles.countSelector}>
            <Pressable 
              style={styles.countButton}
              onPress={() => updatePlayerCount(playerCount - 1)}
              disabled={playerCount <= 1}>
              <MaterialCommunityIcons 
                name="minus" 
                size={24} 
                color={playerCount <= 1 ? "#aaaaaa" : "#FF5A5F"} 
              />
            </Pressable>
            <Text style={styles.countValue}>{playerCount}</Text>
            <Pressable 
              style={styles.countButton}
              onPress={() => updatePlayerCount(playerCount + 1)}
              disabled={playerCount >= 9}>
              <MaterialCommunityIcons 
                name="plus" 
                size={24} 
                color={playerCount >= 9 ? "#aaaaaa" : "#FF5A5F"} 
              />
            </Pressable>
          </View>
        </View>

        {/* Buy-in Amount Selection */}
        <View style={styles.configSection}>
          <Text style={styles.configLabel}>Buy-in Amount</Text>
          <View style={styles.buyInOptions}>
            {BUY_IN_OPTIONS.map((amount) => (
              <Pressable
                key={amount}
                style={[
                  styles.buyInOption,
                  selectedBuyIn === amount && styles.selectedBuyInOption,
                ]}
                onPress={() => updateBuyInAmount(amount)}>
                <Text
                  style={[
                    styles.buyInOptionText,
                    selectedBuyIn === amount && styles.selectedBuyInOptionText,
                  ]}>
                  ₹{amount.toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players</Text>
          <Text style={styles.sectionSubtitle}>
            Enter names for all {playerCount} players
          </Text>
          <Text style={styles.autoFillNote}>
            Names are pre-filled with famous poker players. Tap on a name to edit.
          </Text>
        </View>

        {players.map((player, index) => (
          <View key={player.id} style={styles.playerInput}>
            <View style={styles.playerNumberBadge}>
              <Text style={styles.playerNumber}>{index + 1}</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                player.isAutoFilled && styles.autoFilledInput
              ]}
              placeholder={`Player ${index + 1}`}
              placeholderTextColor="#aaaaaa"
              value={player.name}
              onChangeText={(text) => updatePlayerName(player.id, text)}
              onFocus={() => handlePlayerNameFocus(player.id)}
            />
            <View style={styles.buyInContainer}>
              <Text style={styles.buyInText}>₹{player.buyIn.toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  headerButton: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#767676',
    fontSize: 16,
    marginBottom: 4,
  },
  autoFillNote: {
    color: '#FF5A5F',
    fontSize: 14,
    fontStyle: 'italic',
  },
  configSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  configLabel: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  countSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  countValue: {
    color: '#484848',
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 24,
    minWidth: 30,
    textAlign: 'center',
  },
  buyInOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  buyInOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
    marginBottom: 8,
  },
  selectedBuyInOption: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  buyInOptionText: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedBuyInOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEEEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF5A5F',
    fontSize: 14,
  },
  playerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  playerNumber: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#484848',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  autoFilledInput: {
    fontStyle: 'italic',
    backgroundColor: '#f9f9f9',
    borderColor: '#FF5A5F',
    borderStyle: 'dashed',
  },
  buyInContainer: {
    marginLeft: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  buyInText: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '600',
  },
});