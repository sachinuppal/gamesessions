import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { supabase, enhancedSupabase } from '../../lib/supabase';
import { markSettlementsByGoons } from '../../lib/utils';
import { isSessionOwnedByDevice } from '../../lib/deviceStorage';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { AppError, parseSupabaseError } from '../../lib/errorHandling';
import type { Session, Player } from '../../lib/supabase';

type SessionWithPlayers = Session & {
  players: Player[];
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
  players: any[];
  session_type: 'rummy';
};

type HistoryItem = SessionWithPlayers | RummySession;

type GameType = 'all' | 'poker' | 'rummy' | 'bridge' | 'sequence' | 'chess' | 'scrabble' | 'housie' | 'codenames';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sessionOwnership, setSessionOwnership] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<GameType>('all');

  const loadCompletedSessions = useCallback(async () => {
    try {
      setError(null);
      
      await markSettlementsByGoons();

      const { data: pokerSessionsData, error: pokerSessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('ended_at', { ascending: false });

      if (pokerSessionsError) throw pokerSessionsError;

      const pokerSessionsWithPlayers = await Promise.all(
        (pokerSessionsData || []).map(async (session) => {
          const { data: players, error: playersError } = await supabase
            .from('players')
            .select('*')
            .eq('session_id', session.id)
            .order('net_amount', { ascending: false });

          if (playersError) throw playersError;

          return {
            ...session,
            players: players || [],
            session_type: 'poker'
          };
        })
      );

      const { data: rummySessionsData, error: rummySessionsError } = await supabase
        .from('rummy_sessions')
        .select('*')
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('ended_at', { ascending: false });

      if (rummySessionsError) throw rummySessionsError;

      const rummySessionsWithPlayers = await Promise.all(
        (rummySessionsData || []).map(async (session) => {
          const { data: players, error: playersError } = await supabase
            .from('rummy_players')
            .select('*')
            .eq('session_id', session.id)
            .order('score', { ascending: true });

          if (playersError) throw playersError;

          return {
            ...session,
            players: players || [],
            session_type: 'rummy'
          };
        })
      );

      const allSessions = [...pokerSessionsWithPlayers, ...rummySessionsWithPlayers]
        .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime());

      setSessions(allSessions);

      const ownershipStatus: Record<string, boolean> = {};
      for (const session of allSessions) {
        ownershipStatus[session.id] = await isSessionOwnedByDevice(session.id);
      }
      setSessionOwnership(ownershipStatus);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCompletedSessions();
  }, [loadCompletedSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCompletedSessions();
  }, [loadCompletedSessions]);

  const deleteSession = async (sessionId: string, sessionType: 'poker' | 'rummy') => {
    try {
      setDeleting(sessionId);
      
      const isOwner = await isSessionOwnedByDevice(sessionId);
      
      if (!isOwner) {
        throw new Error('You can only delete sessions created on this device');
      }
      
      const tableName = sessionType === 'poker' ? 'sessions' : 'rummy_sessions';
      
      const { error: deleteError } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (deleteError) throw deleteError;

      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      setError(parseSupabaseError(err));
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = (sessionId: string, sessionType: 'poker' | 'rummy') => {
    if (!sessionOwnership[sessionId]) {
      const message = 'You can only delete sessions created on this device';
      
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Cannot Delete Session', message);
      }
      return;
    }
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this session from history?');
      if (confirmed) {
        deleteSession(sessionId, sessionType);
      }
    } else {
      Alert.alert(
        'Delete Session',
        'Are you sure you want to delete this session from history?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteSession(sessionId, sessionType),
          },
        ]
      );
    }
  };

  const renderPokerSession = (session: SessionWithPlayers) => {
    return (
      <View key={session.id} style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionDate}>
            {new Date(session.ended_at!).toLocaleDateString()}
          </Text>
          <View style={styles.headerActions}>
            <View style={styles.sessionTypeContainer}>
              <Text style={styles.sessionTypeText}>Poker</Text>
            </View>
            <Text style={styles.sessionTime}>
              {new Date(session.ended_at!).toLocaleTimeString()}
            </Text>
            {sessionOwnership[session.id] ? (
              <Pressable
                onPress={() => confirmDelete(session.id, 'poker')}
                disabled={deleting === session.id}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}>
                {deleting === session.id ? (
                  <ActivityIndicator size="small" color="#FF5A5F" />
                ) : (
                  <MaterialCommunityIcons name="delete" size={20} color="#FF5A5F" />
                )}
              </Pressable>
            ) : (
              <View style={styles.notOwnedBadge}>
                <MaterialCommunityIcons name="lock" size={16} color="#767676" />
              </View>
            )}
          </View>
        </View>

        {session.self_destructed && (
          <View style={styles.selfDestructedBadge}>
            <MaterialCommunityIcons name="alert" size={16} color="#ffffff" />
            <Text style={styles.selfDestructedText}>Self Destructed</Text>
          </View>
        )}

        <View style={styles.playersList}>
          {session.players.map((player, index) => (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerRank}>#{index + 1}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
              </View>
              <View style={styles.playerStats}>
                <Text style={styles.chipCount}>
                  {player.final_chips?.toLocaleString()} chips
                </Text>
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
            </View>
          ))}
        </View>

        <Link href={`/session/${session.id}/summary`} asChild>
          <Pressable style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>View Details</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#FF5A5F"
            />
          </Pressable>
        </Link>
      </View>
    );
  };

  const renderRummySession = (session: RummySession) => {
    const totalPrize = session.entry_fee * session.player_count;
    const gameType = session.game_type === 'pool_101' ? 'Pool 101' : 'Pool 201';
    
    const sortedPlayers = [...session.players].sort((a, b) => a.score - b.score);
    
    return (
      <View key={session.id} style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionDate}>
            {new Date(session.ended_at!).toLocaleDateString()}
          </Text>
          <View style={styles.headerActions}>
            <View style={styles.sessionTypeContainer}>
              <Text style={styles.sessionTypeText}>Rummy</Text>
            </View>
            <Text style={styles.sessionTime}>
              {new Date(session.ended_at!).toLocaleTimeString()}
            </Text>
            {sessionOwnership[session.id] ? (
              <Pressable
                onPress={() => confirmDelete(session.id, 'rummy')}
                disabled={deleting === session.id}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}>
                {deleting === session.id ? (
                  <ActivityIndicator size="small" color="#FF5A5F" />
                ) : (
                  <MaterialCommunityIcons name="delete" size={20} color="#FF5A5F" />
                )}
              </Pressable>
            ) : (
              <View style={styles.notOwnedBadge}>
                <MaterialCommunityIcons name="lock" size={16} color="#767676" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.rummyGameInfo}>
          <View style={styles.gameTypeContainer}>
            <Text style={styles.gameTypeLabel}>{gameType}</Text>
          </View>
          
          {session.prize_split && (
            <View style={styles.prizeSplitBadge}>
              <MaterialCommunityIcons name="handshake" size={16} color="#ffffff" />
              <Text style={styles.prizeSplitText}>Prize Split</Text>
            </View>
          )}
        </View>

        <View style={styles.playersList}>
          {sortedPlayers.slice(0, 3).map((player, index) => (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerRank}>#{index + 1}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.is_winner && (
                  <View style={styles.winnerBadge}>
                    <MaterialCommunityIcons name="trophy" size={14} color="#ffffff" />
                    <Text style={styles.winnerText}>Winner</Text>
                  </View>
                )}
              </View>
              <View style={styles.playerStats}>
                <Text style={styles.scoreText}>
                  {player.score} points
                </Text>
              </View>
            </View>
          ))}
          
          {sortedPlayers.length > 3 && (
            <Text style={styles.morePlayersText}>
              +{sortedPlayers.length - 3} more players
            </Text>
          )}
        </View>

        <Link href={`/rummy-session/${session.id}/summary`} asChild>
          <Pressable style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>View Details</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="#FF5A5F"
            />
          </Pressable>
        </Link>
      </View>
    );
  };

  const filteredSessions = sessions.filter(session => {
    if (activeTab === 'all') return true;
    return session.session_type === activeTab;
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingIndicator size="large" color="#FF5A5F" message="Loading game history..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
        <Pressable 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}>
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'poker' && styles.activeTab]}
          onPress={() => setActiveTab('poker')}>
          <MaterialCommunityIcons 
            name="cards-playing" 
            size={16} 
            color={activeTab === 'poker' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.tabText, activeTab === 'poker' && styles.activeTabText]}>Poker</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.tab, activeTab === 'rummy' && styles.activeTab]}
          onPress={() => setActiveTab('rummy')}>
          <MaterialCommunityIcons 
            name="cards" 
            size={16} 
            color={activeTab === 'rummy' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.tabText, activeTab === 'rummy' && styles.activeTabText]}>Rummy</Text>
        </Pressable>

        <Pressable 
          style={[styles.tab, activeTab === 'bridge' && styles.activeTab]}
          onPress={() => setActiveTab('bridge')}>
          <MaterialCommunityIcons 
            name="cards-outline" 
            size={16} 
            color={activeTab === 'bridge' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.tabText, activeTab === 'bridge' && styles.activeTabText]}>Bridge</Text>
        </Pressable>

        <Pressable 
          style={[styles.tab, activeTab === 'sequence' && styles.activeTab]}
          onPress={() => setActiveTab('sequence')}>
          <MaterialCommunityIcons 
            name="cards-playing-outline" 
            size={16} 
            color={activeTab === 'sequence' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.tabText, activeTab === 'sequence' && styles.activeTabText]}>Sequence</Text>
        </Pressable>

        <Pressable 
          style={[styles.tab, activeTab === 'chess' && styles.activeTab]}
          onPress={() => setActiveTab('chess')}>
          <MaterialCommunityIcons 
            name="chess-king" 
            size={16} 
            color={activeTab === 'chess' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.tabText, activeTab === 'chess' && styles.activeTabText]}>Chess</Text>
        </Pressable>

        <Pressable 
          style={[styles.tab, activeTab === 'scrabble' && styles.activeTab]}
          onPress={() => setActiveTab('scrabble')}>
          <MaterialCommunityIcons 
            name="alpha-a-box" 
            size={16} 
            color={activeTab === 'scrabble' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.tabText, activeTab === 'scrabble' && styles.activeTabText]}>Scrabble</Text>
        </Pressable>

        <Pressable 
          style={[styles.tab, activeTab === 'housie' && styles.activeTab]}
          onPress={() => setActiveTab('housie')}>
          <MaterialCommunityIcons 
            name="grid" 
            size={16} 
            color={activeTab === 'housie' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.tabText, activeTab === 'housie' && styles.activeTabText]}>Housie</Text>
        </Pressable>

        <Pressable 
          style={[styles.tab, activeTab === 'codenames' && styles.activeTab]}
          onPress={() => setActiveTab('codenames')}>
          <MaterialCommunityIcons 
            name="incognito" 
            size={16} 
            color={activeTab === 'codenames' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.tabText, activeTab === 'codenames' && styles.activeTabText]}>Codenames</Text>
        </Pressable>
      </ScrollView>

      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={loadCompletedSessions}
          style={styles.errorContainer}
        />
      )}

      {filteredSessions.length === 0 && !loading ? (
        <EmptyState
          icon="history"
          title="No Session History"
          message="Your completed game sessions will appear here"
        />
      ) : (
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF5A5F']}
              tintColor="#FF5A5F"
            />
          }>
          {filteredSessions.map((session) => {
            if ('session_type' in session && session.session_type === 'rummy') {
              return renderRummySession(session as RummySession);
            } else {
              return renderPokerSession(session as SessionWithPlayers);
            }
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f7f7f7',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#FFF8F8',
  },
  tabText: {
    color: '#767676',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF5A5F',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  errorContainer: {
    margin: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyStateTitle: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#767676',
    fontSize: 16,
    textAlign: 'center',
    maxWidth: '80%',
  },
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionDate: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionTime: {
    color: '#767676',
    fontSize: 14,
  },
  sessionTypeContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  sessionTypeText: {
    color: '#484848',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonPressed: {
    opacity: 0.7,
  },
  notOwnedBadge: {
    padding: 4,
  },
  selfDestructedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5A5F',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  selfDestructedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  rummyGameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  gameTypeContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  gameTypeLabel: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '600',
  },
  prizeSplitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  prizeSplitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  playersList: {
    borderTopWidth: 1,
    borderTopColor: '#e4e4e4',
    paddingTop: 16,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    marginRight: 8,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  winnerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  chipCount: {
    color: '#767676',
    fontSize: 14,
    marginBottom: 2,
  },
  scoreText: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '600',
  },
  netAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  profit: {
    color: '#008489',
  },
  loss: {
    color: '#FF5A5F',
  },
  morePlayersText: {
    color: '#767676',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7f7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  detailsButtonText: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});