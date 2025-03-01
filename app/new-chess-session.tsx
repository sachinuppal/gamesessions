import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getRandomChessPlayers } from '../lib/chessPlayers';
import { markSessionAsOwned } from '../lib/deviceStorage';

const ENTRY_FEE_OPTIONS = [100, 250, 500, 1000, 2000, 5000, 10000];
const TIME_CONTROL_OPTIONS = [
  { label: 'Bullet (1+0)', value: '1+0' },
  { label: 'Blitz (3+2)', value: '3+2' },
  { label: 'Blitz (5+0)', value: '5+0' },
  { label: 'Rapid (10+0)', value: '10+0' },
  { label: 'Rapid (15+10)', value: '15+10' },
  { label: 'Classical (30+0)', value: '30+0' },
  { label: 'Classical (60+30)', value: '60+30' },
];

export default function NewChessSessionScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  
  // Game configuration
  const [gameType, setGameType] = useState<'standard' | 'rapid' | 'blitz'>('standard');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [entryFee, setEntryFee] = useState<number>(500);
  const [timeControl, setTimeControl] = useState<string>('15+10');
  const [players, setPlayers] = useState<Array<{ id: string; name: string; isAutoFilled: boolean; color?: 'white' | 'black' }>>([]);
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize players with auto-filled names
  useEffect(() => {
    initializePlayers(playerCount);
  }, []);

  const initializePlayers = (count: number) => {
    const randomNames = getRandomChessPlayers(count);
    const newPlayers = Array.from({ length: count }, (_, i) => ({
      id: String(i + 1),
      name: randomNames[i],
      isAutoFilled: true,
      color: i === 0 ? 'white' : i === 1 ? 'black' : undefined
    }));
    setPlayers(newPlayers);
  };

  const updatePlayerCount = (count: number) => {
    if (count < 2) count = 2;
    if (count > 8) count = 8;
    
    setPlayerCount(count);
    
    // Update players array based on new count
    if (count > players.length) {
      // Add more players with auto-filled names
      const additionalCount = count - players.length;
      const randomNames = getRandomChessPlayers(additionalCount);
      
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

  const updatePlayerColor = (id: string, color: 'white' | 'black' | undefined) => {
    // If assigning a color to a player, remove that color from any other player
    if (color) {
      setPlayers(
        players.map((player) => {
          if (player.id === id) {
            return { ...player, color };
          } else if (player.color === color) {
            return { ...player, color: undefined };
          }
          return player;
        })
      );
    } else {
      // Just remove the color from this player
      setPlayers(
        players.map((player) =>
          player.id === id ? { ...player, color } : player
        )
      );
    }
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

      // For 2-player games, ensure both white and black are assigned
      if (playerCount === 2) {
        const whitePlayer = players.find(p => p.color === 'white');
        const blackPlayer = players.find(p => p.color === 'black');
        
        if (!whitePlayer || !blackPlayer) {
          throw new Error('For 2-player games, one player must be white and one must be black');
        }
      }

      // Create chess session
      const { data: session, error: sessionError } = await supabase
        .from('chess_sessions')
        .insert({
          game_type: gameType,
          player_count: playerCount,
          entry_fee: entryFee,
          time_control: timeControl,
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create players
      const { error: playersError } = await supabase
        .from('chess_players')
        .insert(
          players.map(player => ({
            session_id: session.id,
            name: player.name,
            color: player.color || null,
            score: 0,
            is_winner: false
          }))
        );

      if (playersError) throw playersError;

      // Mark this session as owned by this device
      await markSessionAsOwned(session.id);

      // Navigate back with notification parameter if redirect is true
      if (redirect === 'true') {
        router.replace({
          pathname: '/chess',
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
          title: 'New Chess Game',
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
            Configure your chess game
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
                gameType === 'standard' && styles.selectedGameTypeOption,
              ]}
              onPress={() => setGameType('standard')}>
              <Text
                style={[
                  styles.gameTypeOptionText,
                  gameType === 'standard' && styles.selectedGameTypeOptionText,
                ]}>
                Standard
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.gameTypeOption,
                gameType === 'rapid' && styles.selectedGameTypeOption,
              ]}
              onPress={() => setGameType('rapid')}>
              <Text
                style={[
                  styles.gameTypeOptionText,
                  gameType === 'rapid' && styles.selectedGameTypeOptionText,
                ]}>
                Rapid
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.gameTypeOption,
                gameType === 'blitz' && styles.selectedGameTypeOption,
              ]}
              onPress={() => setGameType('blitz')}>
              <Text
                style={[
                  styles.gameTypeOptionText,
                  gameType === 'blitz' && styles.selectedGameTypeOptionText,
                ]}>
                Blitz
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Time Control Selection */}
        <View style={styles.configSection}>
          <Text style={styles.configLabel}>Time Control</Text>
          <View style={styles.timeControlOptions}>
            {TIME_CONTROL_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.timeControlOption,
                  timeControl === option.value && styles.selectedTimeControlOption,
                ]}
                onPress={() => setTimeControl(option.value)}>
                <Text
                  style={[
                    styles.timeControlOptionText,
                    timeControl === option.value && styles.selectedTimeControlOptionText,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Player Count Selection */}
        <View style={styles.configSection}>
          <Text style={styles.configLabel}>Number of Players</Text>
          <View style={styles.countSelector}>
            <Pressable 
              style={styles.countButton}
              onPress={() => updatePlayerCount(playerCount - 1)}
              disabled={playerCount <= 2}>
              <MaterialCommunityIcons 
                name="minus" 
                size={24} 
                color={playerCount <= 2 ? "#aaaaaa" : "#FF5A5F"} 
              />
            </Pressable>
            <Text style={styles.countValue}>{playerCount}</Text>
            <Pressable 
              style={styles.countButton}
              onPress={() => updatePlayerCount(playerCount + 1)}
              disabled={playerCount >= 8}>
              <MaterialCommunityIcons 
                name="plus" 
                size={24} 
                color={playerCount >= 8 ? "#aaaaaa" : "#FF5A5F"} 
              />
            </Pressable>
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
            Names are pre-filled with famous chess players. Tap on a name to edit.
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
            {playerCount === 2 && (
              <View style={styles.colorSelector}>
                <Pressable
                  style={[
                    styles.colorOption,
                    player.color === 'white' && styles.selectedColorOption,
                    { backgroundColor: '#f0f0f0' }
                  ]}
                  onPress={() => updatePlayerColor(player.id, player.color === 'white' ? undefined : 'white')}>
                  <Text style={[
                    styles.colorOptionText,
                    { color: '#484848' }
                  ]}>W</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.colorOption,
                    player.color === 'black' && styles.selectedColorOption,
                    { backgroundColor: '#484848' }
                  ]}
                  onPress={() => updatePlayerColor(player.id, player.color === 'black' ? undefined : 'black')}>
                  <Text style={[
                    styles.colorOptionText,
                    { color: '#f0f0f0' }
                  ]}>B</Text>
                </Pressable>
              </View>
            )}
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
  timeControlOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeControlOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
    marginBottom: 8,
  },
  selectedTimeControlOption: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  timeControlOptionText: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTimeControlOptionText: {
    color: '#ffffff',
    fontWeight: '600',
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
  colorSelector: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#FF5A5F',
  },
  colorOptionText: {
    fontSize: 14,
    fontWeight: '600',
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