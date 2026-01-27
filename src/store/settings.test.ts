import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settings';

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      delimiter: '-',
      prefix: '',
      suffix: '',
    });
  });

  describe('default values', () => {
    it('should have correct defaults', () => {
      const { delimiter, prefix, suffix } = useSettingsStore.getState();
      expect(delimiter).toBe('-');
      expect(prefix).toBe('');
      expect(suffix).toBe('');
    });
  });

  describe('setDelimiter', () => {
    it('should update delimiter', () => {
      const { setDelimiter } = useSettingsStore.getState();
      setDelimiter('_');

      const { delimiter } = useSettingsStore.getState();
      expect(delimiter).toBe('_');
    });
  });

  describe('setPrefix', () => {
    it('should update prefix', () => {
      const { setPrefix } = useSettingsStore.getState();
      setPrefix('SKU-');

      const { prefix } = useSettingsStore.getState();
      expect(prefix).toBe('SKU-');
    });
  });

  describe('setSuffix', () => {
    it('should update suffix', () => {
      const { setSuffix } = useSettingsStore.getState();
      setSuffix('-V1');

      const { suffix } = useSettingsStore.getState();
      expect(suffix).toBe('-V1');
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings at once', () => {
      const { updateSettings } = useSettingsStore.getState();
      updateSettings({
        delimiter: '_',
        prefix: 'PRD-',
        suffix: '-2024',
      });

      const { delimiter, prefix, suffix } = useSettingsStore.getState();
      expect(delimiter).toBe('_');
      expect(prefix).toBe('PRD-');
      expect(suffix).toBe('-2024');
    });

    it('should update partial settings', () => {
      const { updateSettings } = useSettingsStore.getState();
      updateSettings({ prefix: 'NEW-' });

      const { delimiter, prefix, suffix } = useSettingsStore.getState();
      expect(delimiter).toBe('-');
      expect(prefix).toBe('NEW-');
      expect(suffix).toBe('');
    });
  });

  describe('getSettings', () => {
    it('should return settings as AppSettings object', () => {
      const { updateSettings, getSettings } = useSettingsStore.getState();
      updateSettings({ delimiter: '|', prefix: 'X', suffix: 'Y' });

      const settings = getSettings();
      expect(settings).toEqual({
        delimiter: '|',
        prefix: 'X',
        suffix: 'Y',
      });
    });
  });
});
