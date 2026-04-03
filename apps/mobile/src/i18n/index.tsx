import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { Platform, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LanguageCode = "zh-CN" | "zh-TW" | "en-US" | "ja-JP" | "ko-KR";

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: "zh-CN",
    name: "Simplified Chinese",
    nativeName: "简体中文",
    direction: "ltr",
  },
  {
    code: "zh-TW",
    name: "Traditional Chinese",
    nativeName: "繁體中文",
    direction: "ltr",
  },
  { code: "en-US", name: "English", nativeName: "English", direction: "ltr" },
  { code: "ja-JP", name: "Japanese", nativeName: "日本語", direction: "ltr" },
  { code: "ko-KR", name: "Korean", nativeName: "한국어", direction: "ltr" },
];

const LANGUAGE_STORAGE_KEY = "@aineed/language";

interface TranslationStrings {
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    skip: string;
    done: string;
  };
  auth: {
    login: string;
    logout: string;
    register: string;
    email: string;
    password: string;
    forgotPassword: string;
  };
  navigation: {
    home: string;
    stylist: string;
    wardrobe: string;
    community: string;
    profile: string;
  };
  stylist: {
    greeting: string;
    askOccasion: string;
    askStyle: string;
    askPhoto: string;
    generating: string;
    noResults: string;
  };
  occasions: {
    interview: string;
    date: string;
    work: string;
    travel: string;
    party: string;
    daily: string;
    campus: string;
  };
  styles: {
    minimal: string;
    korean: string;
    french: string;
    streetwear: string;
    vintage: string;
    sporty: string;
  };
  bodyTypes: {
    rectangle: string;
    hourglass: string;
    triangle: string;
    inverted_triangle: string;
    oval: string;
  };
  skinTones: {
    fair: string;
    light: string;
    medium: string;
    olive: string;
    tan: string;
    dark: string;
  };
  colorSeasons: {
    spring: string;
    summer: string;
    autumn: string;
    winter: string;
  };
  community: {
    post: string;
    comment: string;
    like: string;
    share: string;
    follow: string;
    unfollow: string;
    followers: string;
    following: string;
  };
  errors: {
    networkError: string;
    serverError: string;
    unauthorized: string;
    notFound: string;
    validationError: string;
  };
}

const translations: Record<LanguageCode, TranslationStrings> = {
  "zh-CN": {
    common: {
      loading: "加载中...",
      error: "出错了",
      retry: "重试",
      cancel: "取消",
      confirm: "确认",
      save: "保存",
      delete: "删除",
      edit: "编辑",
      back: "返回",
      next: "下一步",
      skip: "跳过",
      done: "完成",
    },
    auth: {
      login: "登录",
      logout: "退出登录",
      register: "注册",
      email: "邮箱",
      password: "密码",
      forgotPassword: "忘记密码",
    },
    navigation: {
      home: "首页",
      stylist: "AI造型师",
      wardrobe: "衣橱",
      community: "社区",
      profile: "我的",
    },
    stylist: {
      greeting: "嗨！我是你的穿搭小助手~",
      askOccasion: "最近有什么场合需要打扮吗？",
      askStyle: "平时喜欢什么风格？",
      askPhoto: "方便的话，拍张全身照给我看看？",
      generating: "正在为你生成穿搭方案...",
      noResults: "抱歉，没有找到合适的搭配",
    },
    occasions: {
      interview: "面试",
      date: "约会",
      work: "通勤",
      travel: "旅行",
      party: "派对",
      daily: "日常",
      campus: "校园",
    },
    styles: {
      minimal: "极简",
      korean: "韩系",
      french: "法式",
      streetwear: "街头",
      vintage: "复古",
      sporty: "运动",
    },
    bodyTypes: {
      rectangle: "H型",
      hourglass: "X型",
      triangle: "A型",
      inverted_triangle: "Y型",
      oval: "O型",
    },
    skinTones: {
      fair: "白皙",
      light: "浅色",
      medium: "中等",
      olive: "橄榄色",
      tan: "棕褐色",
      dark: "深色",
    },
    colorSeasons: {
      spring: "春季型",
      summer: "夏季型",
      autumn: "秋季型",
      winter: "冬季型",
    },
    community: {
      post: "发布",
      comment: "评论",
      like: "喜欢",
      share: "分享",
      follow: "关注",
      unfollow: "取消关注",
      followers: "粉丝",
      following: "关注",
    },
    errors: {
      networkError: "网络连接失败，请检查网络设置",
      serverError: "服务器错误，请稍后重试",
      unauthorized: "请先登录",
      notFound: "内容不存在",
      validationError: "输入信息有误",
    },
  },
  "zh-TW": {
    common: {
      loading: "載入中...",
      error: "發生錯誤",
      retry: "重試",
      cancel: "取消",
      confirm: "確認",
      save: "儲存",
      delete: "刪除",
      edit: "編輯",
      back: "返回",
      next: "下一步",
      skip: "跳過",
      done: "完成",
    },
    auth: {
      login: "登入",
      logout: "登出",
      register: "註冊",
      email: "電子郵件",
      password: "密碼",
      forgotPassword: "忘記密碼",
    },
    navigation: {
      home: "首頁",
      stylist: "AI造型師",
      wardrobe: "衣櫥",
      community: "社群",
      profile: "我的",
    },
    stylist: {
      greeting: "嗨！我是你的穿搭小幫手~",
      askOccasion: "最近有什麼場合需要打扮嗎？",
      askStyle: "平時喜歡什麼風格？",
      askPhoto: "方便的話，拍張全身照給我看看？",
      generating: "正在為你生成穿搭方案...",
      noResults: "抱歉，沒有找到合適的搭配",
    },
    occasions: {
      interview: "面試",
      date: "約會",
      work: "通勤",
      travel: "旅行",
      party: "派對",
      daily: "日常",
      campus: "校園",
    },
    styles: {
      minimal: "極簡",
      korean: "韓系",
      french: "法式",
      streetwear: "街頭",
      vintage: "復古",
      sporty: "運動",
    },
    bodyTypes: {
      rectangle: "H型",
      hourglass: "X型",
      triangle: "A型",
      inverted_triangle: "Y型",
      oval: "O型",
    },
    skinTones: {
      fair: "白皙",
      light: "淺色",
      medium: "中等",
      olive: "橄欖色",
      tan: "棕褐色",
      dark: "深色",
    },
    colorSeasons: {
      spring: "春季型",
      summer: "夏季型",
      autumn: "秋季型",
      winter: "冬季型",
    },
    community: {
      post: "發布",
      comment: "評論",
      like: "喜歡",
      share: "分享",
      follow: "關注",
      unfollow: "取消關注",
      followers: "粉絲",
      following: "關注",
    },
    errors: {
      networkError: "網路連線失敗，請檢查網路設定",
      serverError: "伺服器錯誤，請稍後重試",
      unauthorized: "請先登入",
      notFound: "內容不存在",
      validationError: "輸入資訊有誤",
    },
  },
  "en-US": {
    common: {
      loading: "Loading...",
      error: "Error",
      retry: "Retry",
      cancel: "Cancel",
      confirm: "Confirm",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      back: "Back",
      next: "Next",
      skip: "Skip",
      done: "Done",
    },
    auth: {
      login: "Login",
      logout: "Logout",
      register: "Register",
      email: "Email",
      password: "Password",
      forgotPassword: "Forgot Password",
    },
    navigation: {
      home: "Home",
      stylist: "AI Stylist",
      wardrobe: "Wardrobe",
      community: "Community",
      profile: "Profile",
    },
    stylist: {
      greeting: "Hi! I'm your style assistant~",
      askOccasion: "Any special occasion coming up?",
      askStyle: "What style do you prefer?",
      askPhoto: "Would you like to share a photo for better recommendations?",
      generating: "Creating your outfit suggestions...",
      noResults: "Sorry, no matching outfits found",
    },
    occasions: {
      interview: "Interview",
      date: "Date",
      work: "Work",
      travel: "Travel",
      party: "Party",
      daily: "Daily",
      campus: "Campus",
    },
    styles: {
      minimal: "Minimal",
      korean: "Korean",
      french: "French",
      streetwear: "Streetwear",
      vintage: "Vintage",
      sporty: "Sporty",
    },
    bodyTypes: {
      rectangle: "Rectangle",
      hourglass: "Hourglass",
      triangle: "Pear",
      inverted_triangle: "Inverted Triangle",
      oval: "Oval",
    },
    skinTones: {
      fair: "Fair",
      light: "Light",
      medium: "Medium",
      olive: "Olive",
      tan: "Tan",
      dark: "Dark",
    },
    colorSeasons: {
      spring: "Spring",
      summer: "Summer",
      autumn: "Autumn",
      winter: "Winter",
    },
    community: {
      post: "Post",
      comment: "Comment",
      like: "Like",
      share: "Share",
      follow: "Follow",
      unfollow: "Unfollow",
      followers: "Followers",
      following: "Following",
    },
    errors: {
      networkError: "Network error, please check your connection",
      serverError: "Server error, please try again later",
      unauthorized: "Please login first",
      notFound: "Content not found",
      validationError: "Invalid input",
    },
  },
  "ja-JP": {
    common: {
      loading: "読み込み中...",
      error: "エラー",
      retry: "再試行",
      cancel: "キャンセル",
      confirm: "確認",
      save: "保存",
      delete: "削除",
      edit: "編集",
      back: "戻る",
      next: "次へ",
      skip: "スキップ",
      done: "完了",
    },
    auth: {
      login: "ログイン",
      logout: "ログアウト",
      register: "登録",
      email: "メール",
      password: "パスワード",
      forgotPassword: "パスワードを忘れた",
    },
    navigation: {
      home: "ホーム",
      stylist: "AIスタイリスト",
      wardrobe: "ワードローブ",
      community: "コミュニティ",
      profile: "マイページ",
    },
    stylist: {
      greeting: "こんにちは！スタイリストアシスタントです~",
      askOccasion: "何か特別な予定はありますか？",
      askStyle: "どんなスタイルがお好きですか？",
      askPhoto: "写真を共有していただけますか？",
      generating: "コーディネートを提案中...",
      noResults: "申し訳ございません、適切なコーディネートが見つかりません",
    },
    occasions: {
      interview: "面接",
      date: "デート",
      work: "仕事",
      travel: "旅行",
      party: "パーティー",
      daily: "日常",
      campus: "キャンパス",
    },
    styles: {
      minimal: "ミニマル",
      korean: "韓国風",
      french: "フレンチ",
      streetwear: "ストリート",
      vintage: "ヴィンテージ",
      sporty: "スポーティー",
    },
    bodyTypes: {
      rectangle: "長方形",
      hourglass: "砂時計",
      triangle: "梨型",
      inverted_triangle: "逆三角形",
      oval: "楕円形",
    },
    skinTones: {
      fair: "白肌",
      light: "明るい肌",
      medium: "中間肌",
      olive: "オリーブ肌",
      tan: "小麦肌",
      dark: "暗い肌",
    },
    colorSeasons: {
      spring: "スプリング",
      summer: "サマー",
      autumn: "オータム",
      winter: "ウィンター",
    },
    community: {
      post: "投稿",
      comment: "コメント",
      like: "いいね",
      share: "シェア",
      follow: "フォロー",
      unfollow: "フォロー解除",
      followers: "フォロワー",
      following: "フォロー中",
    },
    errors: {
      networkError: "ネットワークエラー、接続を確認してください",
      serverError: "サーバーエラー、後でもう一度お試しください",
      unauthorized: "ログインしてください",
      notFound: "コンテンツが見つかりません",
      validationError: "入力が無効です",
    },
  },
  "ko-KR": {
    common: {
      loading: "로딩 중...",
      error: "오류",
      retry: "재시도",
      cancel: "취소",
      confirm: "확인",
      save: "저장",
      delete: "삭제",
      edit: "편집",
      back: "뒤로",
      next: "다음",
      skip: "건너뛰기",
      done: "완료",
    },
    auth: {
      login: "로그인",
      logout: "로그아웃",
      register: "회원가입",
      email: "이메일",
      password: "비밀번호",
      forgotPassword: "비밀번호 찾기",
    },
    navigation: {
      home: "홈",
      stylist: "AI 스타일리스트",
      wardrobe: "옷장",
      community: "커뮤니티",
      profile: "마이페이지",
    },
    stylist: {
      greeting: "안녕하세요! 스타일 어시스턴트입니다~",
      askOccasion: "특별한 일정이 있으신가요?",
      askStyle: "어떤 스타일을 좋아하세요?",
      askPhoto: "사진을 공유해 주시겠어요?",
      generating: "코디를 제안하는 중...",
      noResults: "죄송합니다. 적합한 코디를 찾지 못했습니다",
    },
    occasions: {
      interview: "면접",
      date: "데이트",
      work: "출근",
      travel: "여행",
      party: "파티",
      daily: "일상",
      campus: "캠퍼스",
    },
    styles: {
      minimal: "미니멀",
      korean: "한국 스타일",
      french: "프렌치",
      streetwear: "스트릿",
      vintage: "빈티지",
      sporty: "스포티",
    },
    bodyTypes: {
      rectangle: "직사각형",
      hourglass: "모래시계",
      triangle: "배형",
      inverted_triangle: "역삼각형",
      oval: "타원형",
    },
    skinTones: {
      fair: "하얀 피부",
      light: "밝은 피부",
      medium: "중간 피부",
      olive: "올리브 피부",
      tan: "구릿빛 피부",
      dark: "어두운 피부",
    },
    colorSeasons: {
      spring: "봄 타입",
      summer: "여름 타입",
      autumn: "가을 타입",
      winter: "겨울 타입",
    },
    community: {
      post: "게시",
      comment: "댓글",
      like: "좋아요",
      share: "공유",
      follow: "팔로우",
      unfollow: "팔로우 취소",
      followers: "팔로워",
      following: "팔로잉",
    },
    errors: {
      networkError: "네트워크 오류, 연결을 확인해 주세요",
      serverError: "서버 오류, 나중에 다시 시도해 주세요",
      unauthorized: "로그인해 주세요",
      notFound: "콘텐츠를 찾을 수 없습니다",
      validationError: "입력이 올바르지 않습니다",
    },
  },
};

interface I18nContextValue {
  language: LanguageCode;
  t: TranslationStrings;
  setLanguage: (code: LanguageCode) => Promise<void>;
  getLanguageName: (code: LanguageCode) => string;
  isRTL: boolean;
  supportedLanguages: Language[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useTranslation() {
  const { t } = useI18n();
  return t;
}

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: LanguageCode;
}

export function I18nProvider({ children, defaultLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(
    defaultLanguage || "zh-CN",
  );

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && translations[saved as LanguageCode]) {
        setLanguageState(saved as LanguageCode);
      } else {
        const deviceLanguage = getDeviceLanguage();
        if (translations[deviceLanguage]) {
          setLanguageState(deviceLanguage);
        }
      }
    } catch (error) {
      console.warn("Failed to load saved language:", error);
    }
  };

  const getDeviceLanguage = (): LanguageCode => {
    let deviceLocale = "zh-CN";

    if (Platform.OS === "ios") {
      const settings = NativeModules.SettingsManager?.settings;
      deviceLocale =
        settings?.AppleLocale || settings?.AppleLanguages?.[0] || "zh-CN";
    } else if (Platform.OS === "android") {
      deviceLocale = NativeModules.I18nManager?.localeIdentifier || "zh-CN";
    }

    if (deviceLocale.startsWith("zh-TW") || deviceLocale.startsWith("zh-HK")) {
      return "zh-TW";
    }
    if (deviceLocale.startsWith("zh")) {
      return "zh-CN";
    }
    if (deviceLocale.startsWith("ja")) {
      return "ja-JP";
    }
    if (deviceLocale.startsWith("ko")) {
      return "ko-KR";
    }
    if (deviceLocale.startsWith("en")) {
      return "en-US";
    }

    return "zh-CN";
  };

  const setLanguage = useCallback(async (code: LanguageCode) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      setLanguageState(code);
    } catch (error) {
      console.warn("Failed to save language:", error);
    }
  }, []);

  const getLanguageName = useCallback((code: LanguageCode): string => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    return lang?.nativeName || code;
  }, []);

  const value: I18nContextValue = {
    language,
    t: translations[language],
    setLanguage,
    getLanguageName,
    isRTL:
      SUPPORTED_LANGUAGES.find((l) => l.code === language)?.direction === "rtl",
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function formatMessage(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() ?? match;
  });
}

export function pluralize(
  count: number,
  singular: string,
  plural: string,
  language: LanguageCode = "zh-CN",
): string {
  if (
    language === "zh-CN" ||
    language === "zh-TW" ||
    language === "ja-JP" ||
    language === "ko-KR"
  ) {
    return count > 1 ? plural : singular;
  }

  return count === 1 ? singular : plural;
}

export { translations };
