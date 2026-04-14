import { logger } from "../logger";

describe("logger", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe("when __DEV__ is true", () => {
    beforeEach(() => {
      (global as any).__DEV__ = true;
    });

    it("should output log messages", () => {
      logger.log("test log message");
      expect(consoleLogSpy).toHaveBeenCalledWith("test log message");
    });

    it("should output warn messages", () => {
      logger.warn("test warn message");
      expect(consoleWarnSpy).toHaveBeenCalledWith("test warn message");
    });

    it("should output debug messages", () => {
      logger.debug("test debug message");
      expect(consoleDebugSpy).toHaveBeenCalledWith("test debug message");
    });

    it("should output info messages", () => {
      logger.info("test info message");
      expect(consoleInfoSpy).toHaveBeenCalledWith("test info message");
    });

    it("should always output error messages", () => {
      logger.error("test error message");
      expect(consoleErrorSpy).toHaveBeenCalledWith("test error message");
    });

    it("should pass multiple arguments", () => {
      logger.log("arg1", "arg2", "arg3");
      expect(consoleLogSpy).toHaveBeenCalledWith("arg1", "arg2", "arg3");
    });
  });

  describe("when __DEV__ is false", () => {
    beforeEach(() => {
      (global as any).__DEV__ = false;
    });

    afterEach(() => {
      (global as any).__DEV__ = true;
    });

    it("should not output log messages", () => {
      logger.log("test log message");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should not output warn messages", () => {
      logger.warn("test warn message");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should not output debug messages", () => {
      logger.debug("test debug message");
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it("should not output info messages", () => {
      logger.info("test info message");
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it("should always output error messages even in production", () => {
      logger.error("test error message");
      expect(consoleErrorSpy).toHaveBeenCalledWith("test error message");
    });
  });
});
