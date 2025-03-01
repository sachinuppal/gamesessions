import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getRandomSequencePlayers } from '../lib/sequencePlayers';
import { markSessionAsOwned } from '../lib/deviceStorage';

const ENTRY_FEE_OPTIONS = [100, 250, 500, 1000, 2000, 5000, 10000];
const PLAYER_COUNT_OPTIONS = [2, 3, 6, 9, 12];

export default function NewSequenceSessionScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  
  // Game configuration
  const [gameType, setGameType] = useState<'standard' | 'team'>('team');
  const [playerCount, setPlayerCount] = useState<number>(6);
  const [entryFee, setEntryFee] = useState<number>(500);
  const [players, setPlayers] = useState<Array<{ id: string; name: string; isAutoFilled: boolean; team: 'blue' | 'green' | 'red' }>>([]);
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize players with auto-filled names
  useEffect(() => {
    initializePlayers(playerCount);
  }, []);

  const initializePlayers = (count: number) => {
    const randomNames = getRandomSequencePlayers(count);
    
    // Distribute players evenly among teams
    const teamsCount = 3; // blue, green, red
    const newPlayers = Array.from({ length: count }, (_, i) => {
      let team: 'blue' | 'green' | 'red';
      
      // Distribute players evenly among teams
      if (i % teamsCount === 0) team = 'blue';
      else if (i % teamsCount === 1) team = 'green';
      else team = 'red';
      
      return {
        id: String(i + 1),
        name: randomNames[i],
        isAutoFilled: true,
        team
      };
    });
    
    setPlayers(newPlayers);
  };

  const updatePlayerCount = (count: number) => {
    setPlayerCount(count);
    initializePlayers(count);
  };

  const updatePlayerName = (id: string, name: string) => {
    setPlayers(
      players.map((player) =>
        player.id === id ? { ...player, name, isAutoFilled: false } : player
      )
    );
  };

  const updatePlayerTeam = (id: string, team: 'blue' | 'green' | 'red') => {
    setPlayers(
      players.map((player) =>
        player.id === id ? { ...player, team } : player
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

      // Validate team distribution
      const blueTeam = players.filter(p => p.team === 'blue');
      const greenTeam = players.filter(p => p.team === 'green');
      const redTeam = players.filter(p => p.team === 'red');
      
      if (blueTeam.length === 0 || greenTeam.length === 0) {
        throw new Error('You need at least one player in each of the blue and green teams');
      }

      // Create sequence session
      const { data: session, error: sessionError } = await supabase
        .from('sequence_sessions')
        .insert({
          game_type: gameType,
          player_count: playerCount,
          entry_fee: entryFee,
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create players
      const { error: playersError } = await supabase
        .from('sequence_players')
        .insert(
          players.map(player => ({
            session_id: session.id,
            name: player.name,
            team: player.team,
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
          pathname: '/sequence',
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
          title: 'New Sequence Game',
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
            Configure your sequence game
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
                gameType === 'team' && styles.selectedGameTypeOption,
              ]}
              onPress={() => setGameType('team')}>
              <Text
                style={[
                  styles.gameTypeOptionText,
                  gameType === 'team' && styles.selectedGameTypeOptionText,
                ]}>
                Team Play
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
            Names are pre-filled with famous board game players. Tap on a name to edit.
          </Text>
        </View>

        {/* Team sections */}
        <View style={styles.teamsContainer}>
          {/* Blue Team */}
          <View style={[styles.teamSection, { borderColor: '#1E88E5' }]}>
            <View style={[styles.teamHeader, { backgroundColor: '#1E88E5' }]}>
              <Text style={styles.teamTitle}>Blue Team</Text>
            </View>
            {players.filter(p => p.team === 'blue').map((player, index) => (
              <View key={player.id} style={styles.playerInput}>
                <View style={[styles.playerNumberBadge, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={[styles.playerNumber, { color: '#1E88E5' }]}>{index + 1}</Text>
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
                <Pressable
                  style={styles.teamChangeButton}
                  onPress={() => updatePlayerTeam(player.id, 'green')}>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#43A047" />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Green Team */}
          <View style={[styles.teamSection, { borderColor: '#43A047' }]}>
            <View style={[styles.teamHeader, { backgroundColor: '#43A047' }]}>
              <Text style={styles.teamTitle}>Green Team</Text>
            </View>
            {players.filter(p => p.team === 'green').map((player, index) => (
              <View key={player.id} style={styles.playerInput}>
                <Pressable
                  style={styles.teamChangeButton}
                  onPress={() => updatePlayerTeam(player.id, 'blue')}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color="#1E88E5" />
                </Pressable>
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
                <Pressable
                  style={styles.teamChangeButton}
                  onPress={() => updatePlayerTeam(player.id, 'red')}>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#E53935" />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Red Team */}
          <View style={[styles.teamSection, { borderColor: '#E53935' }]}>
            <View style={[styles.teamHeader, { backgroundColor: '#E53935' }]}>
              <Text style={styles.teamTitle}>Red Team</Text>
            </View>
            {players.filter(p => p.team === 'red').map((player, index) => (
              <View key={player.id} style={styles.playerInput}>
                <Pressable
                  style={styles.teamChangeButton}
                  onPress={() => updatePlayerTeam(player.id, 'green')}>
                  <MaterialCommunityIcons name="arrow-left" size={20} color="#43A047" />
                </Pressable>
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
                <View style={styles.teamChangeButton} />
              </View>
            ))}
          </View>
        </View>

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
    flexWrap: 'wrap',
    gap: 8,
  },
  playerCountOption: {
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
  selectedPlayerCountOption: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  playerCountOptionText: {
    color: '#484848',
    fontSize: 14,
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
  teamsContainer: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 24,
  },
  teamSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  teamHeader: {
    padding: 12,
    alignItems: 'center',
  },
  teamTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  playerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  playerNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  playerNumber: {
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
  teamChangeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
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