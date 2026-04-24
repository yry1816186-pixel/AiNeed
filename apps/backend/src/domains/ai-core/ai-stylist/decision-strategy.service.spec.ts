import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { DecisionScoreService } from "./decision-score.service";
import { DecisionStrategyService } from "./decision-strategy.service";
import type {
  DecisionNodeType,
  DecisionContext,
  UserProfile,
  DecisionTree,
  DecisionNode,
  DecisionOption,
  UserDecision,
} from "./types";

describe("DecisionStrategyService", () => {
  let service: DecisionStrategyService;
  let scoreService: jest.Mocked<DecisionScoreService>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn().mockReturnValue(""),
  };

  const mockScoreService = {
    calculateOptionScores: jest.fn().mockReturnValue({
      fitScore: 70,
      styleScore: 70,
      preferenceScore: 70,
    }),
    calculateCompositeScore: jest.fn().mockReturnValue(70),
  };

  const baseUserProfile: UserProfile = {
    userId: "user_1",
    bodyType: "hourglass",
    colorSeason: "autumn",
    stylePreferences: ["极简"],
    colorPreferences: ["驼色"],
    fitGoals: [],
    behaviorHistory: [],
  };

  const baseContext: DecisionContext = {
    preferredStyles: [],
    styleAvoidances: [],
    fitGoals: [],
    preferredColors: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionStrategyService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DecisionScoreService, useValue: mockScoreService },
      ],
    }).compile();

    service = module.get<DecisionStrategyService>(DecisionStrategyService);
    scoreService = module.get(DecisionScoreService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("determineRootNodeType", () => {
    it("当没有风格偏好时应该返回 style", () => {
      const context: DecisionContext = {
        preferredStyles: [],
        styleAvoidances: [],
        fitGoals: [],
        preferredColors: [],
      };
      const profile: UserProfile = {
        ...baseUserProfile,
        stylePreferences: [],
      };

      const result = service.determineRootNodeType(context, profile);

      expect(result).toBe("style");
    });

    it("当有风格偏好但没有 fitGoals 时应该返回 color", () => {
      const context: DecisionContext = {
        preferredStyles: ["极简"],
        styleAvoidances: [],
        fitGoals: [],
        preferredColors: [],
      };
      const profile: UserProfile = {
        ...baseUserProfile,
        stylePreferences: ["极简"],
      };

      const result = service.determineRootNodeType(context, profile);

      expect(result).toBe("color");
    });

    it("当有风格偏好且有 fitGoals 时应该返回 top", () => {
      const context: DecisionContext = {
        preferredStyles: ["极简"],
        styleAvoidances: [],
        fitGoals: ["显瘦"],
        preferredColors: [],
      };
      const profile: UserProfile = {
        ...baseUserProfile,
        stylePreferences: ["极简"],
      };

      const result = service.determineRootNodeType(context, profile);

      expect(result).toBe("top");
    });

    it("当只有 userProfile 风格偏好时应该返回 color", () => {
      const context: DecisionContext = {
        preferredStyles: [],
        styleAvoidances: [],
        fitGoals: [],
        preferredColors: [],
      };
      const profile: UserProfile = {
        ...baseUserProfile,
        stylePreferences: ["法式"],
      };

      const result = service.determineRootNodeType(context, profile);

      expect(result).toBe("color");
    });
  });

  describe("getNextNodeType", () => {
    const createMockTree = (
      decisions: Array<{
        nodeType: DecisionNodeType;
        nodeId: string;
        chosenOptionId: string;
        rejectedOptionIds: string[];
      }>
    ): DecisionTree => {
      const nodes = new Map<string, DecisionNode>();
      const userDecisions: UserDecision[] = decisions.map((d, i) => {
        const nodeId = d.nodeId;
        nodes.set(nodeId, {
          nodeId,
          nodeType: d.nodeType,
          question: `问题${i}`,
          options: [
            {
              optionId: d.chosenOptionId,
              content: {},
              displayName: `选项${i}`,
              fitScore: 70,
              styleScore: 70,
              preferenceScore: 70,
              compositeScore: 70,
            },
          ],
          llmReasoning: "",
          depth: i,
        });
        return {
          id: `decision_${i}`,
          sessionId: "session_1",
          nodeId,
          nodeType: d.nodeType,
          chosenOptionId: d.chosenOptionId,
          rejectedOptionIds: d.rejectedOptionIds,
          decisionTime: 1000,
          timestamp: new Date(),
        };
      });

      return {
        treeId: "tree_1",
        sessionId: "session_1",
        userId: "user_1",
        rootNodeId: "node_0",
        currentNodeId: "node_0",
        nodes,
        decisions: userDecisions,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    it("当没有已做决策时应该返回 style 的下一个类型", () => {
      const tree = createMockTree([]);

      const result = service.getNextNodeType("style", tree);

      expect(result).toBe("top");
    });

    it("应该跳过已有决策的节点类型", () => {
      const tree = createMockTree([
        { nodeType: "style", nodeId: "node_style", chosenOptionId: "opt_1", rejectedOptionIds: [] },
      ]);

      const result = service.getNextNodeType("style", tree);

      expect(result).toBe("top");
    });

    it("当已做 4 个决策时应该返回 null", () => {
      const tree = createMockTree([
        { nodeType: "style", nodeId: "node_style", chosenOptionId: "opt_1", rejectedOptionIds: [] },
        { nodeType: "top", nodeId: "node_top", chosenOptionId: "opt_2", rejectedOptionIds: [] },
        {
          nodeType: "bottom",
          nodeId: "node_bottom",
          chosenOptionId: "opt_3",
          rejectedOptionIds: [],
        },
        { nodeType: "color", nodeId: "node_color", chosenOptionId: "opt_4", rejectedOptionIds: [] },
      ]);

      const result = service.getNextNodeType("color", tree);

      expect(result).toBeNull();
    });

    it("当所有后续类型已决策时应该回绕到前面的类型", () => {
      const tree = createMockTree([
        { nodeType: "style", nodeId: "node_style", chosenOptionId: "opt_1", rejectedOptionIds: [] },
        {
          nodeType: "bottom",
          nodeId: "node_bottom",
          chosenOptionId: "opt_3",
          rejectedOptionIds: [],
        },
      ]);

      const result = service.getNextNodeType("bottom", tree);

      expect(result).toBe("color");
    });
  });

  describe("buildContextFromDecisions", () => {
    it("应该从 style 决策中提取 preferredStyles", () => {
      const nodes = new Map<string, DecisionNode>();
      nodes.set("node_style", {
        nodeId: "node_style",
        nodeType: "style",
        question: "选择风格",
        options: [
          {
            optionId: "opt_minimalist",
            content: { styleTags: ["极简"] },
            displayName: "极简",
            fitScore: 70,
            styleScore: 70,
            preferenceScore: 70,
            compositeScore: 70,
          },
          {
            optionId: "opt_french",
            content: { styleTags: ["法式"] },
            displayName: "法式",
            fitScore: 60,
            styleScore: 60,
            preferenceScore: 60,
            compositeScore: 60,
          },
        ],
        llmReasoning: "",
        depth: 0,
      });

      const tree: DecisionTree = {
        treeId: "tree_1",
        sessionId: "session_1",
        userId: "user_1",
        rootNodeId: "node_style",
        currentNodeId: "node_style",
        nodes,
        decisions: [
          {
            id: "decision_1",
            sessionId: "session_1",
            nodeId: "node_style",
            nodeType: "style",
            chosenOptionId: "opt_minimalist",
            rejectedOptionIds: ["opt_french"],
            decisionTime: 1000,
            timestamp: new Date(),
          },
        ],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.buildContextFromDecisions(tree);

      expect(result.preferredStyles).toContain("极简");
      expect(result.styleAvoidances).toContain("法式");
    });

    it("应该从 color 决策中提取 preferredColors", () => {
      const nodes = new Map<string, DecisionNode>();
      nodes.set("node_color", {
        nodeId: "node_color",
        nodeType: "color",
        question: "选择颜色",
        options: [
          {
            optionId: "opt_black",
            content: { colorTags: ["黑色"] },
            displayName: "黑色",
            fitScore: 70,
            styleScore: 70,
            preferenceScore: 70,
            compositeScore: 70,
          },
        ],
        llmReasoning: "",
        depth: 0,
      });

      const tree: DecisionTree = {
        treeId: "tree_1",
        sessionId: "session_1",
        userId: "user_1",
        rootNodeId: "node_color",
        currentNodeId: "node_color",
        nodes,
        decisions: [
          {
            id: "decision_1",
            sessionId: "session_1",
            nodeId: "node_color",
            nodeType: "color",
            chosenOptionId: "opt_black",
            rejectedOptionIds: [],
            decisionTime: 1000,
            timestamp: new Date(),
          },
        ],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.buildContextFromDecisions(tree);

      expect(result.preferredColors).toContain("黑色");
    });

    it("应该从 fit 决策中提取 fitGoals", () => {
      const nodes = new Map<string, DecisionNode>();
      nodes.set("node_fit", {
        nodeId: "node_fit",
        nodeType: "fit",
        question: "选择穿搭目标",
        options: [
          {
            optionId: "opt_slimmer",
            content: { fitAttributes: ["显瘦"] },
            displayName: "显瘦",
            fitScore: 70,
            styleScore: 70,
            preferenceScore: 70,
            compositeScore: 70,
          },
        ],
        llmReasoning: "",
        depth: 0,
      });

      const tree: DecisionTree = {
        treeId: "tree_1",
        sessionId: "session_1",
        userId: "user_1",
        rootNodeId: "node_fit",
        currentNodeId: "node_fit",
        nodes,
        decisions: [
          {
            id: "decision_1",
            sessionId: "session_1",
            nodeId: "node_fit",
            nodeType: "fit",
            chosenOptionId: "opt_slimmer",
            rejectedOptionIds: [],
            decisionTime: 1000,
            timestamp: new Date(),
          },
        ],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.buildContextFromDecisions(tree);

      expect(result.fitGoals).toContain("显瘦");
    });

    it("当没有决策时应该返回空的上下文", () => {
      const tree: DecisionTree = {
        treeId: "tree_1",
        sessionId: "session_1",
        userId: "user_1",
        rootNodeId: "node_0",
        currentNodeId: "node_0",
        nodes: new Map(),
        decisions: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.buildContextFromDecisions(tree);

      expect(result.preferredStyles).toEqual([]);
      expect(result.styleAvoidances).toEqual([]);
      expect(result.fitGoals).toEqual([]);
      expect(result.preferredColors).toEqual([]);
    });

    it("当节点不存在时应该跳过该决策", () => {
      const tree: DecisionTree = {
        treeId: "tree_1",
        sessionId: "session_1",
        userId: "user_1",
        rootNodeId: "node_0",
        currentNodeId: "node_0",
        nodes: new Map(),
        decisions: [
          {
            id: "decision_1",
            sessionId: "session_1",
            nodeId: "nonexistent_node",
            nodeType: "style",
            chosenOptionId: "opt_1",
            rejectedOptionIds: [],
            decisionTime: 1000,
            timestamp: new Date(),
          },
        ],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.buildContextFromDecisions(tree);

      expect(result.preferredStyles).toEqual([]);
    });
  });
});
