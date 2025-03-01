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

type BridgeDeal = {
  id: string;
  session_id: string;
  deal_number: number;
  ns_score: number;
  ew_score: number;
  created_at: string;
};

export default function BridgeSessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<BridgeSession | null>(null);
  const [players, setPlayers] = useState<BridgePlayer[]>([]);
  const [deals, setDeals] = useState<BridgeDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    loadSessionData();
  }, [id]);

  const loadSessionData = async () => {
    try {
      setError(null);
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
      setDeals(dealsData || []);
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

  const nsPlayers = players.filter(p => p.team === 'NS');
  const ewPlayers = players.filter(p => p.team === 'EW');
  
  // Calculate team scores
  const nsScore = nsPlayers.reduce((sum, player) => sum + player.score, 0);
  const ewScore = ewPlayers.reduce((sum, player) => sum + player.score, 0);
  
  // Determine winning team
  const nsWins = nsScore > ewScore;
  const isDraw = nsScore === ewScore;
  
  // Calculate prize distribution
  const totalPrize = session.entry_fee * session.player_count;
  const winningTeamPrize = totalPrize;

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
              {session.game_type === 'rubber' ? 'Rubber Bridge' : 'Duplicate Bridge'}
            </Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Entry Fee</Text>
            <Text style={styles.gameInfoValue}>₹{session.entry_fee.toLocaleString()}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Total Deals</Text>
            <Text style={styles.gameInfoValue}>{deals.length}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Prize Pool</Text>
            <Text style={styles.gameInfoValue}>₹{totalPrize.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Results</Text>
          
          {isDraw ? (
            <View style={styles.drawBanner}>
              <MaterialCommunityIcons name="handshake" size={24} color="#ffffff" />
              <Text style={styles.drawText}>The game ended in a draw!</Text>
            </View>
          ) : (
            <View style={styles.winnerCard}>
              <View style={styles.winnerHeader}>
                <View style={styles.winnerBadge}>
                  <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
                </View>
                <Text style={styles.winnerTeamName}>
                  {nsWins ? 'North-South Team' : 'East-West Team'} Wins!
                </Text>
              </View>
              <View style={styles.winnerDetails}>
                <View style={styles.winnerPlayers}>
                  {(nsWins ? nsPlayers : ewPlayers).map((player, index) => (
                    <Text key={player.id} style={styles.winnerPlayerName}>
                      {player.name}{index < (nsWins ? nsPlayers.length : ewPlayers.length) - 1 ? ' & ' : ''}
                    </Text>
                  ))}
                </View>
                <View style={styles.prizeDetails}>
                  <Text style={styles.prizeLabel}>Prize</Text>
                  <Text style={styles.prizeAmount}>₹{winningTeamPrize.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Score</Text>
          <View style={styles.scoreCard}>
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
                styles.finalScore,
                nsWins ? styles.winningScore : (isDraw ? {} : styles.losingScore)
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
                styles.finalScore,
                !nsWins && !isDraw ? styles.winningScore : (isDraw ? {} : styles.losingScore)
              ]}>
                {ewScore}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deal History</Text>
          
          {deals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No deals recorded</Text>
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
  drawBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  drawText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  winnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  winnerBadge: {
    marginRight: 12,
  },
  winnerTeamName: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
  },
  winnerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  winnerPlayers: {
    flex: 1,
  },
  winnerPlayerName: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
  },
  prizeDetails: {
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
  scoreCard: {
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
  finalScore: {
    color: '#484848',
    fontSize: 28,
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
  }
});