export const ONBOARDING_STORAGE_VERSION = 1;
const ONBOARDING_STORAGE_PREFIX = "task-manager:onboarding";

const safeParse = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const getOnboardingStorageKey = (userId) => {
  if (!userId) return "";
  return `${ONBOARDING_STORAGE_PREFIX}:${userId}`;
};

export const readOnboardingRecord = (storageKey) => {
  if (!storageKey) return null;

  const parsed = safeParse(localStorage.getItem(storageKey));
  if (!parsed || typeof parsed !== "object") return null;

  if (parsed.version !== ONBOARDING_STORAGE_VERSION) return null;
  return parsed;
};

export const writeOnboardingRecord = (storageKey, record) => {
  if (!storageKey || !record) return;

  localStorage.setItem(
    storageKey,
    JSON.stringify({
      version: ONBOARDING_STORAGE_VERSION,
      ...record,
    })
  );
};

export const removeOnboardingRecord = (storageKey) => {
  if (!storageKey) return;
  localStorage.removeItem(storageKey);
};
