import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from './settingsStore';
import i18n from '@/core/i18n';

// Mock i18n
vi.mock('@/core/i18n', () => ({
  default: {
    changeLanguage: vi.fn(),
  },
}));

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    useSettingsStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default settings', () => {
      const state = useSettingsStore.getState();
      expect(state.language).toBe('en');
      expect(state.timezone).toBe('auto');
      expect(state.defaultProjectView).toBe('grid');
      expect(state.theme).toBe('dark');
      expect(state.accentColor).toBe('blue');
      expect(state.compactMode).toBe(false);
      expect(state.showAnimations).toBe(true);
    });
  });

  describe('setLanguage', () => {
    it('should update language and call i18n.changeLanguage', () => {
      const { setLanguage } = useSettingsStore.getState();
      setLanguage('zh');

      expect(useSettingsStore.getState().language).toBe('zh');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('zh');
    });

    it('should handle switching back to English', () => {
      const { setLanguage } = useSettingsStore.getState();
      setLanguage('zh');
      setLanguage('en');

      expect(useSettingsStore.getState().language).toBe('en');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('setTimezone', () => {
    it('should update timezone', () => {
      const { setTimezone } = useSettingsStore.getState();
      setTimezone('America/New_York');

      expect(useSettingsStore.getState().timezone).toBe('America/New_York');
    });
  });

  describe('setDefaultProjectView', () => {
    it('should update default project view to list', () => {
      const { setDefaultProjectView } = useSettingsStore.getState();
      setDefaultProjectView('list');

      expect(useSettingsStore.getState().defaultProjectView).toBe('list');
    });

    it('should update default project view to grid', () => {
      const { setDefaultProjectView } = useSettingsStore.getState();
      setDefaultProjectView('list');
      setDefaultProjectView('grid');

      expect(useSettingsStore.getState().defaultProjectView).toBe('grid');
    });
  });

  describe('setTheme', () => {
    it('should update theme to light', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('light');

      expect(useSettingsStore.getState().theme).toBe('light');
    });

    it('should update theme to auto', () => {
      const { setTheme } = useSettingsStore.getState();
      setTheme('auto');

      expect(useSettingsStore.getState().theme).toBe('auto');
    });
  });

  describe('setAccentColor', () => {
    it('should update accent color', () => {
      const { setAccentColor } = useSettingsStore.getState();
      setAccentColor('purple');

      expect(useSettingsStore.getState().accentColor).toBe('purple');
    });

    it('should handle all accent colors', () => {
      const { setAccentColor } = useSettingsStore.getState();
      const colors: Array<'blue' | 'purple' | 'green' | 'orange'> = ['blue', 'purple', 'green', 'orange'];

      colors.forEach((color) => {
        setAccentColor(color);
        expect(useSettingsStore.getState().accentColor).toBe(color);
      });
    });
  });

  describe('setCompactMode', () => {
    it('should enable compact mode', () => {
      const { setCompactMode } = useSettingsStore.getState();
      setCompactMode(true);

      expect(useSettingsStore.getState().compactMode).toBe(true);
    });

    it('should disable compact mode', () => {
      const { setCompactMode } = useSettingsStore.getState();
      setCompactMode(true);
      setCompactMode(false);

      expect(useSettingsStore.getState().compactMode).toBe(false);
    });
  });

  describe('setShowAnimations', () => {
    it('should disable animations', () => {
      const { setShowAnimations } = useSettingsStore.getState();
      setShowAnimations(false);

      expect(useSettingsStore.getState().showAnimations).toBe(false);
    });

    it('should enable animations', () => {
      const { setShowAnimations } = useSettingsStore.getState();
      setShowAnimations(false);
      setShowAnimations(true);

      expect(useSettingsStore.getState().showAnimations).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all settings to defaults', () => {
      const { setLanguage, setTheme, setAccentColor, setCompactMode, reset } = useSettingsStore.getState();

      // Change multiple settings
      setLanguage('zh');
      setTheme('light');
      setAccentColor('purple');
      setCompactMode(true);

      // Reset
      reset();

      // Verify all settings are back to defaults
      const state = useSettingsStore.getState();
      expect(state.language).toBe('en');
      expect(state.theme).toBe('dark');
      expect(state.accentColor).toBe('blue');
      expect(state.compactMode).toBe(false);
    });
  });
});
