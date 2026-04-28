module.exports = {
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
};
