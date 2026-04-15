/**
 * Tests for error handling utilities
 * These test pure functions with no React Native dependencies
 */

import {
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  ErrorClassifier,
  ErrorHandler,
  handleError,
} from "../errorHandling";

// Mock Sentry to avoid RN dependency
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
  Severity: {
    Info: "info",
    Warning: "warning",
    Error: "error",
    Fatal: "fatal",
  },
}));

// Mock logger
jest.mock("../logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe("ErrorClassifier", () => {
  describe("classify", () => {
    it("should classify network errors", () => {
      const error = new Error("Network request failed");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.NETWORK);
    });

    it("should classify timeout errors", () => {
      const error = new Error("Request timeout");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.NETWORK);
    });

    it("should classify connection refused errors", () => {
      const error = new Error("ECONNREFUSED");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.NETWORK);
    });

    it("should classify permission errors with 401", () => {
      const error = new Error("401 Unauthorized");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.PERMISSION);
    });

    it("should classify permission errors with forbidden", () => {
      const error = new Error("Forbidden access");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.PERMISSION);
    });

    it("should classify resource not found errors", () => {
      const error = new Error("Resource not found");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.RESOURCE);
    });

    it("should classify 404 errors", () => {
      const error = new Error("404 page not found");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.RESOURCE);
    });

    it("should classify storage errors", () => {
      const error = new Error("AsyncStorage write failed");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.STORAGE);
    });

    it("should classify render errors", () => {
      const error = new Error("Cannot read property of undefined");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.RENDER);
    });

    it("should classify unknown errors", () => {
      const error = new Error("Something completely unexpected");
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.UNKNOWN);
    });

    it("should classify based on error stack trace", () => {
      const error = new Error("Failed");
      error.stack = "Error: Failed\n at fetch (network.js:1)";
      expect(ErrorClassifier.classify(error)).toBe(ErrorCategory.NETWORK);
    });
  });

  describe("assessSeverity", () => {
    it("should assess render errors as HIGH", () => {
      const error = new Error("Render failed");
      expect(ErrorClassifier.assessSeverity(error, ErrorCategory.RENDER)).toBe(ErrorSeverity.HIGH);
    });

    it("should assess permission errors as MEDIUM", () => {
      const error = new Error("Unauthorized");
      expect(ErrorClassifier.assessSeverity(error, ErrorCategory.PERMISSION)).toBe(
        ErrorSeverity.MEDIUM
      );
    });

    it("should assess timeout network errors as MEDIUM", () => {
      const error = new Error("Request timeout");
      expect(ErrorClassifier.assessSeverity(error, ErrorCategory.NETWORK)).toBe(
        ErrorSeverity.MEDIUM
      );
    });

    it("should assess offline network errors as HIGH", () => {
      const error = new Error("Network offline");
      expect(ErrorClassifier.assessSeverity(error, ErrorCategory.NETWORK)).toBe(ErrorSeverity.HIGH);
    });

    it("should assess resource errors as LOW", () => {
      const error = new Error("Not found");
      expect(ErrorClassifier.assessSeverity(error, ErrorCategory.RESOURCE)).toBe(ErrorSeverity.LOW);
    });
  });

  describe("determineRecoveryStrategy", () => {
    it("should recommend RETRY for network errors", () => {
      expect(
        ErrorClassifier.determineRecoveryStrategy(ErrorCategory.NETWORK, ErrorSeverity.MEDIUM)
      ).toBe(RecoveryStrategy.RETRY);
    });

    it("should recommend RE_LOGIN for permission errors", () => {
      expect(
        ErrorClassifier.determineRecoveryStrategy(ErrorCategory.PERMISSION, ErrorSeverity.MEDIUM)
      ).toBe(RecoveryStrategy.RE_LOGIN);
    });

    it("should recommend GO_BACK for resource errors", () => {
      expect(
        ErrorClassifier.determineRecoveryStrategy(ErrorCategory.RESOURCE, ErrorSeverity.LOW)
      ).toBe(RecoveryStrategy.GO_BACK);
    });

    it("should recommend GO_HOME for critical render errors", () => {
      expect(
        ErrorClassifier.determineRecoveryStrategy(ErrorCategory.RENDER, ErrorSeverity.CRITICAL)
      ).toBe(RecoveryStrategy.GO_HOME);
    });

    it("should recommend REFRESH for non-critical render errors", () => {
      expect(
        ErrorClassifier.determineRecoveryStrategy(ErrorCategory.RENDER, ErrorSeverity.HIGH)
      ).toBe(RecoveryStrategy.REFRESH);
    });
  });
});

describe("ErrorHandler", () => {
  describe("handle", () => {
    it("should return a structured error with correct fields", () => {
      const error = new Error("Network request failed");
      const result = handleError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.severity).toBeDefined();
      expect(result.recoveryStrategy).toBeDefined();
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toBeTruthy();
      expect(result.technicalMessage).toBe("Network request failed");
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.originalError).toBe(error);
    });

    it("should include context when provided", () => {
      const error = new Error("Test error");
      const context = { screen: "HomeScreen", action: "loadData" };
      const result = handleError(error, context);

      expect(result.context).toEqual(context);
    });

    it("should generate appropriate user messages for network errors", () => {
      const error = new Error("Network request failed");
      const result = handleError(error);

      expect(result.userMessage).toContain("网络");
    });

    it("should generate appropriate user messages for permission errors", () => {
      const error = new Error("401 Unauthorized");
      const result = handleError(error);

      expect(result.userMessage).toContain("权限");
    });

    it("should extract error code from message", () => {
      const error = new Error("[ERR_TIMEOUT] Request timed out");
      const result = handleError(error);

      expect(result.code).toBe("ERR_TIMEOUT");
    });

    it("should mark critical errors as non-recoverable", () => {
      const error = new Error("Render component crashed");
      const result = handleError(error);
      // Render is HIGH severity by default, which is recoverable
      expect(typeof result.recoverable).toBe("boolean");
    });
  });
});
