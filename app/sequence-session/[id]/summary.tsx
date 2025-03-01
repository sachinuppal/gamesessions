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

export default function SequenceSessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SequenceSession | null>(null);
  const [players, setPlayers] = useState<SequencePlayer[]>([]);
  const [rounds, setRounds] = useState<SequenceRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    loadSessionData();
  }, [id]);

  const loadSessionData = async () => {
    try {
      setError(null);
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
      setRounds(roundsData || []);
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

  const bluePlayers = players.filter(p => p.team === 'blue');
  const greenPlayers = players.filter(p => p.team === 'green');
  const redPlayers = players.filter(p => p.team === 'red');
  
  // Calculate team scores
  const blueScore = bluePlayers.reduce((sum, player) => sum + player.score, 0);
  const greenScore = greenPlayers.reduce((sum, player) => sum + player.score, 0);
  const redScore = redPlayers.reduce((sum, player) => sum + player.score, 0);
  
  // Determine winning team
  let winningTeam: 'blue' | 'green' | 'red' = 'blue';
  if (greenScore > blueScore && greenScore > redScore) {
    winningTeam = 'green';
  } else if (redScore > blueScore && redScore > greenScore) {
    winningTeam = 'red';
  }
  
  // Get winning team players
  const winningPlayers = players.filter(p => p.team === winningTeam);
  
  // Calculate prize distribution
  const totalPrize = session.entry_fee * session.player_count;
  const prizePerPlayer = winningPlayers.length > 0 ? Math.floor(totalPrize / winningPlayers.length) : 0;

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
              {session.game_type === 'standard' ? 'Standard' : 'Team Play'}
            </Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Entry Fee</Text>
            <Text style={styles.gameInfoValue}>₹{session.entry_fee.toLocaleString()}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Total Rounds</Text>
            <Text style={styles.gameInfoValue}>{rounds.length}</Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>Prize Pool</Text>
            <Text style={styles.gameInfoValue}>₹{totalPrize.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Winning Team</Text>
          
          <View style={[styles.winnerCard, { borderColor: winningTeam === 'blue' ? '#1E88E5' : winningTeam === 'green' ? '#43A047' : '#E53935' }]}>
            <View style={styles.winnerHeader}>
              <View style={[styles.winnerBadge, { backgroundColor: winningTeam === 'blue' ? '#1E88E5' : winningTeam === 'green' ? '#43A047' : '#E53935' }]}>
                <MaterialCommunityIcons name="trophy" size={24} color="#ffffff" />
              </View>
              <Text style={styles.winnerTeamName}>
                {winningTeam.charAt(0).toUpperCase() + winningTeam.slice(1)} Team Wins!
              </Text>
            </View>
            <View style={styles.winnerDetails}>
              <View style={styles.winnerPlayers}>
                {winningPlayers.map((player, index) => (
                  <Text key={player.id} style={styles.winnerPlayerName}>
                    {player.name}{index < winningPlayers.length - 1 ? ', ' : ''}
                  </Text>
                ))}
              </View>
              <View style={styles.prizeDetails}>
                <Text style={styles.prizeLabel}>Prize per player</Text>
                <Text style={styles.prizeAmount}>₹{prizePerPlayer.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Score</Text>
          <View style={styles.scoreCard}>
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
                styles.finalScore,
                winningTeam === 'blue' ? styles.winningScore : {}
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
                styles.finalScore,
                winningTeam === 'green' ? styles.winningScore : {}
              ]}>
                {greenScore}
              </Text>
            </View>
            
            {redPlayers.length > 0 && (
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
                    styles.finalScore,
                    winningTeam === 'red' ? styles.winningScore : {}
                  ]}>
                    {redScore}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Round History</Text>
          
          {rounds.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No rounds recorded</Text>
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
                  {redPlayers.length > 0 && (
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
    justifyContent: 'center', alignItems: 'center',
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
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  winnerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
});