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

export default function RummySessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<RummySession | null>(null);
  const [players, setPlayers] = useState<RummyPlayer[]>([]);
  const [roundScores, setRoundScores] = useState<Record<number, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    loadSessionData();
  }, [id]);

  const loadSessionData = async () => {
    try {
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
        .order('score', { ascending: true });

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

      setSession(sessionData);
      setPlayers(playersData || []);
      setRoundScores(scoresByRound);
    } catch (err) {
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
  const gameType = session.game_type === 'pool_101' ? 'Pool 101' : 'Pool 201';
  const maxScore = session.game_type === 'pool_101' ? 101 : 201;
  
  // Calculate prize distribution
  const calculatePrizes = () => {
    if (!session.prize_split) {
      // Single winner gets everything
      const winner = players.find(p => p.is_winner);
      if (winner) {
        return [{ player: winner, amount: totalPrize }];
      }
      return [];
    }
    
    // For prize split, use the active players (non-eliminated) sorted by score
    const activePlayers = players.filter(p => !p.is_eliminated);
    
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

        <View style={styles.gameInfoCard}>
          <View style={styles.gameTypeContainer}>
            <Text style={styles.gameTypeLabel}>{gameType}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Entry Fee</Text>
            <Text style={styles.gameInfoValue}>₹{session.entry_fee.toLocaleString()}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Total Rounds</Text>
            <Text style={styles.gameInfoValue}>{session.current_round - 1}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Prize Pool</Text>
            <Text style={styles.gameInfoValue}>₹{totalPrize.toLocaleString()}</Text>
          </View>
          {session.prize_split && (
            <View style={styles.prizeSplitBadge}>
              <MaterialCommunityIcons name="handshake" size={16} color="#ffffff" />
              <Text style={styles.prizeSplitText}>Prize Split</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Results</Text>
          
          {prizes.length > 0 ? (
            <View style={styles.winnersSection}>
              {prizes.map(({ player, amount }, index) => (
                <View key={player.id} style={styles.winnerCard}>
                  <View style={styles.winnerHeader}>
                    <View style={styles.winnerBadge}>
                      <Text style={styles.winnerRank}>#{index + 1}</Text>
                    </View>
                    <Text style={styles.winnerName}>{player.name}</Text>
                    {player.is_winner && !session.prize_split && (
                      <View style={styles.winnerCrownBadge}>
                        <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
                      </View>
                    )}
                  </View>
                  <View style={styles.winnerDetails}>
                    <View style={styles.winnerDetailItem}>
                      <Text style={styles.winnerDetailLabel}>Score</Text>
                      <Text style={styles.winnerDetailValue}>{player.score} / {maxScore}</Text>
                    </View>
                    <View style={styles.winnerDetailItem}>
                      <Text style={styles.winnerDetailLabel}>Prize</Text>
                      <Text style={styles.winnerPrize}>₹{amount.toLocaleString()}</Text>
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
          <Text style={styles.sectionTitle}>All Players</Text>
          
          {players.map((player, index) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerHeader}>
                <Text style={styles.playerRank}>#{index + 1}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.is_eliminated ? (
                  <View style={styles.eliminatedBadge}>
                    <Text style={styles.eliminatedText}>Eliminated</Text>
                  </View>
                ) : player.is_winner && !session.prize_split ? (
                  <View style={styles.winnerBadge}>
                    <Text style={styles.winnerText}>Winner</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.playerDetails}>
                <Text style={styles.playerScore}>Score: {player.score} / {maxScore}</Text>
              </View>
            </View>
          ))}
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
  prizeSplitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  prizeSplitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  winnerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  winnerRank: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  winnerName: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  winnerCrownBadge: {
    marginLeft: 8,
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
  eliminatedBadge: {
    backgroundColor: '#FF5A5F',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  eliminatedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  winnerBadge: {
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
});