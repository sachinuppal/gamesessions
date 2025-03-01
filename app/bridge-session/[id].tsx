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

type BridgePlayer = {
  id: string;
  session_id: string;
  name: string;
  team: 'NS' | 'EW';
  score: number;
  is_winner: boolean;
  created_at: string;
};

type BridgeSession = {
  id: string;
  created_at: string;
  ended_at: string | null;
  status: 'active' | 'completed';
  deleted_at: string | null;
  self_destructed: boolean;
  game_type: 'rubber' | 'duplicate';
  player_count: number;
  entry_fee: number;
  current_deal: number;
};

type ScoreInputModalProps = {
  visible: boolean;
  onClose: () => void;
  gameType: 'rubber' | 'duplicate';
  onSave: (nsScore: number, ewScore: number, dealNumber: number) => void;
  dealNumber: number;
};

const ScoreInputModal = ({ 
  visible, 
  onClose, 
  gameType,
  onSave,
  dealNumber
}: ScoreInputModalProps) => {
  const [nsScore, setNsScore] = useState<string>('');
  const [ewScore, setEwScore] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNsScore('');
      setEwScore('');
      setError(null);
    }
  }, [visible]);

  const handleSave = () => {
    // Validate scores
    if (!nsScore.trim() || !ewScore.trim()) {
      setError('Please enter scores for both teams');
      return;
    }

    const nsScoreNum = parseInt(nsScore, 10);
    const ewScoreNum = parseInt(ewScore, 10);

    if (isNaN(nsScoreNum) || isNaN(ewScoreNum)) {
      setError('Scores must be valid numbers');
      return;
    }

    onSave(nsScoreNum, ewScoreNum, dealNumber);
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
              {gameType === 'rubber' ? 'Rubber Score' : 'Deal Score'} - #{dealNumber}
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
              Enter scores for both teams
            </Text>

            <View style={styles.scoreInputRow}>
              <Text style={styles.teamLabel}>North-South</Text>
              <View style={styles.scoreInputContainer}>
                <TextInput
                  style={styles.scoreInput}
                  keyboardType="number-pad"
                  value={nsScore}
                  onChangeText={(text) => {
                    setNsScore(text);
                    setError(null);
                  }}
                  placeholder="0"
                  placeholderTextColor="#aaaaaa"
                />
              </View>
            </View>

            <View style={styles.scoreInputRow}>
              <Text style={styles.teamLabel}>East-West</Text>
              <View style={styles.scoreInputContainer}>
                <TextInput
                  style={styles.scoreInput}
                  keyboardType="number-pad"
                  value={ewScore}
                  onChangeText={(text) => {
                    setEwScore(text);
                    setError(null);
                  }}
                  placeholder="0"
                  placeholderTextColor="#aaaaaa"
                />
              </View>
            </View>
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

export default function BridgeSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<BridgeSession | null>(null);
  const [players, setPlayers] = useState<BridgePlayer[]>([]);
  const [nsPlayers, setNsPlayers] = useState<BridgePlayer[]>([]);
  const [ewPlayers, setEwPlayers] = useState<BridgePlayer[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
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
        .from('bridge_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      const { data: playersData, error: playersError } = await supabase
        .from('bridge_players')
        .select('*')
        .eq('session_id', id)
        .order('created_at');

      if (playersError) throw playersError;

      // Get deals for this session
      const { data: dealsData, error: dealsError } = await supabase
        .from('bridge_deals')
        .select('*')
        .eq('session_id', id)
        .order('deal_number');

      if (dealsError) throw dealsError;

      setSession(sessionData);
      setPlayers(playersData || []);
      setNsPlayers(playersData?.filter(p => p.team === 'NS') || []);
      setEwPlayers(playersData?.filter(p => p.team === 'EW') || []);
      setDeals(dealsData || []);
    } catch (err) {
      console.error('Error loading session:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const addDeal = () => {
    if (!session) return;
    const nextDealNumber = (session.current_deal || 0) + 1;
    setScoreModalVisible(true);
  };

  const saveScore = async (nsScore: number, ewScore: number, dealNumber: number) => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // Insert new deal
      const { error: dealError } = await supabase
        .from('bridge_deals')
        .insert({
          session_id: session.id,
          deal_number: dealNumber,
          ns_score: nsScore,
          ew_score: ewScore
        });
        
      if (dealError) throw dealError;
      
      // Update session current deal
      const { error: sessionError } = await supabase
        .from('bridge_sessions')
        .update({ current_deal: dealNumber })
        .eq('id', session.id);
        
      if (sessionError) throw sessionError;
      
      // Update player scores
      for (const player of nsPlayers) {
        const { error: playerError } = await supabase
          .from('bridge_players')
          .update({
            score: player.score + nsScore
          })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      for (const player of ewPlayers) {
        const { error: playerError } = await supabase
          .from('bridge_players')
          .update({
            score: player.score + ewScore
          })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      // Reload session data
      await loadSession();
      
    } catch (err) {
      console.error('Error saving score:', err);
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
      const nsTotal = nsPlayers.reduce((sum, player) => sum + player.score, 0);
      const ewTotal = ewPlayers.reduce((sum, player) => sum + player.score, 0);
      
      // Determine winners
      const nsWins = nsTotal > ewTotal;
      
      // Update NS players
      for (const player of nsPlayers) {
        const { error: playerError } = await supabase
          .from('bridge_players')
          .update({
            is_winner: nsWins
          })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      // Update EW players
      for (const player of ewPlayers) {
        const { error: playerError } = await supabase
          .from('bridge_players')
          .update({
            is_winner: !nsWins
          })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      // Mark session as completed
      const { error: sessionError } = await supabase
        .from('bridge_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id);
        
      if (sessionError) throw sessionError;
      
      // Navigate to summary screen
      router.replace(`/bridge-session/${session.id}/summary`);
      
    } catch (err) {
      console.error('Error ending session:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdating(false);
    }
  };

  const confirmEndSession = () => {
    if (!session) return;
    
    if (deals.length === 0) {
      setError(parseSupabaseError(new Error('Please add at least one deal before ending the session')));
      return;
    }
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to end this bridge game?');
      if (confirmed) {
        endSession();
      }
    } else {
      Alert.alert(
        'End Bridge Game',
        'Are you sure you want to end this bridge game?',
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

  const gameTypeDisplay = session.game_type === 'rubber' ? 'Rubber Bridge' : 'Duplicate Bridge';
  const totalPrize = session.entry_fee * session.player_count;
  
  // Calculate team scores
  const nsScore = nsPlayers.reduce((sum, player) => sum + player.score, 0);
  const ewScore = ewPlayers.reduce((sum, player) => sum + player.score, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Bridge Game',
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
            <Text style={styles.dealInfo}>Deal {session.current_deal || 0}</Text>
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
                <Text style={styles.teamName}>North-South</Text>
                <View style={styles.playerNames}>
                  {nsPlayers.map((player, index) => (
                    <Text key={player.id} style={styles.playerNameSmall}>
                      {player.name}{index < nsPlayers.length - 1 ? ' & ' : ''}
                    </Text>
                  ))}
                </View>
              </View>
              <Text style={[
                styles.teamScore,
                nsScore > ewScore ? styles.winningScore : (nsScore < ewScore ? styles.losingScore : {})
              ]}>
                {nsScore}
              </Text>
            </View>
            
            <View style={styles.scoreboardDivider} />
            
            <View style={styles.teamScoreRow}>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>East-West</Text>
                <View style={styles.playerNames}>
                  {ewPlayers.map((player, index) => (
                    <Text key={player.id} style={styles.playerNameSmall}>
                      {player.name}{index < ewPlayers.length - 1 ? ' & ' : ''}
                    </Text>
                  ))}
                </View>
              </View>
              <Text style={[
                styles.teamScore,
                ewScore > nsScore ? styles.winningScore : (ewScore < nsScore ? styles.losingScore : {})
              ]}>
                {ewScore}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.dealsSection}>
          <Text style={styles.sectionTitle}>Deals</Text>
          
          {deals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No deals recorded yet</Text>
            </View>
          ) : (
            deals.map((deal) => (
              <View key={deal.id} style={styles.dealCard}>
                <View style={styles.dealHeader}>
                  <Text style={styles.dealTitle}>Deal #{deal.deal_number}</Text>
                </View>
                <View style={styles.dealScores}>
                  <View style={styles.dealScoreRow}>
                    <Text style={styles.dealTeamName}>North-South</Text>
                    <Text style={[
                      styles.dealScore,
                      deal.ns_score > deal.ew_score ? styles.winningScore : (deal.ns_score < deal.ew_score ? styles.losingScore : {})
                    ]}>
                      {deal.ns_score}
                    </Text>
                  </View>
                  <View style={styles.dealScoreRow}>
                    <Text style={styles.dealTeamName}>East-West</Text>
                    <Text style={[
                      styles.dealScore,
                      deal.ew_score > deal.ns_score ? styles.winningScore : (deal.ew_score < deal.ns_score ? styles.losingScore : {})
                    ]}>
                      {deal.ew_score}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {isOwner && (
          <View style={styles.actionsSection}>
            <Pressable 
              style={[
                styles.addDealButton,
                updating && styles.disabledButton
              ]}
              onPress={addDeal}
              disabled={updating}>
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={styles.addDealButtonText}>
                Add New Deal
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
        gameType={session?.game_type || 'rubber'}
        onSave={saveScore}
        dealNumber={(session?.current_deal || 0) + 1}
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
  dealInfo: {
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
  },
  teamName: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerNames: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  playerNameSmall: {
    color: '#767676',
    fontSize: 14,
  },
  teamScore: {
    color: '#484848',
    fontSize: 24,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  winningScore: {
    color: '#008489',
  },
  losingScore: {
    color: '#FF5A5F',
  },
  scoreboardDivider: {
    height: 1,
    backgroundColor: '#e4e4e4',
    marginVertical: 8,
  },
  dealsSection: {
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
  dealCard: {
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
  dealHeader: {
    marginBottom: 12,
  },
  dealTitle: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  dealScores: {
    gap: 8,
  },
  dealScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealTeamName: {
    color: '#767676',
    fontSize: 14,
  },
  dealScore: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsSection: {
    gap: 12,
    marginBottom: 32,
  },
  addDealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addDealButtonText: {
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