import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { ErrorDisplay } from '../../../components/ErrorDisplay';
import { AppError, parseSupabaseError } from '../../../lib/errorHandling';

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

export default function ChessSessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<ChessSession | null>(null);
  const [players, setPlayers] = useState<ChessPlayer[]>([]);
  const [games, setGames] = useState<ChessGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    loadSessionData();
  }, [id]);

  const loadSessionData = async () => {
    try {
      setError(null);
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
        .order('score', { ascending: false });

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
      console.error('Error loading session data:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
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
        <ErrorDisplay error={error} onRetry={loadSessionData} />
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
  const winners = players.filter(p => p.is_winner);
  const prizePerWinner = winners.length > 0 ? Math.floor(totalPrize / winners.length) : 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Game Summary',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.date}>
            {new Date(session.ended_at!).toLocaleDateString()}
          </Text>
          <Text style={styles.time}>
            {new Date(session.ended_at!).toLocaleTimeString()}
          </Text>
        </View>

        {session.self_destructed && (
          <View style={styles.selfDestructedBanner}>
            <MaterialCommunityIcons name="alert" size={20} color="#ffffff" />
            <Text style={styles.selfDestructedText}>
              This session was automatically terminated after 24 hours of inactivity
            </Text>
          </View>
        )}

        <View style={styles.gameInfoCard}>
          <View style={styles.gameTypeContainer}>
            <Text style={styles.gameTypeLabel}>
              {session.game_type.charAt(0).toUpperCase() + session.game_type.slice(1)} Chess
            </Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Time Control</Text>
            <Text style={styles.gameInfoValue}>{session.time_control}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Entry Fee</Text>
            <Text style={styles.gameInfoValue}>₹{session.entry_fee.toLocaleString()}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Total Games</Text>
            <Text style={styles.gameInfoValue}>{games.length}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Prize Pool</Text>
            <Text style={styles.gameInfoValue}>₹{totalPrize.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Results</Text>
          
          {winners.length > 0 ? (
            <View style={styles.winnersSection}>
              {winners.map((winner, index) => (
                <View key={winner.id} style={styles.winnerCard}>
                  <View style={styles.winnerHeader}>
                    <View style={styles.winnerBadge}>
                      <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
                    </View>
                    <Text style={styles.winnerName}>{winner.name}</Text>
                  </View>
                  <View style={styles.winnerDetails}>
                    <View style={styles.winnerDetailItem}>
                      <Text style={styles.winnerDetailLabel}>Score</Text>
                      <Text style={styles.winnerDetailValue}>{winner.score} points</Text>
                    </View>
                    <View style={styles.winnerDetailItem}>
                      <Text style={styles.winnerDetailLabel}>Prize</Text>
                      <Text style={styles.winnerPrize}>₹{prizePerWinner.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No winners found</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Standings</Text>
          
          {players.map((player, index) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerHeader}>
                <Text style={styles.playerRank}>#{index + 1}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.is_winner && (
                  <View style={styles.winnerBadgeSmall}>
                    <Text style={styles.winnerText}>Winner</Text>
                  </View>
                )}
              </View>
              <View style={styles.playerDetails}>
                <Text style={styles.playerScore}>Score: {player.score} points</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game History</Text>
          
          {games.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No games recorded</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  errorText: {
    color: '#FF5A5F',
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
  },
  date: {
    color: '#484848',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  time: {
    color: '#767676',
    fontSize: 16,
  },
  selfDestructedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  selfDestructedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  gameInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gameTypeContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  gameTypeLabel: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '600',
  },
  gameInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameInfoLabel: {
    color: '#767676',
    fontSize: 14,
  },
  gameInfoValue: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  winnersSection: {
    gap: 12,
  },
  winnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  winnerBadge: {
    marginRight: 12,
  },
  winnerName: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
  },
  winnerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  winnerDetailItem: {
    flex: 1,
  },
  winnerDetailLabel: {
    color: '#767676',
    fontSize: 14,
    marginBottom: 4,
  },
  winnerDetailValue: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
  },
  winnerPrize: {
    color: '#FF5A5F',
    fontSize: 18,
    fontWeight: '600',
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
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerRank: {
    width: 24,
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  playerName: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  winnerBadgeSmall: {
    backgroundColor: '#FFD700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  winnerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  playerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playerScore: {
    color: '#484848',
    fontSize: 14,
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
    marginBottom: 12,
  },
  gameTitle: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
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
});