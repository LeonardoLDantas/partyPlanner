import { NotificationSettings } from '../types';

const preferencesKey = 'party-planner-preferences';

const defaultSettings: NotificationSettings = {
  informationalEnabled: true,
};

let memorySettings: NotificationSettings = defaultSettings;

function getAsyncStorage() {
  try {
    const module = require('@react-native-async-storage/async-storage');
    return module.default ?? module;
  } catch {
    return null;
  }
}

export async function loadNotificationSettings() {
  const asyncStorage = getAsyncStorage();
  if (!asyncStorage?.getItem) {
    return memorySettings;
  }

  try {
    const rawSettings = await asyncStorage.getItem(preferencesKey);
    if (!rawSettings) {
      return memorySettings;
    }

    memorySettings = {
      ...defaultSettings,
      ...(JSON.parse(rawSettings) as Partial<NotificationSettings>),
    };

    return memorySettings;
  } catch {
    return memorySettings;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  memorySettings = settings;

  const asyncStorage = getAsyncStorage();
  if (!asyncStorage?.setItem) {
    return;
  }

  try {
    await asyncStorage.setItem(preferencesKey, JSON.stringify(settings));
  } catch {
    return;
  }
}
