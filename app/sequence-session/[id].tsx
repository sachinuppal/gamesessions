import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { isSessionOwnedByDevice } from '../../lib/deviceStorage';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { AppError, parseSupabaseError } from '../../lib/errorHandling';

type SequencePlayer = {
  id: string;
  session_id: string;
  name: string;
  team: 'blue' | 'green' | 'red';
  score: number;
  is_winner: boolean;
  created_at: string;
};

type SequenceSession = {
  id: string;
  created_at: string;
  ended_at: string | null;
  status: 'active' | 'completed';
  deleted_at: string | null;
  self_destructed: boolean;
  game_type: 'standard' | 'team';
  player_count: number;
  entry_fee: number;
  current_round: number;
};

type SequenceRound = {
  id: string;
  session_id: string;
  round_number: number;
  blue_score: number;
  green_score: number;
  red_score: number;
  created_at: string;
};

type ScoreInputModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (blueScore: number, greenScore: number, redScore: number, roundNumber: number) => void;
  roundNumber: number;
  hasRedTeam: boolean;
};

const ScoreInputModal = ({ 
  visible, 
  onClose, 
  onSave,
  roundNumber,
  hasRedTeam
}: ScoreInputModalProps) => {
  const [blueScore, setBlueScore] = useState<string>('');
  const [greenScore, setGreenScore] = useState<string>('');
  const [redScore, setRedScore] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setBlueScore('');
      setGreenScore('');
      setRedScore('');
      setError(null);
    }
  }, [visible]);

  const handleSave = () => {
    // Validate scores
    if (!blueScore.trim() || !greenScore.trim() || (hasRedTeam && !redScore.trim())) {
      setError('Please enter scores for all teams');
      return;
    }

    const blueScoreNum = parseInt(blueScore, 10);
    const greenScoreNum = parseInt(greenScore, 10);
    const redScoreNum = hasRedTeam ? parseInt(redScore, 10) : 0;

    if (isNaN(blueScoreNum) || isNaN(greenScoreNum) || (hasRedTeam && isNaN(redScoreNum))) {
      setError('Scores must be valid numbers');
      return;
    }

    onSave(blueScoreNum, greenScoreNum, redScoreNum, roundNumber);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Round {roundNumber} Scores
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#484848" />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.modalSubtitle}>
              Enter the number of sequences completed by each team in this round
            </Text>

            <View style={styles.scoreInputRow}>
              <View style={[styles.teamColorIndicator, { backgroundColor: '#1E88E5' }]} />
              <Text style={styles.teamLabel}>Blue Team</Text>
              <View style={styles.scoreInputContainer}>
                <TextInput
                  style={styles.scoreInput}
                  keyboardType="number-pad"
                  value={blueScore}
                  onChangeText={(text) => {
                    setBlueScore(text);
                    setError(null);
                  }}
                  placeholder="0"
                  placeholderTextColor="#aaaaaa"
                />
              </View>
            </View>

            <View style={styles.scoreInputRow}>
              <View style={[styles.teamColorIndicator, { backgroundColor: '#43A047' }]} />
              <Text style={styles.teamLabel}>Green Team</Text>
              <View style={styles.scoreInputContainer}>
                <TextInput
                  style={styles.scoreInput}
                  keyboardType="number-pad"
                  value={greenScore}
                  onChangeText={(text) => {
                    setGreenScore(text);
                    setError(null);
                  }}
                  placeholder="0"
                  placeholderTextColor="#aaaaaa"
                />
              </View>
            </View>

            {hasRedTeam && (
              <View style={styles.scoreInputRow}>
                <View style={[styles.teamColorIndicator, { backgroundColor: '#E53935' }]} />
                <Text style={styles.teamLabel}>Red Team</Text>
                <View style={styles.scoreInputContainer}>
                  <TextInput
                    style={styles.scoreInput}
                    keyboardType="number-pad"
                    value={redScore}
                    onChangeText={(text) => {
                      setRedScore(text);
                      setError(null);
                    }}
                    placeholder="0"
                    placeholderTextColor="#aaaaaa"
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.modalFooter}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Scores</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function SequenceSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SequenceSession | null>(null);
  const [players, setPlayers] = useState<SequencePlayer[]>([]);
  const [bluePlayers, setBluePlayers] = useState<SequencePlayer[]>([]);
  const [greenPlayers, setGreenPlayers] = useState<SequencePlayer[]>([]);
  const [redPlayers, setRedPlayers] = useState<SequencePlayer[]>([]);
  const [rounds, setRounds] = useState<SequenceRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [updating, setUpdating] = useState(false);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      setError(null);
      
      // Check if this device owns the session
      const ownershipStatus = await isSessionOwnedByDevice(id as string);
      setIsOwner(ownershipStatus);

      const { data: sessionData, error: sessionError } = await supabase
        .from('sequence_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      const { data: playersData, error: playersError } = await supabase
        .from('sequence_players')
        .select('*')
        .eq('session_id', id)
        .order('created_at');

      if (playersError) throw playersError;

      // Get rounds for this session
      const { data: roundsData, error: roundsError } = await supabase
        .from('sequence_rounds')
        .select('*')
        .eq('session_id', id)
        .order('round_number');

      if (roundsError) throw roundsError;

      setSession(sessionData);
      setPlayers(playersData || []);
      setBluePlayers(playersData?.filter(p => p.team === 'blue') || []);
      setGreenPlayers(playersData?.filter(p => p.team === 'green') || []);
      setRedPlayers(playersData?.filter(p => p.team === 'red') || []);
      setRounds(roundsData || []);
    } catch (err) {
      console.error('Error loading session:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const addRound = () => {
    if (!session) return;
    const nextRoundNumber = (session.current_round || 0) + 1;
    setScoreModalVisible(true);
  };

  const saveRoundScores = async (blueScore: number, greenScore: number, redScore: number, roundNumber: number) => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // Insert new round
      const { error: roundError } = await supabase
        .from('sequence_rounds')
        .insert({
          session_id: session.id,
          round_number: roundNumber,
          blue_score: blueScore,
          green_score: greenScore,
          red_score: redScore
        });
        
      if (roundError) throw roundError;
      
      // Update session current round
      const { error: sessionError } = await supabase
        .from('sequence_sessions')
        .update({ current_round: roundNumber })
        .eq('id', session.id);
        
      if (sessionError) throw sessionError;
      
      // Update player scores
      for (const player of bluePlayers) {
        const { error: playerError } = await supabase
          .from('sequence_players')
          .update({
            score: player.score + blueScore
          })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      for (const player of greenPlayers) {
        const { error: playerError } = await supabase
          .from('sequence_players')
          .update({
            score: player.score + greenScore
          })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      for (const player of redPlayers) {
        const { error: playerError } = await supabase
          .from('sequence_players')
          .update({
            score: player.score + redScore
          })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      // Reload session data
      await loadSession();
      
    } catch (err) {
      console.error('Error saving round scores:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdating(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // Calculate total scores for each team
      const blueTotal = bluePlayers.reduce((sum, player) => sum + player.score, 0);
      const greenTotal = greenPlayers.reduce((sum, player) => sum + player.score, 0);
      const redTotal = redPlayers.reduce((sum, player) => sum + player.score, 0);
      
      // Determine winning team
      let winningTeam: 'blue' | 'green' | 'red' = 'blue';
      
      if (greenTotal > blueTotal && greenTotal > redTotal) {
        winningTeam = 'green';
      } else if (redTotal > blueTotal && redTotal > greenTotal) {
        winningTeam = 'red';
      }
      
      // Update players
      for (const player of players) {
        const isWinner = player.team === winningTeam;
        
        const { error: playerError } = await supabase
          .from('sequence_players')
          .update({
            is_winner: isWinner
          })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      // Mark session as completed
      const { error: sessionError } = await supabase
        .from('sequence_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id);
        
      if (sessionError) throw sessionError;
      
      // Navigate to summary screen
      router.replace(`/sequence-session/${session.id}/summary`);
      
    } catch (err) {
      console.error('Error ending session:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdating(false);
    }
  };

  const confirmEndSession = () => {
    if (!session) return;
    
    if (rounds.length === 0) {
      setError(parseSupabaseError(new Error('Please add at least one round before ending the session')));
      return;
    }
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to end this sequence game?');
      if (confirmed) {
        endSession();
      }
    } else {
      Alert.alert(
        'End Sequence Game',
        'Are you sure you want to end this sequence game?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'End Game',
            style: 'destructive',
            onPress: endSession,
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorDisplay error={error} onRetry={loadSession} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  const gameTypeDisplay = session.game_type === 'standard' ? 'Standard' : 'Team Play';
  const totalPrize = session.entry_fee * session.player_count;
  
  // Calculate team scores
  const blueScore = bluePlayers.reduce((sum, player) => sum + player.score, 0);
  const greenScore = greenPlayers.reduce((sum, player) => sum + player.score, 0);
  const redScore = redPlayers.reduce((sum, player) => sum + player.score, 0);
  
  // Check if we have a red team
  const hasRedTeam = redPlayers.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Sequence Game',
          headerRight: () => (
            isOwner ? (
              <Pressable
                onPress={confirmEndSession}
                disabled={updating}
                style={({ pressed }) => ({
                  opacity: (pressed || updating) ? 0.7 : 1,
                })}>
                <Text style={styles.headerButton}>End</Text>
              </Pressable>
            ) : null
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.gameInfo}>
            <View style={styles.gameTypeContainer}>
              <Text style={styles.gameTypeLabel}>{gameTypeDisplay}</Text>
            </View>
            <Text style={styles.roundInfo}>Round {session.current_round || 0}</Text>
          </View>
          <View style={styles.prizeInfo}>
            <Text style={styles.prizeLabel}>Prize Pool</Text>
            <Text style={styles.prizeAmount}>₹{totalPrize.toLocaleString()}</Text>
          </View>
        </View>

        {!isOwner && (
          <View style={styles.notOwnerBanner}>
            <MaterialCommunityIcons name="information" size={20} color="#ffffff" />
            <Text style={styles.notOwnerText}>
              This session was created on another device. You can view it but only the creator can end it.
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.scoreboardContainer}>
          <Text style={styles.sectionTitle}>Current Score</Text>
          <View style={styles.scoreboardCard}>
            <View style={styles.teamScoreRow}>
              <View style={styles.teamInfo}>
                <View style={[styles.teamColorIndicator, { backgroundColor: '#1E88E5' }]} />
                <Text style={styles.teamName}>Blue Team</Text>
                <View style={styles.playerNames}>
                  {bluePlayers.map((player, index) => (
                    <Text key={player.id} style={styles.playerNameSmall}>
                      {player.name}{index < bluePlayers.length - 1 ? ', ' : ''}
                    </Text>
                  ))}
                </View>
              </View>
              <Text style={[
                styles.teamScore,
                blueScore > greenScore && blueScore > redScore ? styles.winningScore : {}
              ]}>
                {blueScore}
              </Text>
            </View>
            
            <View style={styles.scoreboardDivider} />
            
            <View style={styles.teamScoreRow}>
              <View style={styles.teamInfo}>
                <View style={[styles.teamColorIndicator, { backgroundColor: '#43A047' }]} />
                <Text style={styles.teamName}>Green Team</Text>
                <View style={styles.playerNames}>
                  {greenPlayers.map((player, index) => (
                    <Text key={player.id} style={styles.playerNameSmall}>
                      {player.name}{index < greenPlayers.length - 1 ? ', ' : ''}
                    </Text>
                  ))}
                </View>
              </View>
              <Text style={[
                styles.teamScore,
                greenScore > blueScore && greenScore > redScore ? styles.winningScore : {}
              ]}>
                {greenScore}
              </Text>
            </View>
            
            {hasRedTeam && (
              <>
                <View style={styles.scoreboardDivider} />
                
                <View style={styles.teamScoreRow}>
                  <View style={styles.teamInfo}>
                    <View style={[styles.teamColorIndicator, { backgroundColor: '#E53935' }]} />
                    <Text style={styles.teamName}>Red Team</Text>
                    <View style={styles.playerNames}>
                      {redPlayers.map((player, index) => (
                        <Text key={player.id} style={styles.playerNameSmall}>
                          {player.name}{index < redPlayers.length - 1 ? ', ' : ''}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <Text style={[
                    styles.teamScore,
                    redScore > blueScore && redScore > greenScore ? styles.winningScore : {}
                  ]}>
                    {redScore}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.roundsSection}>
          <Text style={styles.sectionTitle}>Rounds</Text>
          
          {rounds.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No rounds played yet</Text>
            </View>
          ) : (
            rounds.map((round) => (
              <View key={round.id} style={styles.roundCard}>
                <View style={styles.roundHeader}>
                  <Text style={styles.roundTitle}>Round {round.round_number}</Text>
                </View>
                <View style={styles.roundScores}>
                  <View style={styles.roundScoreRow}>
                    <View style={styles.roundTeamInfo}>
                      <View style={[styles.teamColorIndicator, { backgroundColor: '#1E88E5' }]} />
                      <Text style={styles.roundTeamName}>Blue Team</Text>
                    </View>
                    <Text style={styles.roundScore}>{round.blue_score}</Text>
                  </View>
                  <View style={styles.roundScoreRow}>
                    <View style={styles.roundTeamInfo}>
                      <View style={[styles.teamColorIndicator, { backgroundColor: '#43A047' }]} />
                      <Text style={styles.roundTeamName}>Green Team</Text>
                    </View>
                    <Text style={styles.roundScore}>{round.green_score}</Text>
                  </View>
                  {hasRedTeam && (
                    <View style={styles.roundScoreRow}>
                      <View style={styles.roundTeamInfo}>
                        <View style={[styles.teamColorIndicator, { backgroundColor: '#E53935' }]} />
                        <Text style={styles.roundTeamName}>Red Team</Text>
                      </View>
                      <Text style={styles.roundScore}>{round.red_score}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {isOwner && (
          <View style={styles.actionsSection}>
            <Pressable 
              style={[
                styles.addRoundButton,
                updating && styles.disabledButton
              ]}
              onPress={addRound}
              disabled={updating}>
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addRoundButtonText}>
                Add New Round
              </Text>
            </Pressable>
            
            <Pressable 
              style={[
                styles.endGameButton,
                updating && styles.disabledButton
              ]}
              onPress={confirmEndSession}
              disabled={updating}>
              <MaterialCommunityIcons name="flag-checkered" size={20} color="#ffffff" />
              <Text style={styles.endGameButtonText}>End Game</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ScoreInputModal
        visible={scoreModalVisible}
        onClose={() => setScoreModalVisible(false)}
        onSave={saveRoundScores}
        roundNumber={(session?.current_round || 0) + 1}
        hasRedTeam={hasRedTeam}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
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
  headerButton: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gameInfo: {
    flex: 1,
  },
  gameTypeContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  gameTypeLabel: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '600',
  },
  roundInfo: {
    color: '#767676',
    fontSize: 16,
  },
  prizeInfo: {
    alignItems: 'flex-end',
  },
  prizeLabel: {
    color: '#767676',
    fontSize: 14,
    marginBottom: 4,
  },
  prizeAmount: {
    color: '#FF5A5F',
    fontSize: 20,
    fontWeight: '600',
  },
  notOwnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#767676',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  notOwnerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  scoreboardContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  scoreboardCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  teamScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  teamColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  teamName: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  playerNames: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  playerNameSmall: {
    color: '#767676',
    fontSize: 12,
  },
  teamScore: {
    color: '#484848',
    fontSize: 24,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  winningScore: {
    color: '#008489',
  },
  scoreboardDivider: {
    height: 1,
    backgroundColor: '#e4e4e4',
    marginVertical: 8,
  },
  roundsSection: {
    marginBottom: 24,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    color: '#767676',
    fontSize: 16,
  },
  roundCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roundHeader: {
    marginBottom: 12,
  },
  roundTitle: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  roundScores: {
    gap: 8,
  },
  roundScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundTeamName: {
    color: '#767676',
    fontSize: 14,
  },
  roundScore: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsSection: {
    gap: 12,
    marginBottom: 32,
  },
  addRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addRoundButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  endGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008489',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  endGameButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e4',
  },
  modalTitle: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalSubtitle: {
    color: '#767676',
    fontSize: 14,
    marginBottom: 16,
  },
  scoreInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamLabel: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  scoreInputContainer: {
    width: 100,
  },
  scoreInput: {
    height: 48,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#484848',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e4e4e4',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  cancelButtonText: {
    color: '#767676',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF5A5F',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});