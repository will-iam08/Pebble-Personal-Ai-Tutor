import {
  AIProviderId,
  AIProviderSettings,
  createDefaultAISettings,
  PROVIDER_CATALOG,
} from '../types/ai';
import {
  LearnerLevel,
  PetState,
  ReminderSettings,
  ThemeMode,
  TutorProfile,
  TutorStyle,
} from '../types/study';

const PET_KEY = 'pebble_study_pet_v2';
const MUTE_KEY = 'pebble_study_muted_v2';
const THEME_KEY = 'pebble_study_theme_v2';
const REMINDER_KEY = 'pebble_reminder_settings_v2';
const AI_SETTINGS_KEY = 'pebble_ai_provider_settings_v1';
const TUTOR_PROFILE_KEY = 'pebble_tutor_profile_v1';

export const DEFAULT_TUTOR_PROFILE: TutorProfile = {
  learnerLevel: 'undergrad',
  tutorStyle: 'socratic',
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  intervalHours: 6,
  lastCheckInAt: Date.now(),
};

export const DEFAULT_PET_STATE: PetState = {
  name: 'Pebble',
  fullness: 86,
  mood: 88,
  xp: 10,
  level: 1,
  treats: 4,
  ownedAccessories: [],
  equippedAccessories: [],
  lastSavedAt: Date.now(),
  summariesGenerated: 0,
  quizzesCompleted: 0,
  questionsCorrect: 0,
  flashcardsMastered: 0,
};

export function loadPetState(): PetState {
  try {
    const raw = localStorage.getItem(PET_KEY);
    if (!raw) return { ...DEFAULT_PET_STATE, lastSavedAt: Date.now() };
    const parsed = JSON.parse(raw) as Partial<PetState>;
    const now = Date.now();
    const last = typeof parsed.lastSavedAt === 'number' ? parsed.lastSavedAt : now;
    const elapsedMinutes = Math.max(0, (now - last) / 60000);
    const gentleDecay = Math.min(30, Math.floor(elapsedMinutes * 0.25));

    return {
      ...DEFAULT_PET_STATE,
      ...parsed,
      fullness: Math.max(40, Math.min(100, (parsed.fullness ?? 86) - gentleDecay)),
      mood: Math.max(40, Math.min(100, (parsed.mood ?? 88) - Math.floor(gentleDecay * 0.7))),
      lastSavedAt: now,
    };
  } catch {
    return { ...DEFAULT_PET_STATE, lastSavedAt: Date.now() };
  }
}

export function savePetState(pet: PetState): void {
  try {
    localStorage.setItem(PET_KEY, JSON.stringify({ ...pet, lastSavedAt: Date.now() }));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch {
    // Ignore
  }
}

export function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore
  }
}

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (!raw) return { ...DEFAULT_REMINDER_SETTINGS, lastCheckInAt: Date.now() };
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    const hours = Math.min(72, Math.max(1, Math.round(Number(parsed.intervalHours) || 6)));
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      intervalHours: hours,
      lastCheckInAt: Date.now(),
    };
  } catch {
    return { ...DEFAULT_REMINDER_SETTINGS, lastCheckInAt: Date.now() };
  }
}

export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

const VALID_PROVIDERS = new Set<AIProviderId>(PROVIDER_CATALOG.map((p) => p.id));

export function loadAISettings(isExtension: boolean): AIProviderSettings {
  const defaults = createDefaultAISettings(isExtension);
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AIProviderSettings>;

    let provider: AIProviderId =
      parsed.provider && VALID_PROVIDERS.has(parsed.provider)
        ? parsed.provider
        : defaults.provider;

    // Local Express server mode is only available in web mode
    if (isExtension && provider === 'server') {
      provider = 'gemini';
    }

    return {
      provider,
      models: {
        ...defaults.models,
        ...(parsed.models || {}),
      },
      apiKeys: {
        ...(parsed.apiKeys || {}),
      },
      ollamaBaseUrl:
        typeof parsed.ollamaBaseUrl === 'string' && parsed.ollamaBaseUrl.trim()
          ? parsed.ollamaBaseUrl.trim()
          : defaults.ollamaBaseUrl,
      bridgeBaseUrl:
        typeof parsed.bridgeBaseUrl === 'string' && parsed.bridgeBaseUrl.trim()
          ? parsed.bridgeBaseUrl.trim()
          : defaults.bridgeBaseUrl,
    };
  } catch {
    return defaults;
  }
}

export function saveAISettings(settings: AIProviderSettings): void {
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

const VALID_LEVELS = new Set<LearnerLevel>(['high_school', 'undergrad', 'grad']);
const VALID_STYLES = new Set<TutorStyle>(['socratic', 'direct']);

export function loadTutorProfile(): TutorProfile {
  try {
    const raw = localStorage.getItem(TUTOR_PROFILE_KEY);
    if (!raw) return { ...DEFAULT_TUTOR_PROFILE };
    const parsed = JSON.parse(raw) as Partial<TutorProfile>;
    return {
      learnerLevel:
        parsed.learnerLevel && VALID_LEVELS.has(parsed.learnerLevel)
          ? parsed.learnerLevel
          : DEFAULT_TUTOR_PROFILE.learnerLevel,
      tutorStyle:
        parsed.tutorStyle && VALID_STYLES.has(parsed.tutorStyle)
          ? parsed.tutorStyle
          : DEFAULT_TUTOR_PROFILE.tutorStyle,
    };
  } catch {
    return { ...DEFAULT_TUTOR_PROFILE };
  }
}

export function saveTutorProfile(profile: TutorProfile): void {
  try {
    localStorage.setItem(TUTOR_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore
  }
}
