import { View, Text, StyleSheet, Pressable, FlatList, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { autoTerminateSessions } from '../lib/utils';
import { isSessionOwnedByDevice } from '../lib/deviceStorage';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { AppError, parseSupabaseError } from '../lib/errorHandling';

type HousieSessionWithPlayers = {
  id: string;
  created_at: string;
  ended_at: string | null;
  status: 'active' | 'completed';
  deleted_at: string | null;
  self_destructed: boolean;
  ticket_price: number;
  player_count: number;
  current_number: number;
  players: any[];
};

export default function HousieSessionsScreen() {
  const { newSession } = useLocalSearchParams<{ newSession?: string }>();
  const [activeSessions, setActiveSessions] = useState<HousieSessionWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [sessionOwnership, setSessionOwnership] = useState<Record<string, boolean>>({});
  const [showNewSessionNotification, setShowNewSessionNotification] = useState(false);

  useEffect(() => {
    // Check if we're returning from creating a new session
    if (newSession === 'true') {
      setShowNewSessionNotification(true);
      
      // Auto-hide notification after 10 seconds
      const timer = setTimeout(() => {
        setShowNewSessionNotification(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [newSession]);

  useEffect(() => {
    // Run auto-termination check when component mounts
    autoTerminateSessions().then(() => {
      loadActiveSessions();
    });
  }, []);

  const loadActiveSessions = async () => {
    try {
      setError(null);
      
      const { data: sessions, error: sessionsError } = await supabase
        .from('housie_sessions')
        .select('*')
        .eq('status', 'active')
        .is('deleted_at', null)  // Only fetch non-deleted sessions
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionsWithPlayers = await Promise.all(
        (sessions || []).map(async (session) => {
          const { data: players, error: playersError } = await supabase
            .from('housie_players')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at');

          if (playersError) throw playersError;

          return {
            ...session,
            players: players || [],
          };
        })
      );

      setActiveSessions(sessionsWithPlayers);
      setShowNewSessionNotification(false);

      // Check ownership for each session
      const ownershipStatus: Record<string, boolean> = {};
      for (const session of sessionsWithPlayers) {
        ownershipStatus[session.id] = await isSessionOwnedByDevice(session.id);
      }
      setSessionOwnership(ownershipStatus);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      // Check if this device owns the session
      const isOwner = await isSessionOwnedByDevice(sessionId);
      
      if (!isOwner) {
        throw new Error('You can only delete sessions created on this device');
      }
      
      // Soft delete by updating the deleted_at timestamp
      const { error: deleteError } = await supabase
        .from('housie_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (deleteError) throw deleteError;

      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      setError(parseSupabaseError(err));
    }
  };

  const confirmDelete = (sessionId: string) => {
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
      const confirmed = window.confirm('Are you sure you want to delete this session?');
      if (confirmed) {
        deleteSession(sessionId);
      }
    } else {
      Alert.alert(
        'Delete Session',
        'Are you sure you want to delete this session?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteSession(sessionId),
          },
        ]
      );
    }
  };

  const renderSession = ({ item: session }: { item: HousieSessionWithPlayers }) => {
    const totalPrize = session.players.reduce((sum, player) => sum + (player.ticket_count * session.ticket_price), 0);
    const isOwner = sessionOwnership[session.id];

    return (
      <Pressable
        style={styles.sessionCard}
        onPress={() => router.push(`/housie-session/${session.id}`)}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionTime}>
            {new Date(session.created_at).toLocaleTimeString()}
          </Text>
          <View style={styles.headerActions}>
            <Text style={styles.playerCount}>
              {session.players.length} Players
            </Text>
            {isOwner ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  confirmDelete(session.id);
                }}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}>
                <MaterialCommunityIcons name="delete" size={20} color="#FF5A5F" />
              </Pressable>
            ) : (
              <View style={styles.notOwnedBadge}>
                <MaterialCommunityIcons name="lock" size={16} color="#767676" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.gameInfoContainer}>
          <View style={styles.gameInfoItem}>
            <Text style={styles.gameInfoLabel}>Ticket Price</Text>
            <Text style={styles.gameInfoValue}>₹{session.ticket_price}</Text>
          </View>
          <View style={styles.gameInfoItem}>
            <Text style={styles.gameInfoLabel}>Current Number</Text>
            <Text style={styles.gameInfoValue}>{session.current_number || 'Not started'}</Text>
          </View>
        </View>

        <View style={styles.playerList}>
          {session.players.slice(0, 3).map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.ticketCount}>{player.ticket_count} tickets</Text>
            </View>
          ))}
          {session.players.length > 3 && (
            <Text style={styles.morePlayersText}>+{session.players.length - 3} more players</Text>
          )}
        </View>

        <View style={styles.sessionFooter}>
          <Text style={styles.totalLabel}>Total Prize Pool</Text>
          <Text style={styles.totalAmount}>₹{totalPrize}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/new-housie-session?redirect=true" asChild>
          <Pressable style={styles.newSessionButton}>
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
            <Text style={styles.newSessionText}>New Housie Game</Text>
          </Pressable>
        </Link>
        <Pressable 
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.refreshButtonPressed,
          ]}
          onPress={loadActiveSessions}>
          <MaterialCommunityIcons name="refresh" size={24} color="#FF5A5F" />
        </Pressable>
      </View>

      {showNewSessionNotification && (
        <View style={styles.notificationBanner}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.notificationText}>
            New housie game created! Pull down to refresh and see active games.
          </Text>
          <Pressable 
            onPress={() => setShowNewSessionNotification(false)}
            style={styles.closeNotification}>
            <MaterialCommunityIcons name="close" size={18} color="#767676" />
          </Pressable>
        </View>
      )}

      {error && (
        <ErrorDisplay error={error} onRetry={loadActiveSessions} />
      )}

      {!loading && activeSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="grid" size={64} color="#FF5A5F" />
          <Text style={styles.emptyStateTitle}>No Active Housie Games</Text>
          <Text style={styles.emptyStateText}>
            Start a new housie game to begin tracking numbers and winners
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeSessions}
          renderItem={renderSession}
          keyExtractor={(session) => session.id}
          contentContainerStyle={styles.sessionList}
          refreshing={loading}
          onRefresh={loadActiveSessions}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  newSessionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
  },
  newSessionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  refreshButtonPressed: {
    opacity: 0.7,
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  notificationText: {
    flex: 1,
    color: '#2E7D32',
    fontSize: 14,
    marginLeft: 8,
  },
  closeNotification: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  sessionList: {
    gap: 16,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
  sessionTime: {
    color: '#767676',
    fontSize: 14,
  },
  playerCount: {
    color: '#FF5A5F',
    fontSize: 14,
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
  gameInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  gameInfoItem: {
    alignItems: 'center',
  },
  gameInfoLabel: {
    color: '#767676',
    fontSize: 12,
    marginBottom: 4,
  },
  gameInfoValue: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '600',
  },
  playerList: {
    gap: 8,
    marginBottom: 16,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    color: '#484848',
    fontSize: 16,
  },
  ticketCount: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '500',
  },
  morePlayersText: {
    color: '#767676',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e4',
  },
  totalLabel: {
    color: '#767676',
    fontSize: 14,
  },
  totalAmount: {
    color: '#FF5A5F',
    fontSize: 18,
    fontWeight: '600',
  },
});