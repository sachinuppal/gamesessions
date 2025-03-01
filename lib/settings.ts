import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BUY_IN_OPTIONS = [100, 500, 1000, 2000, 4000, 5000, 10000];

export type SettingsState = {
  defaultBuyIn: number;
  defaultRebuyAmount: number;
  currency: string;
  setDefaultBuyIn: (amount: number) => void;
  setDefaultRebuyAmount: (amount: number) => void;
  setCurrency: (currency: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultBuyIn: 2000,
      defaultRebuyAmount: 2000,
      currency: '₹',
      setDefaultBuyIn: (amount) => set({ defaultBuyIn: amount }),
      setDefaultRebuyAmount: (amount) => set({ defaultRebuyAmount: amount }),
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'poker-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);