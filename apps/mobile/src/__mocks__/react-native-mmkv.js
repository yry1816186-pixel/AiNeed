const store = {};

module.exports = {
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn((key) => store[key] ?? undefined),
    set: jest.fn((key, value) => {
      store[key] = value;
    }),
    delete: jest.fn((key) => {
      delete store[key];
    }),
    contains: jest.fn((key) => key in store),
    getAllKeys: jest.fn(() => Object.keys(store)),
    clearAll: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  })),
};
