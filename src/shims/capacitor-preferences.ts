// Web shim for @capacitor/preferences — uses localStorage as the backing store.
export const Preferences = {
  async get(options: { key: string }): Promise<{ value: string | null }> {
    return { value: localStorage.getItem(options.key) };
  },
  async set(options: { key: string; value: string }): Promise<void> {
    localStorage.setItem(options.key, options.value);
  },
  async remove(options: { key: string }): Promise<void> {
    localStorage.removeItem(options.key);
  },
};
