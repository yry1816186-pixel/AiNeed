module.exports = {
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'mock-compressed-uri',
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
};
