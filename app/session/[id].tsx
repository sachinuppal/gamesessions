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
import { useSettingsStore, BUY_IN_OPTIONS } from '../../lib/settings';
import { isSessionOwnedByDevice } from '../../lib/deviceStorage';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { AppError, parseSupabaseError } from '../../lib/errorHandling';
import type { Session, Player } from '../../lib/supabase';

type RebuyModalProps = {
  visible: boolean;
  onClose: () => void;
  onRebuy: (amount: number) => void;
  defaultAmount: number;
};

const RebuyModal = ({ visible, onClose, onRebuy, defaultAmount }: RebuyModalProps) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(defaultAmount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setSelectedAmount(defaultAmount);
      setCustomAmount('');
      setShowCustomInput(false);
    }
  }, [visible, defaultAmount]);

  const handleRebuy = () => {
    if (showCustomInput && customAmount) {
      const parsedAmount = parseInt(customAmount, 10);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        onRebuy(parsedAmount);
      }
    } else {
      onRebuy(selectedAmount);
    }
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
            <Text style={styles.modalTitle}>Rebuy Amount</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#484848" />
            </Pressable>
          </View>

          <ScrollView style={styles.optionsContainer}>
            {BUY_IN_OPTIONS.map((amount) => (
              <Pressable
                key={amount}
                style={[
                  styles.optionItem,
                  selectedAmount === amount && !showCustomInput && styles.selectedOption,
                ]}
                onPress={() => {
                  setSelectedAmount(amount);
                  setShowCustomInput(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedAmount === amount && !showCustomInput && styles.selectedOptionText,
                  ]}
                >
                  ₹{amount.toLocaleString()}
                </Text>
                {selectedAmount === amount && !showCustomInput && (
                  <MaterialCommunityIcons name="check" size={20} color="#FF5A5F" />
                )}
              </Pressable>
            ))}

            <Pressable
              style={[
                styles.optionItem,
                showCustomInput && styles.selectedOption,
              ]}
              onPress={() => {
                setShowCustomInput(true);
                setCustomAmount(selectedAmount.toString());
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  showCustomInput && styles.selectedOptionText,
                ]}
              >
                Custom Amount
              </Text>
              {showCustomInput && (
                <MaterialCommunityIcons name="check" size={20} color="#FF5A5F" />
              )}
            </Pressable>

            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputPrefix}>₹</Text>
                <TextInput
                  style={styles.customInput}
                  keyboardType="number-pad"
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  placeholder="Enter amount"
                  placeholderTextColor="#aaaaaa"
                  autoFocus
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.rebuyButton} onPress={handleRebuy}>
              <Text style={styles.rebuyButtonText}>Rebuy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

type RemoveRebuyModalProps = {
  visible: boolean;
  onClose: () => void;
  player: Player | null;
  onRemoveRebuy: (amount: number) => void;
};

const RemoveRebuyModal = ({ visible, onClose, player, onRemoveRebuy }: RemoveRebuyModalProps) => {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && player) {
      // Reset state when modal opens
      setAmount('');
      setError(null);
    }
  }, [visible, player]);

  const handleRemoveRebuy = () => {
    if (!player) return;
    
    const parsedAmount = parseInt(amount, 10);
    
    // Validate amount
    if (!amount.trim() || isNaN(parsedAmount)) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (parsedAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    
    const rebuyAmount = player.total_buy_in - player.initial_buy_in;
    
    if (parsedAmount > rebuyAmount) {
      setError(`Cannot remove more than the total rebuy amount (₹${rebuyAmount})`);
      return;
    }
    
    onRemoveRebuy(parsedAmount);
    onClose();
  };

  if (!player) return null;

  const rebuyAmount = player.total_buy_in - player.initial_buy_in;
  const hasRebuy = rebuyAmount > 0;

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
            <Text style={styles.modalTitle}>Remove Rebuy</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#484848" />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.playerNameText}>{player.name}</Text>
            
            {!hasRebuy ? (
              <View style={styles.noRebuyContainer}>
                <MaterialCommunityIcons name="information" size={24} color="#767676" />
                <Text style={styles.noRebuyText}>
                  This player has no rebuys to remove.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.rebuyInfoContainer}>
                  <View style={styles.rebuyInfoRow}>
                    <Text style={styles.rebuyInfoLabel}>Initial Buy-in:</Text>
                    <Text style={styles.rebuyInfoValue}>₹{player.initial_buy_in}</Text>
                  </View>
                  <View style={styles.rebuyInfoRow}>
                    <Text style={styles.rebuyInfoLabel}>Total Rebuys:</Text>
                    <Text style={styles.rebuyInfoValue}>₹{rebuyAmount}</Text>
                  </View>
                  <View style={styles.rebuyInfoRow}>
                    <Text style={styles.rebuyInfoLabel}>Current Total:</Text>
                    <Text style={styles.rebuyInfoValue}>₹{player.total_buy_in}</Text>
                  </View>
                </View>

                <Text style={styles.amountLabel}>Amount to Remove:</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.amountPrefix}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="number-pad"
                    value={amount}
                    onChangeText={(text) => {
                      setAmount(text);
                      setError(null);
                    }}
                    placeholder="Enter amount"
                    placeholderTextColor="#aaaaaa"
                    autoFocus
                  />
                </View>

                {error && (
                  <Text style={styles.errorText}>{error}</Text>
                )}
              </>
            )}
          </View>

          <View style={styles.modalFooter}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            {hasRebuy && (
              <Pressable 
                style={styles.removeButton} 
                onPress={handleRemoveRebuy}
                disabled={!hasRebuy}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [updating, setUpdating] = useState(false);
  const [rebuyModalVisible, setRebuyModalVisible] = useState(false);
  const [removeRebuyModalVisible, setRemoveRebuyModalVisible] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  
  const { defaultRebuyAmount } = useSettingsStore();

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
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', id)
        .order('created_at');

      if (playersError) throw playersError;

      setSession(sessionData);
      setPlayers(playersData || []);
    } catch (err) {
      console.error('Error loading session:', err);
      setError(parseSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const openRebuyModal = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setRebuyModalVisible(true);
  };

  const closeRebuyModal = () => {
    setRebuyModalVisible(false);
    setSelectedPlayerId(null);
  };

  const openRemoveRebuyModal = (player: Player) => {
    setSelectedPlayer(player);
    setRemoveRebuyModalVisible(true);
  };

  const closeRemoveRebuyModal = () => {
    setRemoveRebuyModalVisible(false);
    setSelectedPlayer(null);
  };

  const handleRebuy = async (amount: number) => {
    if (!selectedPlayerId) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      const player = players.find((p) => p.id === selectedPlayerId);
      if (!player) return;

      const { error: updateError } = await supabase
        .from('players')
        .update({
          total_buy_in: player.total_buy_in + amount,
        })
        .eq('id', selectedPlayerId);

      if (updateError) throw updateError;

      setPlayers(
        players.map((p) =>
          p.id === selectedPlayerId
            ? { ...p, total_buy_in: p.total_buy_in + amount }
            : p
        )
      );
    } catch (err) {
      console.error('Error processing rebuy:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveRebuy = async (amount: number) => {
    if (!selectedPlayer) return;
    
    setUpdating(true);
    setError(null);
    
    try {
      // Ensure we don't go below initial buy-in
      const newTotalBuyIn = Math.max(
        selectedPlayer.initial_buy_in, 
        selectedPlayer.total_buy_in - amount
      );
      
      const { error: updateError } = await supabase
        .from('players')
        .update({
          total_buy_in: newTotalBuyIn,
        })
        .eq('id', selectedPlayer.id);

      if (updateError) throw updateError;

      setPlayers(
        players.map((p) =>
          p.id === selectedPlayer.id
            ? { ...p, total_buy_in: newTotalBuyIn }
            : p
        )
      );
    } catch (err) {
      console.error('Error removing rebuy:', err);
      setError(parseSupabaseError(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleEndSession = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you ready to end the session and calculate settlements?');
      if (confirmed) {
        router.push(`/session/${id}/end`);
      }
    } else {
      Alert.alert(
        'End Session',
        'Are you ready to end the session and calculate settlements?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: () => {
              router.push(`/session/${id}/end`);
            },
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

  const totalBuyIn = players.reduce(
    (sum, player) => sum + player.total_buy_in,
    0
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Active Session',
          headerRight: () => (
            isOwner ? (
              <Pressable
                onPress={handleEndSession}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                })}>
                <Text style={styles.headerButton}>End</Text>
              </Pressable>
            ) : null
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Buy-in</Text>
            <Text style={styles.statValue}>₹{totalBuyIn}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Players</Text>
            <Text style={styles.statValue}>{players.length}</Text>
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

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Players</Text>
          {players.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.buyInAmount}>₹{player.total_buy_in}</Text>
              </View>
              {isOwner && (
                <View style={styles.playerActions}>
                  {player.total_buy_in > player.initial_buy_in && (
                    <Pressable
                      style={[styles.removeRebuyButton, updating && styles.buttonDisabled]}
                      onPress={() => openRemoveRebuyModal(player)}
                      disabled={updating}>
                      <MaterialCommunityIcons
                        name="minus-circle"
                        size={20}
                        color="#FF5A5F"
                      />
                      <Text style={styles.actionButtonText}>Remove</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.rebuyButtonSmall, updating && styles.buttonDisabled]}
                    onPress={() => openRebuyModal(player.id)}
                    disabled={updating}>
                    <MaterialCommunityIcons
                      name="plus-circle"
                      size={20}
                      color="#FF5A5F"
                    />
                    <Text style={styles.actionButtonText}>Rebuy</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>

        {isOwner && (
          <Pressable 
            style={styles.endSessionButton}
            onPress={handleEndSession}>
            <MaterialCommunityIcons name="flag-checkered" size={20} color="#ffffff" />
            <Text style={styles.endSessionButtonText}>End Session</Text>
          </Pressable>
        )}

        <RebuyModal
          visible={rebuyModalVisible}
          onClose={closeRebuyModal}
          onRebuy={handleRebuy}
          defaultAmount={defaultRebuyAmount}
        />

        <RemoveRebuyModal
          visible={removeRebuyModalVisible}
          onClose={closeRemoveRebuyModal}
          player={selectedPlayer}
          onRemoveRebuy={handleRemoveRebuy}
        />
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
  },
  header: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
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
    fontSize: 24,
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
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: '600',
  },
  playerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  rebuyButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7f7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  removeRebuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFEEEE',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '500',
  },
  rebuyText: {
    color: '#FF5A5F',
    fontSize: 14,
    fontWeight: '600',
  },
  endSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A5F',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 8,
  },
  endSessionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  playerNameText: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  noRebuyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  noRebuyText: {
    color: '#767676',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  rebuyInfoContainer: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  rebuyInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rebuyInfoLabel: {
    color: '#767676',
    fontSize: 14,
  },
  rebuyInfoValue: {
    color: '#484848',
    fontSize: 14,
    fontWeight: '600',
  },
  amountLabel: {
    color: '#484848',
    fontSize: 16,
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountPrefix: {
    color: '#484848',
    fontSize: 16,
    marginRight: 8,
  },
  amountInput: {
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
  optionsContainer: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e4',
  },
  selectedOption: {
    backgroundColor: '#FFF8F8',
  },
  optionText: {
    color: '#484848',
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#FF5A5F',
    fontWeight: '600',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e4',
  },
  customInputPrefix: {
    color: '#484848',
    fontSize: 16,
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#484848',
    fontSize: 16,
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
  rebuyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF5A5F',
  },
  rebuyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF5A5F',
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});