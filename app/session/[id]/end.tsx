import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { ErrorDisplay } from '../../../components/ErrorDisplay';
import { AppError, parseSupabaseError } from '../../../lib/errorHandling';
import { isSessionOwnedByDevice } from '../../../lib/deviceStorage';
import type { Player } from '../../../lib/supabase';

type Settlement = {
  from: Player;
  to: Player;
  amount: number;
};

export default function EndSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [chipCounts, setChipCounts] = useState<Record<string, number>>({});
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Calculate totals from current state
  const totals = useMemo(() => {
    const totalBuyIn = players.reduce((sum, player) => sum + player.total_buy_in, 0);
    const totalChips = Object.values(chipCounts).reduce((sum, chips) => sum + chips, 0);
    const chipDifference = totalChips - totalBuyIn;
    
    return {
      totalBuyIn,
      totalChips,
      chipDifference,
      isBalanced: Math.abs(chipDifference) < 10 // Allow small rounding errors
    };
  }, [players, chipCounts]);

  useEffect(() => {
    loadPlayers();
  }, [id]);

  const loadPlayers = async () => {
    try {
      setError(null);
      
      // Check if this device owns the session
      const ownershipStatus = await isSessionOwnedByDevice(id as string);
      setIsOwner(ownershipStatus);
      
      if (!ownershipStatus) {
        throw new Error('You can only end sessions created on this device');
      }

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', id)
        .order('created_at');

      if (playersError) throw playersError;

      setPlayers(playersData || []);
      
      // Initialize chip counts with empty values
      const initialChipCounts: Record<string, number> = {};
      playersData?.forEach(player => {
        initialChipCounts[player.id] = 0;
      });
      setChipCounts(initialChipCounts);
    } catch (err) {
      console.error('Error loading players:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const updateChipCount = (playerId: string, chips: string) => {
    const numChips = parseInt(chips) || 0;
    setChipCounts(prev => ({
      ...prev,
      [playerId]: numChips
    }));
  };

  const validateChipCounts = () => {
    // Check if all chip counts are entered
    const missingChips = players.some(player => !chipCounts[player.id] && chipCounts[player.id] !== 0);
    if (missingChips) {
      setError(parseSupabaseError(new Error('Please enter chip counts for all players')));
      return false;
    }
    
    // Calculate total buy-in and total chips
    const totalBuyIn = players.reduce((sum, player) => sum + player.total_buy_in, 0);
    const totalChips = Object.values(chipCounts).reduce((sum, chips) => sum + chips, 0);
    const difference = Math.abs(totalChips - totalBuyIn);

    // Allow small rounding errors (less than 10 chips)
    if (difference >= 10) {
      const message = `Total chips (${totalChips}) doesn't match total buy-in (${totalBuyIn}). Please verify the chip counts.`;
      
      if (Platform.OS === 'web') {
        const proceed = window.confirm(`${message}\n\nDo you want to proceed anyway?`);
        return proceed;
      } else {
        Alert.alert(
          'Chip Count Mismatch',
          message,
          [
            {
              text: 'Review Counts',
              style: 'cancel',
            },
            {
              text: 'Proceed Anyway',
              style: 'destructive',
              onPress: () => calculateSettlements(),
            },
          ]
        );
        return false;
      }
    }
    return true;
  };

  const calculateSettlements = () => {
    setError(null);
    
    // Validate all chip counts are entered
    const missingChips = players.some(player => !chipCounts[player.id] && chipCounts[player.id] !== 0);
    if (missingChips) {
      setError(parseSupabaseError(new Error('Please enter chip counts for all players')));
      return;
    }

    // Calculate expected chips and actual balance for each player
    const playerBalances = players.map(player => {
      const expectedChips = player.total_buy_in;
      const actualChips = chipCounts[player.id] || 0;
      const netAmount = actualChips - expectedChips;
      return { ...player, netAmount };
    });

    // Sort players by net amount (descending)
    const sortedPlayers = [...playerBalances].sort((a, b) => 
      (b.netAmount || 0) - (a.netAmount || 0)
    );

    const newSettlements: Settlement[] = [];
    let i = 0;
    let j = sortedPlayers.length - 1;

    // Calculate settlements
    while (i < j) {
      const payer = sortedPlayers[j];
      const receiver = sortedPlayers[i];
      
      // Skip if netAmount is undefined or 0
      if (!payer.netAmount || !receiver.netAmount) {
        // Move to next players if current ones have no balance
        if (payer.netAmount === 0) j--;
        if (receiver.netAmount === 0) i++;
        continue;
      }
      
      const payerOwes = Math.abs(payer.netAmount);
      const receiverGets = receiver.netAmount;
      
      const amount = Math.min(payerOwes, receiverGets);
      
      if (amount > 0) {
        newSettlements.push({
          from: payer,
          to: receiver,
          amount,
        });
        
        sortedPlayers[i].netAmount -= amount;
        sortedPlayers[j].netAmount += amount;
        
        if (sortedPlayers[i].netAmount === 0) i++;
        if (sortedPlayers[j].netAmount === 0) j--;
      } else {
        // If amount is 0 or negative, move to next players to avoid infinite loop
        if (payerOwes === 0) j--;
        if (receiverGets === 0) i++;
      }
    }

    setSettlements(newSettlements);
  };

  const handleCalculate = () => {
    if (validateChipCounts()) {
      calculateSettlements();
    }
  };

  const endSession = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Check if this device owns the session
      const isOwner = await isSessionOwnedByDevice(id as string);
      if (!isOwner) {
        throw new Error('You can only end sessions created on this device');
      }
      
      // Update player final chips and net amounts
      for (const player of players) {
        const finalChips = chipCounts[player.id] || 0;
        const netAmount = finalChips - player.total_buy_in;
        
        const { error: playerError } = await supabase
          .from('players')
          .update({
            final_chips: finalChips,
            net_amount: netAmount
          })
          .eq('id', player.id);

        if (playerError) throw playerError;
      }

      // Create settlement records
      for (const settlement of settlements) {
        const { error: settlementError } = await supabase
          .from('settlements')
          .insert({
            session_id: id,
            from_player_id: settlement.from.id,
            to_player_id: settlement.to.id,
            amount: settlement.amount
          });

        if (settlementError) throw settlementError;
      }

      // Mark session as completed
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', id);

      if (sessionError) throw sessionError;

      // Navigate to summary screen
      router.replace(`/session/${id}/summary`);
    } catch (err) {
      console.error('Error ending session:', err);
      setError(parseSupabaseError(err));
      setSaving(false);
    }
  };

  const confirmEndSession = () => {
    if (settlements.length === 0) {
      setError(parseSupabaseError(new Error('Please calculate settlements first')));
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('This will finalize all chip counts and settlements. Continue?');
      if (confirmed) {
        endSession();
      }
    } else {
      Alert.alert(
        'End Session',
        'This will finalize all chip counts and settlements. Continue?',
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

  if (!isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.notOwnerContainer}>
          <MaterialCommunityIcons name="lock" size={64} color="#767676" />
          <Text style={styles.notOwnerTitle}>Permission Denied</Text>
          <Text style={styles.notOwnerText}>
            You can only end sessions created on this device.
          </Text>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'End Session',
          headerRight: () => (
            <Pressable
              onPress={confirmEndSession}
              disabled={saving || settlements.length === 0}
              style={({ pressed }) => ({
                opacity: (pressed || saving || settlements.length === 0) ? 0.7 : 1,
                paddingHorizontal: 16,
                paddingVertical: 8,
              })}>
              {saving ? (
                <ActivityIndicator color="#FF5A5F" />
              ) : (
                <Text style={[
                  styles.headerButton,
                  settlements.length === 0 && styles.disabledHeaderButton
                ]}>
                  Finish
                </Text>
              )}
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Chip Counts</Text>
          <Text style={styles.sectionSubtitle}>
            Enter the final chip count for each player
          </Text>
        </View>

        {/* Live Chip Count Tracker */}
        <View style={styles.chipTracker}>
          <View style={styles.trackerRow}>
            <Text style={styles.trackerLabel}>Total Buy-in:</Text>
            <Text style={styles.trackerValue}>₹{totals.totalBuyIn.toLocaleString()}</Text>
          </View>
          <View style={styles.trackerRow}>
            <Text style={styles.trackerLabel}>Current Chips:</Text>
            <Text style={[
              styles.trackerValue, 
              !totals.isBalanced && (totals.chipDifference > 0 ? styles.surplus : styles.deficit)
            ]}>
              ₹{totals.totalChips.toLocaleString()}
            </Text>
          </View>
          {!totals.isBalanced && (
            <View style={styles.trackerRow}>
              <Text style={styles.trackerLabel}>Difference:</Text>
              <Text style={[
                styles.trackerValue,
                totals.chipDifference > 0 ? styles.surplus : styles.deficit
              ]}>
                {totals.chipDifference > 0 ? '+' : ''}
                ₹{totals.chipDifference.toLocaleString()}
              </Text>
            </View>
          )}
          <View style={[
            styles.balanceIndicator,
            totals.isBalanced ? styles.balancedIndicator : styles.unbalancedIndicator
          ]}>
            <Text style={[
              styles.balanceIndicatorText,
              totals.isBalanced ? styles.balancedText : styles.unbalancedText
            ]}>
              {totals.isBalanced 
                ? 'Chips are balanced ✓' 
                : `Chips are ${totals.chipDifference > 0 ? 'over' : 'under'} by ₹${Math.abs(totals.chipDifference).toLocaleString()}`}
            </Text>
          </View>
        </View>

        {error && (
          <ErrorDisplay error={error} onRetry={() => setError(null)} />
        )}

        {players.map((player) => (
          <View key={player.id} style={styles.playerInput}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.buyInAmount}>Buy-in: ₹{player.total_buy_in}</Text>
            </View>
            <View style={styles.chipInputContainer}>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                placeholder="Chips"
                placeholderTextColor="#aaaaaa"
                value={chipCounts[player.id]?.toString() || ''}
                onChangeText={(text) => updateChipCount(player.id, text)}
              />
            </View>
          </View>
        ))}

        <Pressable 
          style={styles.calculateButton}
          onPress={handleCalculate}>
          <MaterialCommunityIcons name="calculator" size={20} color="#ffffff" />
          <Text style={styles.calculateButtonText}>Calculate Settlements</Text>
        </Pressable>

        {settlements.length > 0 && (
          <View style={styles.settlementsSection}>
            <Text style={styles.sectionTitle}>Settlements</Text>
            {settlements.map((settlement, index) => (
              <View key={index} style={styles.settlementCard}>
                <View style={styles.settlementPlayers}>
                  <Text style={styles.playerName}>{settlement.from.name}</Text>
                  <Text style={styles.arrowText}>→</Text>
                  <Text style={styles.playerName}>{settlement.to.name}</Text>
                </View>
                <Text style={styles.settlementAmount}>₹{settlement.amount}</Text>
              </View>
            ))}
            
            <Pressable 
              style={[styles.finishButton, saving && styles.disabledButton]}
              onPress={confirmEndSession}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#ffffff" />
                  <Text style={styles.finishButtonText}>Finish & Save</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
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
  notOwnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notOwnerTitle: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  notOwnerText: {
    color: '#767676',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#FF5A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledHeaderButton: {
    color: '#aaaaaa',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#767676',
    fontSize: 16,
  },
  chipTracker: {
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
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackerLabel: {
    color: '#767676',
    fontSize: 16,
  },
  trackerValue: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
  },
  surplus: {
    color: '#008489',
  },
  deficit: {
    color: '#FF5A5F',
  },
  balanceIndicator: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  balancedIndicator: {
    backgroundColor: '#E8F5E9',
  },
  unbalancedIndicator: {
    backgroundColor: '#FFEEEE',
  },
  balanceIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  balancedText: {
    color: '#2E7D32',
  },
  unbalancedText: {
    color: '#D32F2F',
  },
  playerInput: {
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
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerName: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
  },
  buyInAmount: {
    color: '#FF5A5F',
    fontSize: 14,
  },
  chipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#484848',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    gap: 8,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settlementsSection: {
    gap: 12,
    marginBottom: 32,
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
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008489',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});