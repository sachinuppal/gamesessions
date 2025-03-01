import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Modal, Switch, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettingsStore, BUY_IN_OPTIONS } from '../../lib/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

type GameType = 'poker' | 'rummy' | 'bridge' | 'sequence' | 'chess' | 'scrabble' | 'housie' | 'codenames' | 'all';

type SettingModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  currentValue: number;
  onSave: (value: number) => void;
  options: number[];
  allowCustom?: boolean;
};

const SettingModal = ({
  visible,
  onClose,
  title,
  currentValue,
  onSave,
  options,
  allowCustom = true,
}: SettingModalProps) => {
  const [selectedValue, setSelectedValue] = useState<number>(currentValue);
  const [customValue, setCustomValue] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  const handleSave = () => {
    if (showCustomInput && customValue) {
      const parsedValue = parseInt(customValue, 10);
      if (!isNaN(parsedValue) && parsedValue > 0) {
        onSave(parsedValue);
      }
    } else {
      onSave(selectedValue);
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
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#484848" />
            </Pressable>
          </View>

          <ScrollView style={styles.optionsContainer}>
            {options.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.optionItem,
                  selectedValue === option && !showCustomInput && styles.selectedOption,
                ]}
                onPress={() => {
                  setSelectedValue(option);
                  setShowCustomInput(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedValue === option && !showCustomInput && styles.selectedOptionText,
                  ]}
                >
                  ₹{option.toLocaleString()}
                </Text>
                {selectedValue === option && !showCustomInput && (
                  <MaterialCommunityIcons name="check" size={20} color="#FF5A5F" />
                )}
              </Pressable>
            ))}

            {allowCustom && (
              <Pressable
                style={[
                  styles.optionItem,
                  showCustomInput && styles.selectedOption,
                ]}
                onPress={() => {
                  setShowCustomInput(true);
                  setCustomValue(selectedValue.toString());
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
            )}

            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputPrefix}>₹</Text>
                <TextInput
                  style={styles.customInput}
                  keyboardType="number-pad"
                  value={customValue}
                  onChangeText={setCustomValue}
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
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function SettingsScreen() {
  const { defaultBuyIn, defaultRebuyAmount, currency, setDefaultBuyIn, setDefaultRebuyAmount } = useSettingsStore();
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    currentValue: number;
    onSave: (value: number) => void;
    type: 'buyIn' | 'rebuy';
  }>({
    visible: false,
    title: '',
    currentValue: 0,
    onSave: () => {},
    type: 'buyIn',
  });
  const [selectedGameType, setSelectedGameType] = useState<GameType>('all');
  const [darkMode, setDarkMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const openBuyInModal = () => {
    setModalConfig({
      visible: true,
      title: 'Default Buy-in Amount',
      currentValue: defaultBuyIn,
      onSave: setDefaultBuyIn,
      type: 'buyIn',
    });
  };

  const openRebuyModal = () => {
    setModalConfig({
      visible: true,
      title: 'Default Rebuy Amount',
      currentValue: defaultRebuyAmount,
      onSave: setDefaultRebuyAmount,
      type: 'rebuy',
    });
  };

  const closeModal = () => {
    setModalConfig({ ...modalConfig, visible: false });
  };

  const clearAppData = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to clear all app data? This will remove all locally stored preferences and session ownership information.');
      if (confirmed) {
        await AsyncStorage.clear();
        alert('App data cleared successfully. Please restart the app.');
      }
    } else {
      Alert.alert(
        'Clear App Data',
        'Are you sure you want to clear all app data? This will remove all locally stored preferences and session ownership information.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Clear Data',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.clear();
              Alert.alert('Success', 'App data cleared successfully. Please restart the app.');
            },
          },
        ]
      );
    }
  };

  const renderPokerSettings = () => {
    const settings = [
      {
        title: 'Default Buy-in Amount',
        value: `₹${defaultBuyIn.toLocaleString()}`,
        onPress: openBuyInModal,
      },
      {
        title: 'Default Rebuy Amount',
        value: `₹${defaultRebuyAmount.toLocaleString()}`,
        onPress: openRebuyModal,
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Poker Settings</Text>
        {settings.map((setting, index) => (
          <Pressable
            key={setting.title}
            style={[
              styles.settingItem,
              index === settings.length - 1 && styles.lastItem,
            ]}
            onPress={setting.onPress}
          >
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{setting.value}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#767676" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderRummySettings = () => {
    const settings = [
      {
        title: 'Default Entry Fee',
        value: '₹500',
        onPress: () => {},
      },
      {
        title: 'Default Game Type',
        value: 'Pool 101',
        onPress: () => {},
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Rummy Settings</Text>
        {settings.map((setting, index) => (
          <Pressable
            key={setting.title}
            style={[
              styles.settingItem,
              index === settings.length - 1 && styles.lastItem,
            ]}
            onPress={setting.onPress}
          >
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{setting.value}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#767676" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderScrabbleSettings = () => {
    const settings = [
      {
        title: 'Default Entry Fee',
        value: '₹500',
        onPress: () => {},
      },
      {
        title: 'Default Game Type',
        value: 'Standard',
        onPress: () => {},
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Scrabble Settings</Text>
        {settings.map((setting, index) => (
          <Pressable
            key={setting.title}
            style={[
              styles.settingItem,
              index === settings.length - 1 && styles.lastItem,
            ]}
            onPress={setting.onPress}
          >
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{setting.value}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#767676" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderBridgeSettings = () => {
    const settings = [
      {
        title: 'Default Entry Fee',
        value: '₹500',
        onPress: () => {},
      },
      {
        title: 'Default Game Type',
        value: 'Rubber Bridge',
        onPress: () => {},
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Bridge Settings</Text>
        {settings.map((setting, index) => (
          <Pressable
            key={setting.title}
            style={[
              styles.settingItem,
              index === settings.length - 1 && styles.lastItem,
            ]}
            onPress={setting.onPress}
          >
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{setting.value}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#767676" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderSequenceSettings = () => {
    const settings = [
      {
        title: 'Default Entry Fee',
        value: '₹500',
        onPress: () => {},
      },
      {
        title: 'Default Game Type',
        value: 'Team Play',
        onPress: () => {},
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Sequence Settings</Text>
        {settings.map((setting, index) => (
          <Pressable
            key={setting.title}
            style={[
              styles.settingItem,
              index === settings.length - 1 && styles.lastItem,
            ]}
            onPress={setting.onPress}
          >
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{setting.value}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#767676" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderChessSettings = () => {
    const settings = [
      {
        title: 'Default Entry Fee',
        value: '₹500',
        onPress: () => {},
      },
      {
        title: 'Default Time Control',
        value: '15+10',
        onPress: () => {},
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Chess Settings</Text>
        {settings.map((setting, index) => (
          <Pressable
            key={setting.title}
            style={[
              styles.settingItem,
              index === settings.length - 1 && styles.lastItem,
            ]}
            onPress={setting.onPress}
          >
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{setting.value}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#767676" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderHousieSettings = () => {
    const settings = [
      {
        title: 'Default Ticket Price',
        value: '₹100',
        onPress: () => {},
      },
      {
        title: 'Prize Distribution',
        value: 'Standard',
        onPress: () => {},
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Housie Settings</Text>
        {settings.map((setting, index) => (
          <Pressable
            key={setting.title}
            style={[
              styles.settingItem,
              index === settings.length - 1 && styles.lastItem,
            ]}
            onPress={setting.onPress}
          >
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{setting.value}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#767676" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderCodenamesSettings = () => {
    const settings = [
      {
        title: 'Default Entry Fee',
        value: '₹500',
        onPress: () => {},
      },
      {
        title: 'Team Size',
        value: '4 players',
        onPress: () => {},
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Codenames Settings</Text>
        {settings.map((setting, index) => (
          <Pressable
            key={setting.title}
            style={[
              styles.settingItem,
              index === settings.length - 1 && styles.lastItem,
            ]}
            onPress={setting.onPress}
          >
            <Text style={styles.settingTitle}>{setting.title}</Text>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{setting.value}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#767676" />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderGeneralSettings = () => {
    const settings = [
      {
        title: 'Currency',
        value: `${currency} (INR)`,
        type: 'info',
      },
      {
        title: 'Dark Mode',
        type: 'toggle',
        value: darkMode,
        onToggle: () => setDarkMode(!darkMode),
        disabled: true,
      },
      {
        title: 'Offline Mode',
        type: 'toggle',
        value: offlineMode,
        onToggle: () => setOfflineMode(!offlineMode),
        disabled: true,
      },
      {
        title: 'Clear App Data',
        type: 'action',
        onPress: clearAppData,
        danger: true,
      },
      {
        title: 'App Version',
        value: '1.0.0',
        type: 'info',
      },
    ];

    return (
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>General Settings</Text>
        {settings.map((setting, index) => {
          if (setting.type === 'toggle') {
            return (
              <View
                key={setting.title}
                style={[
                  styles.settingItem,
                  index === settings.length - 1 && styles.lastItem,
                ]}
              >
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Switch
                  value={setting.value}
                  onValueChange={setting.onToggle}
                  trackColor={{ false: '#e4e4e4', true: '#FF5A5F' }}
                  thumbColor={'#ffffff'}
                  disabled={setting.disabled}
                />
              </View>
            );
          } else if (setting.type === 'action') {
            return (
              <Pressable
                key={setting.title}
                style={[
                  styles.settingItem,
                  index === settings.length - 1 && styles.lastItem,
                ]}
                onPress={setting.onPress}
              >
                <Text style={[
                  styles.settingTitle,
                  setting.danger && styles.dangerText
                ]}>
                  {setting.title}
                </Text>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={20} 
                  color={setting.danger ? "#FF5A5F" : "#767676"} 
                />
              </Pressable>
            );
          } else {
            return (
              <View
                key={setting.title}
                style={[
                  styles.settingItem,
                  index === settings.length - 1 && styles.lastItem,
                ]}
              >
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Text style={styles.settingValue}>{setting.value}</Text>
              </View>
            );
          }
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.gameSelector}>
        <Pressable
          style={[styles.gameOption, selectedGameType === 'all' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('all')}>
          <MaterialCommunityIcons 
            name="cog" 
            size={20} 
            color={selectedGameType === 'all' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'all' && styles.selectedGameOptionText]}>
            All Settings
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.gameOption, selectedGameType === 'poker' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('poker')}>
          <MaterialCommunityIcons 
            name="cards-playing" 
            size={20} 
            color={selectedGameType === 'poker' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'poker' && styles.selectedGameOptionText]}>
            Poker
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.gameOption, selectedGameType === 'rummy' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('rummy')}>
          <MaterialCommunityIcons 
            name="cards" 
            size={20} 
            color={selectedGameType === 'rummy' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'rummy' && styles.selectedGameOptionText]}>
            Rummy
          </Text>
        </Pressable>

        <Pressable
          style={[styles.gameOption, selectedGameType === 'scrabble' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('scrabble')}>
          <MaterialCommunityIcons 
            name="alpha-a-box" 
            size={20} 
            color={selectedGameType === 'scrabble' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'scrabble' && styles.selectedGameOptionText]}>
            Scrabble
          </Text>
        </Pressable>

        <Pressable
          style={[styles.gameOption, selectedGameType === 'bridge' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('bridge')}>
          <MaterialCommunityIcons 
            name="cards-outline" 
            size={20} 
            color={selectedGameType === 'bridge' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'bridge' && styles.selectedGameOptionText]}>
            Bridge
          </Text>
        </Pressable>

        <Pressable
          style={[styles.gameOption, selectedGameType === 'sequence' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('sequence')}>
          <MaterialCommunityIcons 
            name="cards-playing-outline" 
            size={20} 
            color={selectedGameType === 'sequence' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'sequence' && styles.selectedGameOptionText]}>
            Sequence
          </Text>
        </Pressable>

        <Pressable
          style={[styles.gameOption, selectedGameType === 'chess' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('chess')}>
          <MaterialCommunityIcons 
            name="chess-king" 
            size={20} 
            color={selectedGameType === 'chess' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'chess' && styles.selectedGameOptionText]}>
            Chess
          </Text>
        </Pressable>

        <Pressable
          style={[styles.gameOption, selectedGameType === 'housie' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('housie')}>
          <MaterialCommunityIcons 
            name="grid" 
            size={20} 
            color={selectedGameType === 'housie' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'housie' && styles.selectedGameOptionText]}>
            Housie
          </Text>
        </Pressable>

        <Pressable
          style={[styles.gameOption, selectedGameType === 'codenames' && styles.selectedGameOption]}
          onPress={() => setSelectedGameType('codenames')}>
          <MaterialCommunityIcons 
            name="incognito" 
            size={20} 
            color={selectedGameType === 'codenames' ? '#FF5A5F' : '#767676'} 
          />
          <Text style={[styles.gameOptionText, selectedGameType === 'codenames' && styles.selectedGameOptionText]}>
            Codenames
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.settingsContainer}>
        {(selectedGameType === 'all' || selectedGameType === 'poker') && renderPokerSettings()}
        {(selectedGameType === 'all' || selectedGameType === 'rummy') && renderRummySettings()}
        {(selectedGameType === 'all' || selectedGameType === 'scrabble') && renderScrabbleSettings()}
        {(selectedGameType === 'all' || selectedGameType === 'bridge') && renderBridgeSettings()}
        {(selectedGameType === 'all' || selectedGameType === 'sequence') && renderSequenceSettings()}
        {(selectedGameType === 'all' || selectedGameType === 'chess') && renderChessSettings()}
        {(selectedGameType === 'all' || selectedGameType === 'housie') && renderHousieSettings()}
        {(selectedGameType === 'all' || selectedGameType === 'codenames') && renderCodenamesSettings()}
        {selectedGameType === 'all' && renderGeneralSettings()}
      </ScrollView>

      <SettingModal
        visible={modalConfig.visible}
        onClose={closeModal}
        title={modalConfig.title}
        currentValue={modalConfig.currentValue}
        onSave={modalConfig.onSave}
        options={BUY_IN_OPTIONS}
        allowCustom={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  gameSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 8,
  },
  gameOption: {
    flex: 1,
    minWidth: '22%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e4',
  },
  selectedGameOption: {
    backgroundColor: '#FFF8F8',
    borderColor: '#FF5A5F',
  },
  gameOptionText: {
    color: '#767676',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  selectedGameOptionText: {
    color: '#FF5A5F',
  },
  settingsContainer: {
    flex: 1,
    padding: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#484848',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
    borderRadius: 12,
  },
  settingTitle: {
    color: '#484848',
    fontSize: 16,
  },
  dangerText: {
    color: '#FF5A5F',
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
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
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF5A5F',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});