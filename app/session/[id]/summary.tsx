import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { ErrorDisplay } from '../../../components/ErrorDisplay';
import { AppError, parseSupabaseError } from '../../../lib/errorHandling';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import type { Session, Player } from '../../../lib/supabase';

type Settlement = {
  id: string;
  from: Player;
  to: Player;
  amount: number;
  settled: boolean;
  settled_by_goons: boolean;
  settled_at: string | null;
};

export default function SessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [updatingSettlement, setUpdatingSettlement] = useState<string | null>(null);

  useEffect(() => {
    loadSessionData();
  }, [id]);

  const loadSessionData = async () => {
    try {
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', id)
        .order('net_amount', { ascending: false });

      if (playersError) throw playersError;

      // Get settlements from database
      const { data: settlementsData, error: settlementsError } = await supabase
        .from('settlements')
        .select('*')
        .eq('session_id', id);

      if (settlementsError) throw settlementsError;

      // Map settlements to include player details
      const mappedSettlements = await Promise.all(
        (settlementsData || []).map(async (settlement) => {
          const fromPlayer = playersData?.find(p => p.id === settlement.from_player_id);
          const toPlayer = playersData?.find(p => p.id === settlement.to_player_id);
          
          if (!fromPlayer || !toPlayer) {
            throw new Error('Player not found for settlement');
          }
          
          return {
            id: settlement.id,
            from: fromPlayer,
            to: toPlayer,
            amount: settlement.amount,
            settled: settlement.settled,
            settled_by_goons: settlement.settled_by_goons,
            settled_at: settlement.settled_at
          };
        })
      );

      setSession(sessionData);
      setPlayers(playersData || []);
      setSettlements(mappedSettlements);
    } catch (err) {
      console.error('Error loading session data:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleSettlement = async (settlementId: string) => {
    try {
      setUpdatingSettlement(settlementId);
      const settlement = settlements.find(s => s.id === settlementId);
      if (!settlement) return;

      const newSettledState = !settlement.settled;
      
      // Update settlement in database
      const { error: updateError } = await supabase
        .from('settlements')
        .update({
          settled: newSettledState,
          settled_at: newSettledState ? new Date().toISOString() : null,
          settled_by_goons: false // Reset this flag when manually toggled
        })
        .eq('id', settlementId);

      if (updateError) throw updateError;

      // Update local state
      setSettlements(prevSettlements => 
        prevSettlements.map(s => 
          s.id === settlementId 
            ? { 
                ...s, 
                settled: newSettledState, 
                settled_at: newSettledState ? new Date().toISOString() : null,
                settled_by_goons: false
              } 
            : s
        )
      );
    } catch (err) {
      console.error('Error updating settlement:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdatingSettlement(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingIndicator 
          size="large" 
          color="#FF5A5F" 
          message="Loading session summary..." 
          timeout={10000}
          onTimeout={() => setError(parseSupabaseError(new Error('Loading timed out. Please try again.')))}
        />
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

  const totalBuyIn = players.reduce(
    (sum, player) => sum + player.total_buy_in,
    0
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Session Summary',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.date}>
            {new Date(session?.ended_at!).toLocaleDateString()}
          </Text>
          <Text style={styles.time}>
            {new Date(session?.ended_at!).toLocaleTimeString()}
          </Text>
        </View>

        {session?.self_destructed && (
          <View style={styles.selfDestructedBanner}>
            <MaterialCommunityIcons name="alert" size={20} color="#ffffff" />
            <Text style={styles.selfDestructedText}>
              This session was automatically terminated after 24 hours of inactivity
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Buy-in</Text>
            <Text style={styles.statValue}>₹{totalBuyIn}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Players</Text>
            <Text style={styles.statValue}>{players.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>
              {Math.round(
                (new Date(session?.ended_at!).getTime() -
                  new Date(session?.created_at!).getTime()) /
                  (1000 * 60)
              )}m
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Standings</Text>
          {players.map((player, index) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerHeader}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerRank}>#{index + 1}</Text>
                  <Text style={styles.playerName}>{player.name}</Text>
                </View>
                <Text
                  style={[
                    styles.netAmount,
                    player.net_amount! > 0
                      ? styles.profit
                      : styles.loss,
                  ]}>
                  {player.net_amount! >= 0 ? '+' : ''}
                  ₹{player.net_amount?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.playerStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Buy-in</Text>
                  <Text style={styles.statItemValue}>
                    ₹{player.total_buy_in?.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Final Chips</Text>
                  <Text style={styles.statItemValue}>
                    {player.final_chips?.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlements</Text>
          {settlements.length === 0 ? (
            <View style={styles.emptySettlements}>
              <Text style={styles.emptySettlementsText}>No settlements required</Text>
            </View>
          ) : (
            settlements.map((settlement) => (
              <View 
                key={settlement.id} 
                style={[
                  styles.settlementCard, 
                  settlement.settled && styles.settledCard
                ]}>
                <View style={styles.settlementPlayers}>
                  <Text style={styles.playerName}>{settlement.from.name}</Text>
                  <Text style={styles.arrowText}>→</Text>
                  <Text style={styles.playerName}>{settlement.to.name}</Text>
                </View>
                <Text style={styles.settlementAmount}>₹{settlement.amount}</Text>
                
                {settlement.settled_by_goons ? (
                  <View style={styles.settledByGoonsBadge}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#ffffff" />
                    <Text style={styles.settledByGoonsText}>Settled by Goons</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.settleButton, settlement.settled && styles.settledButton]}
                    onPress={() => toggleSettlement(settlement.id)}
                    disabled={updatingSettlement === settlement.id}>
                    {updatingSettlement === settlement.id ? (
                      <ActivityIndicator size="small" color={settlement.settled ? "#ffffff" : "#FF5A5F"} />
                    ) : (
                      <Text style={[styles.settleButtonText, settlement.settled && styles.settledButtonText]}>
                        {settlement.settled ? 'Settled' : 'Mark as Settled'}
                      </Text>
                    )}
                  </Pressable>
                )}
                
                {settlement.settled && settlement.settled_at && !settlement.settled_by_goons && (
                  <Text style={styles.settledAtText}>
                    Settled on {new Date(settlement.settled_at).toLocaleDateString()}
                  </Text>
                )}
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
  errorContainer: {
    backgroundColor: '#FFEEEE',
    borderRadius: 8,
    padding: 12,
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    color: '#767676',
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    color: '#FF5A5F',
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerRank: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    width: 24,
  },
  playerName: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
  },
  netAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  profit: {
    color: '#008489',
  },
  loss: {
    color: '#FF5A5F',
  },
  playerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statItemLabel: {
    color: '#767676',
    fontSize: 14,
    marginBottom: 2,
  },
  statItemValue: {
    color: '#484848',
    fontSize: 16,
  },
  emptySettlements: {
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
  emptySettlementsText: {
    color: '#767676',
    fontSize: 16,
  },
  settlementCard: {
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
  settledCard: {
    opacity: 0.7,
  },
  settlementPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrowText: {
    color: '#FF5A5F',
    fontSize: 20,
    fontWeight: '600',
  },
  settlementAmount: {
    color: '#FF5A5F',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  settleButton: {
    backgroundColor: '#f7f7f7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  settledButton: {
    backgroundColor: '#008489',
    borderColor: '#008489',
  },
  settleButtonText: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '600',
  },
  settledButtonText: {
    color: '#fff',
  },
  settledByGoonsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
    padding: 12,
    borderRadius: 8,
  },
  settledByGoonsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  settledAtText: {
    color: '#767676',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});