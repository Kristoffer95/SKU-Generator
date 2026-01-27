import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types';

interface SettingsState extends AppSettings {
  setDelimiter: (delimiter: string) => void;
  setPrefix: (prefix: string) => void;
  setSuffix: (suffix: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getSettings: () => AppSettings;
}

const defaultSettings: AppSettings = {
  delimiter: '-',
  prefix: '',
  suffix: '',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setDelimiter: (delimiter: string) => {
        set({ delimiter });
      },

      setPrefix: (prefix: string) => {
        set({ prefix });
      },

      setSuffix: (suffix: string) => {
        set({ suffix });
      },

      updateSettings: (settings: Partial<AppSettings>) => {
        set(settings);
      },

      getSettings: () => {
        const { delimiter, prefix, suffix } = get();
        return { delimiter, prefix, suffix };
      },
    }),
    {
      name: 'sku-settings',
    }
  )
);
