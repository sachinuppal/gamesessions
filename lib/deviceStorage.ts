import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Key for storing the device ID
const DEVICE_ID_KEY = 'poker_tracker_device_id';
const SESSION_OWNERSHIP_PREFIX = 'session_owner_';

/**
 * Get or create a unique device identifier
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    // Try to get existing device ID
    const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (existingId) {
      return existingId;
    }
    
    // Generate a new UUID for this device
    const newId = uuidv4();
    
    // Store the new device ID
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    
    return newId;
  } catch (error) {
    console.error('Error getting/creating device ID:', error);
    // Fallback to a temporary ID if storage fails
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
};

/**
 * Mark a session as owned by the current device
 */
export const markSessionAsOwned = async (sessionId: string): Promise<void> => {
  try {
    const deviceId = await getDeviceId();
    await AsyncStorage.setItem(`${SESSION_OWNERSHIP_PREFIX}${sessionId}`, deviceId);
  } catch (error) {
    console.error('Error marking session as owned:', error);
  }
};

/**
 * Check if the current device owns a session
 */
export const isSessionOwnedByDevice = async (sessionId: string): Promise<boolean> => {
  try {
    const deviceId = await getDeviceId();
    const ownerId = await AsyncStorage.getItem(`${SESSION_OWNERSHIP_PREFIX}${sessionId}`);
    
    return ownerId === deviceId;
  } catch (error) {
    console.error('Error checking session ownership:', error);
    return false;
  }
};

/**
 * Get the IP address of the client (web only)
 * Note: This is a simplified approach and may not work in all environments
 */
export const getClientIp = async (): Promise<string | null> => {
  if (Platform.OS !== 'web') {
    return null;
  }
  
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting client IP:', error);
    return null;
  }
};