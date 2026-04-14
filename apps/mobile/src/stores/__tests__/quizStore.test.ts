import { useQuizStore } from "../quizStore";
import apiClient from "../../services/api/client";

jest.mock("../../services/api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockQuestions = [
  {
    id: "q2",
    text: "Second question",
    type: "single" as const,
    options: [{ id: "o3", text: "Option 3" }],
    category: "style",
    order: 2,
  },
  {
    id: "q1",
    text: "First question",
    type: "single" as const,
    options: [{ id: "o1", text: "Option 1" }, { id: "o2", text: "Option 2" }],
    category: "style",
    order: 1,
  },
  {
    id: "q3",
    text: "Third question",
    type: "image_choice" as const,
    options: [{ id: "o4", text: "Image 1" }],
    category: "color",
    order: 3,
  },
];

const mockResult = {
  styleProfile: "minimalist",
  colorSeason: "summer",
  bodyTypeRecommendation: "rectangle",
  confidence: 0.85,
  recommendations: ["Clean lines", "Neutral tones"],
};

describe("useQuizStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQuizStore.setState({
      questions: [],
      currentIndex: 0,
      currentQuestionIndex: 0,
      answers: {},
      answerList: [],
      result: null,
      isLoading: false,
      error: null,
    });
  });

  // ==================== 初始状态 ====================

  describe("initial state", () => {
    it("should have correct default values", () => {
      const state = useQuizStore.getState();
      expect(state.questions).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.answers).toEqual({});
      expect(state.answerList).toEqual([]);
      expect(state.result).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ==================== fetchQuestions ====================

  describe("fetchQuestions", () => {
    it("should fetch questions and sort by order on success", async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        success: true,
        data: mockQuestions,
      });

      await useQuizStore.getState().fetchQuestions();

      const state = useQuizStore.getState();
      expect(mockedApiClient.get).toHaveBeenCalledWith("/quiz/questions");
      expect(state.questions).toHaveLength(3);
      // 验证按 order 排序
      expect(state.questions[0].id).toBe("q1");
      expect(state.questions[1].id).toBe("q2");
      expect(state.questions[2].id).toBe("q3");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set error when response is not successful", async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed to fetch questions" },
      });

      await useQuizStore.getState().fetchQuestions();

      const state = useQuizStore.getState();
      expect(state.questions).toEqual([]);
      expect(state.error).toBe("Failed to fetch questions");
      expect(state.isLoading).toBe(false);
    });

    it("should set error with default message when no error message provided", async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: undefined as unknown as string },
      });

      await useQuizStore.getState().fetchQuestions();

      const state = useQuizStore.getState();
      expect(state.error).toBe("Failed to fetch questions");
    });

    it("should set error on exception", async () => {
      mockedApiClient.get.mockRejectedValueOnce(new Error("Network error"));

      await useQuizStore.getState().fetchQuestions();

      const state = useQuizStore.getState();
      expect(state.error).toBe("Network error");
      expect(state.isLoading).toBe(false);
    });

    it("should set isLoading to true during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedApiClient.get.mockReturnValueOnce(pendingPromise as never);

      const fetchPromise = useQuizStore.getState().fetchQuestions();
      expect(useQuizStore.getState().isLoading).toBe(true);

      resolvePromise!({ success: true, data: [] });
      await fetchPromise;
    });
  });

  // ==================== selectAnswer ====================

  describe("selectAnswer", () => {
    it("should update answers and advance currentIndex", () => {
      useQuizStore.setState({ questions: mockQuestions });

      useQuizStore.getState().selectAnswer("q1", "o1");

      const state = useQuizStore.getState();
      expect(state.answers).toEqual({ q1: "o1" });
      // q1 is at index 1 in mockQuestions, next index = 1+1 = 2
      expect(state.currentIndex).toBe(2);
      expect(state.currentQuestionIndex).toBe(2);
    });

    it("should not advance index when answering the last question", () => {
      useQuizStore.setState({
        questions: mockQuestions,
        currentIndex: 2,
        currentQuestionIndex: 2,
      });

      useQuizStore.getState().selectAnswer("q3", "o4");

      const state = useQuizStore.getState();
      expect(state.answers).toEqual({ q3: "o4" });
      // q3 is the last question (index=2), should not advance
      expect(state.currentIndex).toBe(2);
    });

    it("should handle answering questions out of order", () => {
      useQuizStore.setState({ questions: mockQuestions });

      useQuizStore.getState().selectAnswer("q3", "o4");

      const state = useQuizStore.getState();
      expect(state.answers).toEqual({ q3: "o4" });
      // q3 is last question, currentIndex stays
      expect(state.currentIndex).toBe(0);
    });
  });

  // ==================== selectAnswerWithDuration ====================

  describe("selectAnswerWithDuration", () => {
    it("should add answer to answerList and update answers", () => {
      useQuizStore.setState({ questions: mockQuestions });

      useQuizStore.getState().selectAnswerWithDuration("q1", 2, 1500);

      const state = useQuizStore.getState();
      expect(state.answerList).toEqual([
        { questionId: "q1", selectedImageIndex: 2, duration: 1500 },
      ]);
      expect(state.answers).toEqual({ q1: "2" });
      // q1 is at index 1, next = 2
      expect(state.currentQuestionIndex).toBe(2);
    });

    it("should update existing answer in answerList", () => {
      useQuizStore.setState({
        questions: mockQuestions,
        answerList: [{ questionId: "q1", selectedImageIndex: 0, duration: 500 }],
      });

      useQuizStore.getState().selectAnswerWithDuration("q1", 3, 2000);

      const state = useQuizStore.getState();
      expect(state.answerList).toHaveLength(1);
      expect(state.answerList[0]).toEqual({
        questionId: "q1",
        selectedImageIndex: 3,
        duration: 2000,
      });
    });

    it("should not advance currentQuestionIndex on last question", () => {
      useQuizStore.setState({
        questions: mockQuestions,
        currentQuestionIndex: 2,
      });

      useQuizStore.getState().selectAnswerWithDuration("q3", 1, 800);

      const state = useQuizStore.getState();
      expect(state.currentQuestionIndex).toBe(2);
    });
  });

  // ==================== submitQuiz ====================

  describe("submitQuiz", () => {
    it("should set result on successful submission", async () => {
      useQuizStore.setState({ answers: { q1: "o1", q2: "o3" } });

      mockedApiClient.post.mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      await useQuizStore.getState().submitQuiz();

      const state = useQuizStore.getState();
      expect(mockedApiClient.post).toHaveBeenCalledWith("/quiz/submit", {
        answers: { q1: "o1", q2: "o3" },
      });
      expect(state.result).toEqual(mockResult);
      expect(state.isLoading).toBe(false);
    });

    it("should set error when submission fails", async () => {
      useQuizStore.setState({ answers: { q1: "o1" } });

      mockedApiClient.post.mockResolvedValueOnce({
        success: false,
        error: { code: "ERR", message: "Failed to submit quiz" },
      });

      await useQuizStore.getState().submitQuiz();

      const state = useQuizStore.getState();
      expect(state.error).toBe("Failed to submit quiz");
      expect(state.result).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it("should set error on exception during submission", async () => {
      useQuizStore.setState({ answers: { q1: "o1" } });

      mockedApiClient.post.mockRejectedValueOnce(new Error("Server error"));

      await useQuizStore.getState().submitQuiz();

      const state = useQuizStore.getState();
      expect(state.error).toBe("Server error");
      expect(state.isLoading).toBe(false);
    });
  });

  // ==================== resetQuiz ====================

  describe("resetQuiz", () => {
    it("should reset all state to initial values", () => {
      useQuizStore.setState({
        questions: mockQuestions,
        currentIndex: 2,
        currentQuestionIndex: 2,
        answers: { q1: "o1" },
        answerList: [{ questionId: "q1", selectedImageIndex: 0, duration: 500 }],
        result: mockResult,
        isLoading: true,
        error: "some error",
      });

      useQuizStore.getState().resetQuiz();

      const state = useQuizStore.getState();
      expect(state.questions).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.answers).toEqual({});
      expect(state.answerList).toEqual([]);
      expect(state.result).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ==================== setQuestions ====================

  describe("setQuestions", () => {
    it("should set questions directly", () => {
      useQuizStore.getState().setQuestions(mockQuestions);

      expect(useQuizStore.getState().questions).toEqual(mockQuestions);
    });
  });

  // ==================== nextQuestion ====================

  describe("nextQuestion", () => {
    it("should increment currentQuestionIndex", () => {
      useQuizStore.setState({
        questions: mockQuestions,
        currentQuestionIndex: 0,
      });

      useQuizStore.getState().nextQuestion();

      expect(useQuizStore.getState().currentQuestionIndex).toBe(1);
    });

    it("should not exceed questions length - 1", () => {
      useQuizStore.setState({
        questions: mockQuestions,
        currentQuestionIndex: 2,
      });

      useQuizStore.getState().nextQuestion();

      expect(useQuizStore.getState().currentQuestionIndex).toBe(2);
    });
  });

  // ==================== previousQuestion ====================

  describe("previousQuestion", () => {
    it("should decrement currentQuestionIndex", () => {
      useQuizStore.setState({
        questions: mockQuestions,
        currentQuestionIndex: 2,
      });

      useQuizStore.getState().previousQuestion();

      expect(useQuizStore.getState().currentQuestionIndex).toBe(1);
    });

    it("should not go below 0", () => {
      useQuizStore.setState({
        questions: mockQuestions,
        currentQuestionIndex: 0,
      });

      useQuizStore.getState().previousQuestion();

      expect(useQuizStore.getState().currentQuestionIndex).toBe(0);
    });
  });

  // ==================== setLoading ====================

  describe("setLoading", () => {
    it("should set isLoading", () => {
      useQuizStore.getState().setLoading(true);
      expect(useQuizStore.getState().isLoading).toBe(true);

      useQuizStore.getState().setLoading(false);
      expect(useQuizStore.getState().isLoading).toBe(false);
    });
  });

  // ==================== setError ====================

  describe("setError", () => {
    it("should set error message", () => {
      useQuizStore.getState().setError("Test error");
      expect(useQuizStore.getState().error).toBe("Test error");
    });

    it("should clear error with null", () => {
      useQuizStore.getState().setError("Test error");
      useQuizStore.getState().setError(null);
      expect(useQuizStore.getState().error).toBeNull();
    });
  });
});
