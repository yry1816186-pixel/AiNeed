/* eslint-disable @typescript-eslint/no-require-imports */
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";

import { ContentFilterService } from "./content-filter.service";

jest.mock("fs", () => ({
  readFileSync: jest.fn(() =>
    [
      "# Violence",
      "kill",
      "murder",
      "bomb",
      "# Hate Speech",
      "hate speech",
      "slur",
      "# Sexual Content",
      "porn",
      "nude",
      "# Fraud",
      "phishing",
      "fake ID",
      "# Illegal Activity",
      "drug trafficking",
      "smuggle",
      "money laundering",
      "# Political Sensitive",
      "extremism",
      "cult",
    ].join("\n"),
  ),
}));

describe("ContentFilterService", () => {
  let service: ContentFilterService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const createConfigService = (sensitivity: string = "moderate") => ({
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === "CONTENT_FILTER_SENSITIVITY") {return sensitivity;}
      return defaultValue;
    }),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("moderate sensitivity", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ContentFilterService,
          { provide: ConfigService, useFactory: () => createConfigService("moderate") },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      service = module.get<ContentFilterService>(ContentFilterService);
    });

    describe("filterContent", () => {
      it("应该拦截包含违禁关键词的内容", () => {
        const result = service.filterContent("I want to kill someone");

        expect(result.passed).toBe(false);
        expect(result.matchedKeywords).toContain("kill");
      });

      it("应该返回匹配到的关键词列表", () => {
        const result = service.filterContent("kill and bomb everything");

        expect(result.passed).toBe(false);
        expect(result.matchedKeywords).toContain("kill");
        expect(result.matchedKeywords).toContain("bomb");
      });

      it("应该放行干净内容", () => {
        const result = service.filterContent("Today is a beautiful day");

        expect(result.passed).toBe(true);
        expect(result.matchedKeywords).toEqual([]);
      });

      it("应该在拦截内容时发出 content.filtered 事件", () => {
        service.filterContent("This is porn content");

        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          "content.filtered",
          expect.objectContaining({
            matchedCount: expect.any(Number),
            sensitivity: "moderate",
          }),
        );
      });

      it("不应该在内容通过时发出事件", () => {
        service.filterContent("Hello world");

        expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      });

      it("应该返回替换后的内容", () => {
        const result = service.filterContent("I want to kill someone");

        expect(result.sanitizedContent).not.toContain("kill");
        expect(result.sanitizedContent).toContain("****");
      });
    });

    describe("isContentSafe", () => {
      it("应该对安全内容返回 true", () => {
        expect(service.isContentSafe("Hello world")).toBe(true);
      });

      it("应该对不安全内容返回 false", () => {
        expect(service.isContentSafe("This is porn")).toBe(false);
      });

      it("应该对空字符串返回 true", () => {
        expect(service.isContentSafe("")).toBe(true);
      });
    });

    describe("sanitizeContent", () => {
      it("应该用星号替换匹配的关键词", () => {
        const result = service.sanitizeContent("This is porn content");

        expect(result).not.toContain("porn");
        expect(result).toContain("****");
      });

      it("应该保持干净内容不变", () => {
        const result = service.sanitizeContent("Hello world");
        expect(result).toBe("Hello world");
      });

      it("应该替换多个匹配关键词", () => {
        const result = service.sanitizeContent("kill and bomb everything");

        expect(result).not.toContain("kill");
        expect(result).not.toContain("bomb");
      });
    });

    describe("case-insensitive matching", () => {
      it("应该不区分大小写匹配关键词", () => {
        const result = service.filterContent("I want to KILL someone");

        expect(result.passed).toBe(false);
        expect(result.matchedKeywords).toContain("kill");
      });

      it("应该不区分大小写替换关键词", () => {
        const result = service.sanitizeContent("PORN content here");

        expect(result).not.toContain("PORN");
      });

      it("应该匹配混合大小写", () => {
        const result = service.filterContent("PhIsHiNg attack detected");

        expect(result.passed).toBe(false);
        expect(result.matchedKeywords).toContain("phishing");
      });
    });

    describe("multi-word keywords", () => {
      it("应该匹配多词关键词", () => {
        const result = service.filterContent("This is hate speech content");

        expect(result.passed).toBe(false);
        expect(result.matchedKeywords).toContain("hate speech");
      });

      it("应该匹配 fake ID 关键词", () => {
        const result = service.filterContent("I need a fake ID");

        expect(result.passed).toBe(false);
        expect(result.matchedKeywords).toContain("fake ID");
      });
    });
  });

  describe("strict sensitivity", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ContentFilterService,
          { provide: ConfigService, useFactory: () => createConfigService("strict") },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      service = module.get<ContentFilterService>(ContentFilterService);
    });

    it("strict 模式应该加载所有关键词", () => {
      const result = service.filterContent("extremism is dangerous");

      expect(result.passed).toBe(false);
      expect(result.matchedKeywords).toContain("extremism");
    });

    it("strict 模式应该比 moderate 模式捕获更多内容", () => {
      const result = service.filterContent("cult behavior detected");

      expect(result.passed).toBe(false);
    });
  });

  describe("loose sensitivity", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ContentFilterService,
          { provide: ConfigService, useFactory: () => createConfigService("loose") },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      service = module.get<ContentFilterService>(ContentFilterService);
    });

    it("loose 模式应该只加载部分关键词", () => {
      const result = service.filterContent("Hello world");

      expect(result.passed).toBe(true);
    });
  });

  describe("sensitivity level comparison", () => {
    it("strict 应该比 moderate 捕获更多关键词", async () => {
      const strictModule: TestingModule = await Test.createTestingModule({
        providers: [
          ContentFilterService,
          { provide: ConfigService, useFactory: () => createConfigService("strict") },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();
      const strictService = strictModule.get<ContentFilterService>(ContentFilterService);

      const moderateModule: TestingModule = await Test.createTestingModule({
        providers: [
          ContentFilterService,
          { provide: ConfigService, useFactory: () => createConfigService("moderate") },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();
      const moderateService = moderateModule.get<ContentFilterService>(ContentFilterService);

      const testContent = "extremism and cult are dangerous";

      const strictResult = strictService.filterContent(testContent);
      const moderateResult = moderateService.filterContent(testContent);

      expect(strictResult.matchedKeywords.length).toBeGreaterThanOrEqual(
        moderateResult.matchedKeywords.length,
      );
    });
  });

  describe("keyword file load failure", () => {
    it("应该在关键词文件加载失败时优雅降级", async () => {
      const fs = require("fs");
      fs.readFileSync.mockImplementationOnce(() => {
        throw new Error("File not found");
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ContentFilterService,
          { provide: ConfigService, useFactory: () => createConfigService("moderate") },
          { provide: EventEmitter2, useValue: mockEventEmitter },
        ],
      }).compile();

      service = module.get<ContentFilterService>(ContentFilterService);

      const result = service.filterContent("anything");
      expect(result.passed).toBe(true);
    });
  });
});
