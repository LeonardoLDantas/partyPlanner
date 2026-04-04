import { AuthSession } from '../types';

const sessionKey = 'party-planner-session';

let accessToken = '';
let memorySession: AuthSession | null = null;

function getAsyncStorage() {
  try {
    const module = require('@react-native-async-storage/async-storage');
    return module.default ?? module;
  } catch {
    return null;
  }
}

export function setAccessToken(nextToken: string) {
  accessToken = nextToken;
}

export function getAccessToken() {
  return accessToken;
}

export async function saveSession(session: AuthSession) {
  setAccessToken(session.accessToken);
  memorySession = session;

  const asyncStorage = getAsyncStorage();
  if (!asyncStorage?.setItem) {
    return;
  }

  try {
    await asyncStorage.setItem(sessionKey, JSON.stringify(session));
  } catch {
    return;
  }
}

export async function loadSession() {
  const asyncStorage = getAsyncStorage();
  if (!asyncStorage?.getItem) {
    setAccessToken(memorySession?.accessToken ?? '');
    return memorySession;
  }

  let rawSession: string | null = null;

  try {
    rawSession = await asyncStorage.getItem(sessionKey);
  } catch {
    setAccessToken(memorySession?.accessToken ?? '');
    return memorySession;
  }

  if (!rawSession) {
    setAccessToken(memorySession?.accessToken ?? '');
    return null;
  }

  const session = JSON.parse(rawSession) as AuthSession;
  memorySession = session;
  setAccessToken(session.accessToken);
  return session;
}

export async function clearSession() {
  setAccessToken('');
  memorySession = null;

  const asyncStorage = getAsyncStorage();
  if (!asyncStorage?.removeItem) {
    return;
  }

  try {
    await asyncStorage.removeItem(sessionKey);
  } catch {
    return;
  }
}
