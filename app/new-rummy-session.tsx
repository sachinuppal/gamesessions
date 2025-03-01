import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getRandomRummyPlayers } from '../lib/rummyPlayers';
import { markSessionAsOwned } from '../lib/deviceStorage';

const ENTRY_FEE_OPTIONS = [100, 250, 500, 1000, 2000, 5000, 10000];
const PLAYER_COUNT_OPTIONS = [2, 6];

export default function NewRummySessionScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  
  // Game configuration
  const [gameType, setGameType] = useState<'pool_101' | 'pool_201'>('pool_101');
  const [playerCount, setPlayerCount] = useState<number>(6);
  const [entryFee, setEntryFee] = useState<number>(500);
  const [players, setPlayers] = useState<Array<{ id: string; name: string; isAutoFilled: boolean }>>([]);
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize players with auto-filled names
  useEffect(() => {
    initializePlayers(playerCount);
  }, []);

  const initializePlayers = (count: number) => {
    const randomNames = getRandomRummyPlayers(count);
    const newPlayers = Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      name: randomNames[i],
      isAutoFilled: true
    }));
    setPlayers(newPlayers);
  };

  const updatePlayerCount = (count: number) => {
    setPlayerCount(count);
    
    // Update players array based on new count
    if (count > players.length) {
      // Add more players with auto-filled names
      const additionalCount = count - players.length;
      const randomNames = getRandomRummyPlayers(additionalCount);
      
      setPlayers([
        ...players,
        ...Array.from({ length: additionalCount }, (_, i) => ({
          id: String(players.length + i + 1),
          name: randomNames[i],
          isAutoFilled: true
        }))
      ]);
    } else if (count < players.length) {
      // Remove excess players
      setPlayers(players.slice(0, count));
    }
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
    if ( player && player.isAutoFilled) {
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

      // Create rummy session
      const { data: session, error: sessionError } = await supabase
        .from('rummy_sessions')
        .insert({
          game_type: gameType,
          player_count: playerCount,
          entry_fee: entryFee,
          current_round: 1,
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create players
      const { error: playersError } = await supabase
        .from('rummy_players')
        .insert(
          players.map(player => ({
            session_id: session.id,
            name: player.name,
            score: 0,
            is_eliminated: false,
            is_winner: false
          }))
        );

      if (playersError) throw playersError;

      // Mark this session as owned by this device
      await markSessionAsOwned(session.id);

      // Navigate back with notification parameter if redirect is true
      if (redirect === 'true') {
        router.replace({
          pathname: '/rummy',
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
          title: 'New Rummy Game',
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
          <Text style={styles.sectionTitle}>Game Setup</Text>
          <Text style={styles.sectionSubtitle}>
            Configure your rummy game
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Game Type Selection */}
        <View style={styles.configSection}>
          <Text style={styles.configLabel}>Game Type</Text>
          <View style={styles.gameTypeOptions}>
            <Pressable
              style={[
                styles.gameTypeOption,
                gameType === 'pool_101' && styles.selectedGameTypeOption,
              ]}
              onPress={() => setGameType('pool_101')}>
              <Text
                style={[
                  styles.gameTypeOptionText,
                  gameType === 'pool_101' && styles.selectedGameTypeOptionText,
                ]}>
                Pool 101
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.gameTypeOption,
                gameType === 'pool_201' && styles.selectedGameTypeOption,
              ]}
              onPress={() => setGameType('pool_201')}>
              <Text
                style={[
                  styles.gameTypeOptionText,
                  gameType === 'pool_201' && styles.selectedGameTypeOptionText,
                ]}>
                Pool 201
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Player Count Selection */}
        <View style={styles.configSection}>
          <Text style={styles.configLabel}>Number of Players</Text>
          <View style={styles.playerCountOptions}>
            {PLAYER_COUNT_OPTIONS.map((count) => (
              <Pressable
                key={count}
                style={[
                  styles.playerCountOption,
                  playerCount === count && styles.selectedPlayerCountOption,
                ]}
                onPress={() => updatePlayerCount(count)}>
                <Text
                  style={[
                    styles.playerCountOptionText,
                    playerCount === count && styles.selectedPlayerCountOptionText,
                  ]}>
                  {count} Players
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Entry Fee Selection */}
        <View style={styles.configSection}>
          <Text style={styles.configLabel}>Entry Fee</Text>
          <View style={styles.entryFeeOptions}>
            {ENTRY_FEE_OPTIONS.map((fee) => (
              <Pressable
                key={fee}
                style={[
                  styles.entryFeeOption,
                  entryFee === fee && styles.selectedEntryFeeOption,
                ]}
                onPress={() => setEntryFee(fee)}>
                <Text
                  style={[
                    styles.entryFeeOptionText,
                    entryFee === fee && styles.selectedEntryFeeOptionText,
                  ]}>
                  ₹{fee.toLocaleString()}
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
            Names are pre-filled with famous Indian rummy players. Tap on a name to edit.
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
          </View>
        ))}

        <View style={styles.prizePoolContainer}>
          <Text style={styles.prizePoolTitle}>Total Prize Pool</Text>
          <Text style={styles.prizePoolAmount}>₹{(entryFee * playerCount).toLocaleString()}</Text>
        </View>
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
  gameTypeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  gameTypeOption: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  selectedGameTypeOption: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  gameTypeOptionText: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedGameTypeOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  playerCountOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  playerCountOption: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  selectedPlayerCountOption: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  playerCountOptionText: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedPlayerCountOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  entryFeeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryFeeOption: {
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
  selectedEntryFeeOption: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  entryFeeOptionText: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedEntryFeeOptionText: {
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
  prizePoolContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  prizePoolTitle: {
    color: '#767676',
    fontSize: 16,
    marginBottom: 8,
  },
  prizePoolAmount: {
    color: '#FF5A5F',
    fontSize: 24,
    fontWeight: '600',
  },
});