const KEY = "wframe.token";

export const auth = {
  get: (): string | null => localStorage.getItem(KEY),
  set: (token: string) => localStorage.setItem(KEY, token),
  clear: () => localStorage.removeItem(KEY),
};
