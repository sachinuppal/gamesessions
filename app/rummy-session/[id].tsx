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

type RummyPlayer = {
  id: string;
  session_id: string;
  name: string;
  score: number;
  is_eliminated: boolean;
  is_winner: boolean;
  created_at: string;
};

type RummySession = {
  id: string;
  created_at: string;
  ended_at: string | null;
  status: 'active' | 'completed';
  deleted_at: string | null;
  self_destructed: boolean;
  game_type: 'pool_101' | 'pool_201';
  player_count: number;
  entry_fee: number;
  current_round: number;
  prize_split: boolean;
};

type RoundScore = {
  id: string;
  session_id: string;
  player_id: string;
  round: number;
  score: number;
  created_at: string;
};

type ScoreInputModalProps = {
  visible: boolean;
  onClose: () => void;
  players: RummyPlayer[];
  round: number;
  onSave: (scores: Record<string, number>) => void;
  gameType: 'pool_101' | 'pool_201';
};

const ScoreInputModal = ({ 
  visible, 
  onClose, 
  players, 
  round, 
  onSave,
  gameType
}: ScoreInputModalProps) => {
  const [scores, setScores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize scores with empty strings
    const initialScores: Record<string, string> = {};
    players.forEach(player => {
      if (!player.is_eliminated) {
        initialScores[player.id] = '';
      }
    });
    setScores(initialScores);
    setError(null);
  }, [visible, players]);

  const handleSave = () => {
    // Validate scores
    const numericScores: Record<string, number> = {};
    let hasError = false;

    for (const [playerId, scoreStr] of Object.entries(scores)) {
      if (!scoreStr.trim()) {
        setError('Please enter scores for all players');
        hasError = true;
        break;
      }

      const score = parseInt(scoreStr, 10);
      if (isNaN(score)) {
        setError('All scores must be valid numbers');
        hasError = true;
        break;
      }

      if (score < 0) {
        setError('Scores cannot be negative');
        hasError = true;
        break;
      }

      numericScores[playerId] = score;
    }

    if (!hasError) {
      onSave(numericScores);
      onClose();
    }
  };

  const maxScore = gameType === 'pool_101' ? 101 : 201;

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
            <Text style={styles.modalTitle}>Round {round} Scores</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#484848" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.modalSubtitle}>
              Enter scores for each player. Players with scores over {maxScore} will be eliminated.
            </Text>

            {players.map(player => {
              if (player.is_eliminated) return null;
              
              return (
                <View key={player.id} style={styles.scoreInputRow}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <View style={styles.scoreInputContainer}>
                    <TextInput
                      style={styles.scoreInput}
                      keyboardType="number-pad"
                      value={scores[player.id]}
                      onChangeText={(text) => {
                        setScores(prev => ({
                          ...prev,
                          [player.id]: text
                        }));
                      }}
                      placeholder="0"
                      placeholderTextColor="#aaaaaa"
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>

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

type PrizeSplitModalProps = {
  visible: boolean;
  onClose: () => void;
  players: RummyPlayer[];
  totalPrize: number;
  onSave: () => void;
};

const PrizeSplitModal = ({ 
  visible, 
  onClose, 
  players, 
  totalPrize,
  onSave
}: PrizeSplitModalProps) => {
  const activePlayers = players.filter(p => !p.is_eliminated);
  
  // Only allow split if 3 or fewer players remain
  const canSplit = activePlayers.length <= 3;
  
  // Calculate prize distribution based on scores
  const calculatePrizes = () => {
    if (activePlayers.length === 0) return [];
    
    // Sort players by score (ascending - lower score is better)
    const sortedPlayers = [...activePlayers].sort((a, b) => a.score - b.score);
    
    if (sortedPlayers.length === 1) {
      // Single player gets everything
      return [{ player: sortedPlayers[0], amount: totalPrize }];
    } else if (sortedPlayers.length === 2) {
      // 60/40 split
      return [
        { player: sortedPlayers[0], amount: Math.round(totalPrize * 0.6) },
        { player: sortedPlayers[1], amount: Math.round(totalPrize * 0.4) }
      ];
    } else if (sortedPlayers.length === 3) {
      // 50/30/20 split
      return [
        { player: sortedPlayers[0], amount: Math.round(totalPrize * 0.5) },
        { player: sortedPlayers[1], amount: Math.round(totalPrize * 0.3) },
        { player: sortedPlayers[2], amount: Math.round(totalPrize * 0.2) }
      ];
    }
    
    return [];
  };
  
  const prizes = calculatePrizes();

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
            <Text style={styles.modalTitle}>Split Prize Pool</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#484848" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            {!canSplit ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  Prize can only be split when 3 or fewer players remain
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  The prize pool of ₹{totalPrize.toLocaleString()} will be split as follows:
                </Text>
                
                {prizes.map(({ player, amount }, index) => (
                  <View key={player.id} style={styles.prizeRow}>
                    <View style={styles.prizeInfo}>
                      <Text style={styles.prizeRank}>#{index + 1}</Text>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerScore}>({player.score} points)</Text>
                    </View>
                    <Text style={styles.prizeAmount}>₹{amount.toLocaleString()}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.saveButton, !canSplit && styles.disabledButton]} 
              onPress={onSave}
              disabled={!canSplit}>
              <Text style={styles.saveButtonText}>Confirm Split</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function RummySessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<RummySession | null>(null);
  const [players, setPlayers] = useState<RummyPlayer[]>([]);
  const [roundScores, setRoundScores] = useState<Record<number, Record<string, number>>>({});
  const [cumulativeScores, setCumulativeScores] = useState<Record<number, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [prizeSplitModalVisible, setPrizeSplitModalVisible] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    try {
      // Check if this device owns the session
      const ownershipStatus = await isSessionOwnedByDevice(id as string);
      setIsOwner(ownershipStatus);

      const { data: sessionData, error: sessionError } = await supabase
        .from('rummy_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      const { data: playersData, error: playersError } = await supabase
        .from('rummy_players')
        .select('*')
        .eq('session_id', id)
        .order('created_at');

      if (playersError) throw playersError;

      // Get round scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('rummy_round_scores')
        .select('*')
        .eq('session_id', id)
        .order('round');

      if (scoresError) throw scoresError;

      // Organize scores by round and player
      const scoresByRound: Record<number, Record<string, number>> = {};
      scoresData?.forEach(score => {
        if (!scoresByRound[score.round]) {
          scoresByRound[score.round] = {};
        }
        scoresByRound[score.round][score.player_id] = score.score;
      });

      // Calculate cumulative scores for each round
      const cumulativeByRound: Record<number, Record<string, number>> = {};
      
      // Get all rounds in ascending order
      const rounds = Object.keys(scoresByRound)
        .map(Number)
        .sort((a, b) => a - b);
      
      // For each player, calculate cumulative score up to each round
      playersData?.forEach(player => {
        let runningTotal = 0;
        
        rounds.forEach(round => {
          if (scoresByRound[round] && scoresByRound[round][player.id] !== undefined) {
            runningTotal += scoresByRound[round][player.id];
            
            if (!cumulativeByRound[round]) {
              cumulativeByRound[round] = {};
            }
            
            cumulativeByRound[round][player.id] = runningTotal;
          }
        });
      });

      setSession(sessionData);
      setPlayers(playersData || []);
      setRoundScores(scoresByRound);
      setCumulativeScores(cumulativeByRound);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const addRound = () => {
    if (!session) return;
    
    // Check if all active players have scores for the current round
    const currentRound = session.current_round;
    const activePlayers = players.filter(p => !p.is_eliminated);
    
    if (roundScores[currentRound]) {
      const playersWithScores = Object.keys(roundScores[currentRound]).length;
      if (playersWithScores < activePlayers.length) {
        setError('Please enter scores for all players in the current round first');
        return;
      }
    } else {
      setError('Please enter scores for the current round first');
      return;
    }
    
    setScoreModalVisible(true);
  };

  const saveRoundScores = async (scores: Record<string, number>) => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      const newRound = session.current_round + 1;
      const maxScore = session.game_type === 'pool_101' ? 101 : 201;
      
      // Insert round scores
      const roundScoreInserts = Object.entries(scores).map(([playerId, score]) => ({
        session_id: session.id,
        player_id: playerId,
        round: newRound,
        score: score
      }));
      
      const { error: scoresError } = await supabase
        .from('rummy_round_scores')
        .insert(roundScoreInserts);
        
      if (scoresError) throw scoresError;
      
      // Update player total scores and check for eliminations
      for (const [playerId, roundScore] of Object.entries(scores)) {
        const player = players.find(p => p.id === playerId);
        if (!player) continue;
        
        const newTotalScore = player.score + roundScore;
        const isEliminated = newTotalScore >= maxScore;
        
        const { error: playerError } = await supabase
          .from('rummy_players')
          .update({
            score: newTotalScore,
            is_eliminated: isEliminated
          })
          .eq('id', playerId);
          
        if (playerError) throw playerError;
      }
      
      // Update session current round
      const { error: sessionError } = await supabase
        .from('rummy_sessions')
        .update({ current_round: newRound })
        .eq('id', session.id);
        
      if (sessionError) throw sessionError;
      
      // Reload session data
      await loadSession();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save round scores');
    } finally {
      setUpdating(false);
    }
  };

  const handleSplitPrize = async () => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // Mark session as completed with prize split
      const { error: sessionError } = await supabase
        .from('rummy_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          prize_split: true
        })
        .eq('id', session.id);
        
      if (sessionError) {
        console.error("Error updating session:", sessionError);
        throw sessionError;
      }
      
      // Wait a moment before navigating to ensure the update is processed
      setTimeout(() => {
        router.replace(`/rummy-session/${session.id}/summary`);
      }, 500);
      
    } catch (err) {
      console.error("Split prize error:", err);
      setError(err instanceof Error ? err.message : 'Failed to split prize');
      setUpdating(false);
    }
  };

  const endGame = async () => {
    if (!session) return;
    
    // Check if there's only one player left
    const activePlayers = players.filter(p => !p.is_eliminated);
    
    if (activePlayers.length !== 1) {
      setError('Game can only end when there is exactly one player remaining');
      return;
    }
    
    setUpdating(true);
    setError(null);
    
    try {
      const winner = activePlayers[0];
      
      // First update the session status
      const { error: sessionError } = await supabase
        .from('rummy_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          prize_split: false
        })
        .eq('id', session.id);
        
      if (sessionError) {
        console.error("Error updating session:", sessionError);
        throw sessionError;
      }
      
      // Then mark the winner
      const { error: winnerError } = await supabase
        .from('rummy_players')
        .update({ is_winner: true })
        .eq('id', winner.id);
        
      if (winnerError) {
        console.error("Error marking winner:", winnerError);
        throw winnerError;
      }
      
      // Wait a moment before navigating
      setTimeout(() => {
        router.replace(`/rummy-session/${session.id}/summary`);
      }, 1000);
      
    } catch (err) {
      console.error("End game error:", err);
      setError(err instanceof Error ? err.message : 'Failed to end game');
      setUpdating(false);
    }
  };

  const confirmEndGame = () => {
    const activePlayers = players.filter(p => !p.is_eliminated);
    
    if (activePlayers.length !== 1) {
      setError('Game can only end when there is exactly one player remaining');
      return;
    }
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to end the game? ${activePlayers[0].name} will be declared the winner.`);
      if (confirmed) {
        endGame();
      }
    } else {
      Alert.alert(
        'End Game',
        `Are you sure you want to end the game? ${activePlayers[0].name} will be declared the winner.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'End Game',
            style: 'destructive',
            onPress: endGame,
          },
        ]
      );
    }
  };

  // Function to add scores for the current round
  const addScoresForCurrentRound = () => {
    if (!session) return;
    
    // Open the score input modal for the current round
    setScoreModalVisible(true);
  };

  // Function to save scores for the current round
  const saveCurrentRoundScores = async (scores: Record<string, number>) => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      const currentRound = session.current_round;
      const maxScore = session.game_type === 'pool_101' ? 101 : 201;
      
      // Insert round scores
      const roundScoreInserts = Object.entries(scores).map(([playerId, score]) => ({
        session_id: session.id,
        player_id: playerId,
        round: currentRound,
        score: score
      }));
      
      const { error: scoresError } = await supabase
        .from('rummy_round_scores')
        .insert(roundScoreInserts);
        
      if (scoresError) throw scoresError;
      
      // Update player total scores and check for eliminations
      for (const [playerId, roundScore] of Object.entries(scores)) {
        const player = players.find(p => p.id === playerId);
        if (!player) continue;
        
        const newTotalScore = player.score + roundScore;
        const isEliminated = newTotalScore >= maxScore;
        
        const { error: playerError } = await supabase
          .from('rummy_players')
          .update({
            score: newTotalScore,
            is_eliminated: isEliminated
          })
          .eq('id', playerId);
          
        if (playerError) throw playerError;
      }
      
      // Reload session data
      await loadSession();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save round scores');
    } finally {
      setUpdating(false);
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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
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

  const totalPrize = session.entry_fee * session.player_count;
  const activePlayers = players.filter(p => !p.is_eliminated);
  const eliminatedPlayers = players.filter(p => p.is_eliminated);
  const gameType = session.game_type === 'pool_101' ? 'Pool 101' : 'Pool 201';
  const maxScore = session.game_type === 'pool_101' ? 101 : 201;
  const canEndGame = activePlayers.length === 1;
  const canSplitPrize = activePlayers.length <= 3 && activePlayers.length > 0;
  
  // Check if scores for the current round exist
  const hasCurrentRoundScores = !!roundScores[session.current_round];

  return (
    <>
      <Stack.Screen
        options={{
          title: `Rummy Game - ${gameType}`,
          headerRight: () => (
            isOwner ? (
              <View style={styles.headerButtons}>
                <Pressable
                  onPress={() => setPrizeSplitModalVisible(true)}
                  disabled={updating || !canSplitPrize}
                  style={({ pressed }) => ({
                    opacity: (pressed || updating || !canSplitPrize) ? 0.7 : 1,
                    marginRight: 16,
                  })}>
                  <Text style={[
                    styles.headerButton, 
                    !canSplitPrize && styles.disabledHeaderButton
                  ]}>
                    Split
                  </Text>
                </Pressable>
                <Pressable
                  onPress={confirmEndGame}
                  disabled={updating || !canEndGame}
                  style={({ pressed }) => ({
                    opacity: (pressed || updating || !canEndGame) ? 0.7 : 1,
                  })}>
                  <Text style={[
                    styles.headerButton, 
                    !canEndGame && styles.disabledHeaderButton
                  ]}>
                    End
                  </Text>
                </Pressable>
              </View>
            ) : null
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.gameInfo}>
            <View style={styles.gameTypeContainer}>
              <Text style={styles.gameTypeLabel}>{gameType}</Text>
            </View>
            <Text style={styles.roundInfo}>Round {session.current_round}</Text>
          </View>
          <View style={styles.prizeInfo}>
            <Text style={styles.prizeLabel}>Prize Pool</Text>
            <Text style={styles.prizeAmount}>₹{totalPrize.toLocaleString()}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.playersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Players</Text>
            <Text style={styles.playerCount}>{activePlayers.length} of {players.length}</Text>
          </View>
          
          {activePlayers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No active players</Text>
            </View>
          ) : (
            activePlayers.map((player) => (
              <View key={player.id} style={styles.playerCard}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <View style={styles.scoreContainer}>
                    <Text style={[
                      styles.playerScore,
                      player.score > maxScore * 0.7 && styles.dangerScore
                    ]}>
                      {player.score} / {maxScore}
                    </Text>
                  </View>
                </View>
                <View style={styles.scoreProgress}>
                  <View 
                    style={[
                      styles.scoreProgressBar, 
                      { width: `${Math.min(100, (player.score / maxScore) * 100)}%` },
                      player.score > maxScore * 0.7 && styles.dangerProgressBar
                    ]} 
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {eliminatedPlayers.length > 0 && (
          <View style={styles.eliminatedSection}>
            <Text style={styles.sectionTitle}>Eliminated Players</Text>
            {eliminatedPlayers.map((player) => (
              <View key={player.id} style={[styles.playerCard, styles.eliminatedPlayerCard]}>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, styles.eliminatedPlayerName]}>{player.name}</Text>
                  <View style={styles.scoreContainer}>
                    <Text style={[styles.playerScore, styles.eliminatedPlayerScore]}>
                      {player.score} / {maxScore}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.roundsSection}>
          <Text style={styles.sectionTitle}>Rounds</Text>
          
          {Object.keys(roundScores).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No rounds played yet</Text>
            </View>
          ) : (
            Object.entries(roundScores)
              .sort(([roundA], [roundB]) => parseInt(roundB) - parseInt(roundA))
              .map(([round, scores]) => {
                const roundNum = parseInt(round);
                
                return (
                  <View key={round} style={styles.roundCard}>
                    <Text style={styles.roundTitle}>Round {round}</Text>
                    <View style={styles.roundScores}>
                      {Object.entries(scores).map(([playerId, score]) => {
                        const player = players.find(p => p.id === playerId);
                        if (!player) return null;
                        
                        // Get cumulative score for this player at this round
                        const cumulativeScore = cumulativeScores[roundNum]?.[playerId] || 0;
                        
                        return (
                          <View key={playerId} style={styles.roundScoreRow}>
                            <Text style={styles.roundPlayerName}>{player.name}</Text>
                            <View style={styles.scoreDetails}>
                              <Text style={styles.roundScore}>+{score}</Text>
                              <Text style={styles.cumulativeScore}>Total: {cumulativeScore}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
          )}
        </View>

        {isOwner && (
          <View style={styles.actionsSection}>
            {!hasCurrentRoundScores && session.current_round === 1 ? (
              <Pressable 
                style={[
                  styles.addRoundButton,
                  updating && styles.disabledButton
                ]}
                onPress={addScoresForCurrentRound}
                disabled={updating}>
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.addRoundButtonText}>
                  Add Round 1 Scores
                </Text>
              </Pressable>
            ) : (
              <Pressable 
                style={[
                  styles.addRoundButton,
                  updating && styles.disabledButton
                ]}
                onPress={() => setScoreModalVisible(true)}
                disabled={updating}>
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.addRoundButtonText}>
                  {Object.keys(roundScores).length === 0 ? 'Add First Round' : 'Add Next Round'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <ScoreInputModal
        visible={scoreModalVisible}
        onClose={() => setScoreModalVisible(false)}
        players={players}
        round={session?.current_round || 1}
        onSave={hasCurrentRoundScores ? saveRoundScores : saveCurrentRoundScores}
        gameType={session?.game_type || 'pool_101'}
      />

      <PrizeSplitModal
        visible={prizeSplitModalVisible}
        onClose={() => setPrizeSplitModalVisible(false)}
        players={players}
        totalPrize={totalPrize}
        onSave={handleSplitPrize}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledHeaderButton: {
    color: '#aaaaaa',
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
  playersSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
  },
  playerCount: {
    color: '#767676',
    fontSize: 14,
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
  playerCard: {
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
  eliminatedPlayerCard: {
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
  },
  eliminatedPlayerName: {
    color: '#767676',
    textDecorationLine: 'line-through',
  },
  scoreContainer: {
    backgroundColor: '#f7f7f7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  playerScore: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '600',
  },
  eliminatedPlayerScore: {
    color: '#767676',
  },
  dangerScore: {
    color: '#FF5A5F',
  },
  scoreProgress: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreProgressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  dangerProgressBar: {
    backgroundColor: '#FF5A5F',
  },
  eliminatedSection: {
    marginBottom: 24,
  },
  roundsSection: {
    marginBottom: 24,
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
  roundTitle: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  roundScores: {
    gap: 8,
  },
  roundScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundPlayerName: {
    color: '#484848',
    fontSize: 14,
  },
  scoreDetails: {
    alignItems: 'flex-end',
  },
  roundScore: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '600',
  },
  cumulativeScore: {
    color: '#767676',
    fontSize: 12,
    marginTop: 2,
  },
  roundPlayerScore: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsSection: {
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
  prizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  prizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prizeRank: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  playerScore: {
    color: '#767676',
    fontSize: 14,
    marginLeft: 8,
  },
  prizeAmount: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '600',
  },
});