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

type ChessPlayer = {
  id: string;
  session_id: string;
  name: string;
  color: 'white' | 'black' | null;
  score: number;
  is_winner: boolean;
  created_at: string;
};

type ChessSession = {
  id: string;
  created_at: string;
  ended_at: string | null;
  status: 'active' | 'completed';
  deleted_at: string | null;
  self_destructed: boolean;
  game_type: 'standard' | 'rapid' | 'blitz';
  player_count: number;
  entry_fee: number;
  time_control: string;
};

type ChessGame = {
  id: string;
  session_id: string;
  white_player_id: string;
  black_player_id: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  game_number: number;
  created_at: string;
};

type GameResultModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (result: '1-0' | '0-1' | '1/2-1/2') => void;
  whitePlayer: ChessPlayer | null;
  blackPlayer: ChessPlayer | null;
};

const GameResultModal = ({ 
  visible, 
  onClose, 
  onSave,
  whitePlayer,
  blackPlayer
}: GameResultModalProps) => {
  if (!whitePlayer || !blackPlayer) return null;

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
            <Text style={styles.modalTitle}>Game Result</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#484848" />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>
              Select the game result:
            </Text>

            <Pressable 
              style={styles.resultOption}
              onPress={() => onSave('1-0')}>
              <Text style={styles.resultOptionText}>
                {whitePlayer.name} wins (1-0)
              </Text>
            </Pressable>

            <Pressable 
              style={styles.resultOption}
              onPress={() => onSave('0-1')}>
              <Text style={styles.resultOptionText}>
                {blackPlayer.name} wins (0-1)
              </Text>
            </Pressable>

            <Pressable 
              style={styles.resultOption}
              onPress={() => onSave('1/2-1/2')}>
              <Text style={styles.resultOptionText}>
                Draw (½-½)
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalFooter}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ChessSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<ChessSession | null>(null);
  const [players, setPlayers] = useState<ChessPlayer[]>([]);
  const [games, setGames] = useState<ChessGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [updating, setUpdating] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
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
        .from('chess_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      const { data: playersData, error: playersError } = await supabase
        .from('chess_players')
        .select('*')
        .eq('session_id', id)
        .order('created_at');

      if (playersError) throw playersError;

      // Get games for this session
      const { data: gamesData, error: gamesError } = await supabase
        .from('chess_games')
        .select('*')
        .eq('session_id', id)
        .order('game_number');

      if (gamesError) throw gamesError;

      setSession(sessionData);
      setPlayers(playersData || []);
      setGames(gamesData || []);
    } catch (err) {
      console.error('Error loading session:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const startNewGame = async () => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // For 2-player games, players keep their colors
      if (session.player_count === 2) {
        const whitePlayer = players.find(p => p.color === 'white');
        const blackPlayer = players.find(p => p.color === 'black');
        
        if (!whitePlayer || !blackPlayer) {
          throw new Error('Cannot find white and black players');
        }
        
        const gameNumber = games.length + 1;
        
        const { error: gameError } = await supabase
          .from('chess_games')
          .insert({
            session_id: session.id,
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            game_number: gameNumber,
            result: '*'
          });
          
        if (gameError) throw gameError;
      } else {
        // For tournament-style games, rotate players and assign colors
        // TODO: Implement tournament pairing logic
        throw new Error('Tournament-style games not yet implemented');
      }
      
      // Reload session data
      await loadSession();
      
    } catch (err) {
      console.error('Error starting new game:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdating(false);
    }
  };

  const saveGameResult = async (result: '1-0' | '0-1' | '1/2-1/2') => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // Get the current game
      const currentGame = games[games.length - 1];
      if (!currentGame) throw new Error('No active game found');
      
      // Update game result
      const { error: gameError } = await supabase
        .from('chess_games')
        .update({ result })
        .eq('id', currentGame.id);
        
      if (gameError) throw gameError;
      
      // Update player scores
      const whitePlayer = players.find(p => p.id === currentGame.white_player_id);
      const blackPlayer = players.find(p => p.id === currentGame.black_player_id);
      
      if (!whitePlayer || !blackPlayer) throw new Error('Players not found');
      
      let whiteScore = whitePlayer.score;
      let blackScore = blackPlayer.score;
      
      if (result === '1-0') {
        whiteScore += 1;
      } else if (result === '0-1') {
        blackScore += 1;
      } else {
        whiteScore += 0.5;
        blackScore += 0.5;
      }
      
      const { error: whiteUpdateError } = await supabase
        .from('chess_players')
        .update({ score: whiteScore })
        .eq('id', whitePlayer.id);
        
      if (whiteUpdateError) throw whiteUpdateError;
      
      const { error: blackUpdateError } = await supabase
        .from('chess_players')
        .update({ score: blackScore })
        .eq('id', blackPlayer.id);
        
      if (blackUpdateError) throw blackUpdateError;
      
      // Reload session data
      await loadSession();
      
    } catch (err) {
      console.error('Error saving game result:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdating(false);
      setResultModalVisible(false);
    }
  };

  const endSession = async () => {
    if (!session) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // Check if there are any unfinished games
      const unfinishedGames = games.filter(game => game.result === '*');
      if (unfinishedGames.length > 0) {
        throw new Error('Please complete all games before ending the session');
      }
      
      // Find player(s) with highest score
      const maxScore = Math.max(...players.map(p => p.score));
      const winners = players.filter(p => p.score === maxScore);
      
      // Update winners
      for (const player of players) {
        const isWinner = player.score === maxScore;
        
        const { error: playerError } = await supabase
          .from('chess_players')
          .update({ is_winner: isWinner })
          .eq('id', player.id);
          
        if (playerError) throw playerError;
      }
      
      // Mark session as completed
      const { error: sessionError } = await supabase
        .from('chess_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id);
        
      if (sessionError) throw sessionError;
      
      // Navigate to summary screen
      router.replace(`/chess-session/${session.id}/summary`);
      
    } catch (err) {
      console.error('Error ending session:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdating(false);
    }
  };

  const confirmEndSession = () => {
    if (!session) return;
    
    // Check for unfinished games
    const unfinishedGames = games.filter(game => game.result === '*');
    if (unfinishedGames.length > 0) {
      setError(parseSupabaseError(new Error('Please complete all games before ending the session')));
      return;
    }
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to end this chess session?');
      if (confirmed) {
        endSession();
      }
    } else {
      Alert.alert(
        'End Chess Session',
        'Are you sure you want to end this chess session?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'End Session',
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

  const totalPrize = session.entry_fee * session.player_count;
  const currentGame = games[games.length - 1];
  const whitePlayer = currentGame ? players.find(p => p.id === currentGame.white_player_id) : null;
  const blackPlayer = currentGame ? players.find(p => p.id === currentGame.black_player_id) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Chess Game',
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
              <Text style={styles.gameTypeLabel}>
                {session.game_type.charAt(0).toUpperCase() + session.game_type.slice(1)} Chess
              </Text>
            </View>
            <Text style={styles.timeControl}>{session.time_control}</Text>
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

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Players</Text>
          {players.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.color && (
                  <View style={[
                    styles.colorBadge,
                    { backgroundColor: player.color === 'white' ? '#f0f0f0' : '#484848' }
                  ]}>
                    <Text style={[
                      styles.colorText,
                      { color: player.color === 'white' ? '#484848' : '#f0f0f0' }
                    ]}>
                      {player.color.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.playerScore}>{player.score}</Text>
            </View>
          ))}
        </View>

        <View style={styles.gamesSection}>
          <Text style={styles.sectionTitle}>Games</Text>
          
          {games.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No games played yet</Text>
            </View>
          ) : (
            games.map((game) => {
              const white = players.find(p => p.id === game.white_player_id);
              const black = players.find(p => p.id === game.black_player_id);
              
              if (!white || !black) return null;
              
              return (
                <View key={game.id} style={styles.gameCard}>
                  <View style={styles.gameHeader}>
                    <Text style={styles.gameTitle}>Game {game.game_number}</Text>
                    {game.result === '*' && (
                      <Text style={styles.gameInProgress}>In Progress</Text>
                    )}
                  </View>
                  <View style={styles.gamePlayerRow}>
                    <View style={styles.gamePlayerInfo}>
                      <View style={[styles.colorDot, { backgroundColor: '#f0f0f0' }]} />
                      <Text style={styles.gamePlayerName}>{white.name}</Text>
                    </View>
                    <Text style={styles.gameResult}>
                      {game.result === '1-0' ? '1' : 
                       game.result === '0-1' ? '0' :
                       game.result === '1/2-1/2' ? '½' : '-'}
                    </Text>
                  </View>
                  <View style={styles.gamePlayerRow}>
                    <View style={styles.gamePlayerInfo}>
                      <View style={[styles.colorDot, { backgroundColor: '#484848' }]} />
                      <Text style={styles.gamePlayerName}>{black.name}</Text>
                    </View>
                    <Text style={styles.gameResult}>
                      {game.result === '0-1' ? '1' : 
                       game.result === '1-0' ? '0' :
                       game.result === '1/2-1/2' ? '½' : '-'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {isOwner && (
          <View style={styles.actionsSection}>
            {currentGame?.result === '*' ? (
              <Pressable 
                style={[
                  styles.resultButton,
                  updating && styles.disabledButton
                ]}
                onPress={() => setResultModalVisible(true)}
                disabled={updating}>
                <MaterialCommunityIcons name="flag-checkered" size={20} color="#fff" />
                <Text style={styles.resultButtonText}>
                  Record Result
                </Text>
              </Pressable>
            ) : (
              <Pressable 
                style={[
                  styles.newGameButton,
                  updating && styles.disabledButton
                ]}
                onPress={startNewGame}
                disabled={updating}>
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.newGameButtonText}>
                  Start New Game
                </Text>
              </Pressable>
            )}
            
            <Pressable 
              style={[
                styles.endSessionButton,
                updating && styles.disabledButton
              ]}
              onPress={confirmEndSession}
              disabled={updating}>
              <MaterialCommunityIcons name="flag-checkered" size={20} color="#ffffff" />
              <Text style={styles.endSessionButtonText}>End Session</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <GameResultModal
        visible={resultModalVisible}
        onClose={() => setResultModalVisible(false)}
        onSave={saveGameResult}
        whitePlayer={whitePlayer}
        blackPlayer={blackPlayer}
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
  timeControl: {
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
  playersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  playerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  colorBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  colorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playerScore: {
    color: '#FF5A5F',
    fontSize: 18,
    fontWeight: '600',
  },
  gamesSection: {
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
  gameCard: {
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
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameTitle: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  gameInProgress: {
    color: '#FF5A5F',
    fontSize: 14,
    fontStyle: 'italic',
  },
  gamePlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gamePlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  gamePlayerName: {
    color: '#484848',
    fontSize: 14,
  },
  gameResult: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  actionsSection: {
    gap: 12,
    marginBottom: 32,
  },
  newGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  newGameButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  resultButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  endSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008489',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  endSessionButtonText: {
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
  resultOption: {
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  resultOptionText: {
    color: '#484848',
    fontSize: 16,
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
});