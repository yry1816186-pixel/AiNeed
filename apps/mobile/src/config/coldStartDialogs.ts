export const COLD_START_DIALOGS = {
  greetings: {
    firstTime: [
      "嗨！我是你的穿搭小助手~先聊聊吧，最近有什么场合需要打扮吗？",
      "你好呀！我是你的私人造型顾问。有什么穿搭上的烦恼吗？",
      "欢迎来到寻裳！让我来帮你找到最适合的风格~最近有什么特别的场合吗？",
    ],
    returning: [
      "又见面啦！今天想聊聊什么穿搭话题？",
      "欢迎回来~有什么新的穿搭需求吗？",
      "好久不见！最近有没有遇到穿搭难题？",
    ],
    withProfile: [
      "根据你的档案，我觉得你很适合{style}风格~今天想尝试什么？",
      "上次我们聊到{lastTopic}，今天继续吗？",
    ],
  },

  sceneCollection: {
    prompts: [
      "听起来很有趣！方便的话，拍张全身照给我看看？这样推荐会更准~",
      "好的，那是什么场合呢？面试、约会、还是日常通勤？",
      "了解~是正式一点的场合，还是轻松随意的？",
    ],
    followUps: {
      interview: [
        "面试啊，这可是重要场合！是什么类型的公司呢？",
        "面试穿搭很关键~让我帮你打造专业又自信的形象！",
      ],
      date: ["约会呀~是第一次见面还是老朋友了？", "约会穿搭要既好看又自然~你希望给对方什么印象？"],
      work: ["通勤穿搭~你们公司的着装氛围怎么样？", "日常上班的话，舒适和专业都很重要呢~"],
      travel: ["旅行太棒了！去哪里呢？海边、城市还是山里？", "旅行穿搭要考虑舒适度~计划怎么玩？"],
      party: [
        "派对呀~是朋友的聚会还是正式的晚宴？",
        "派对穿搭可以稍微大胆一点~想成为焦点还是低调有品味？",
      ],
      daily: ["日常穿搭最考验功力了~你平时喜欢什么风格？", "日常的话，舒适和好看都要兼顾呢~"],
      campus: [
        "校园穿搭~学生党最爱的性价比风格！",
        "校园风可以活泼一点~你平时上课还是社团活动多？",
      ],
    },
  },

  styleCollection: {
    prompts: [
      "好的，平时喜欢什么颜色？或者说，你衣柜里最多的颜色是？",
      "风格方面，你更偏向哪种？极简、韩系、还是法式慵懒？",
      "有没有特别想尝试但又不敢的风格？",
    ],
    styleDescriptions: {
      minimal: "简约不简单，用基础款穿出高级感",
      korean: "温柔甜美，韩剧女主角的感觉",
      french: "慵懒优雅，不经意的好品味",
      streetwear: "个性潮流，街头就是你的T台",
      vintage: "复古浪漫，经典永不过时",
      sporty: "活力健康，运动风也可以很时髦",
      business: "专业得体，职场精英范儿",
    },
    colorPrompts: [
      "颜色方面，你更喜欢暖色还是冷色？",
      "有没有特别想避开的颜色？",
      "肤色方面，你觉得自己是暖皮还是冷皮？",
    ],
  },

  photoCollection: {
    prompts: [
      "方便的话，拍张全身照给我看看？这样推荐会更准~",
      "上传一张照片，我可以帮你分析体型和适合的款式~",
      "有了照片，我就能给你更精准的推荐啦！",
    ],
    skipOptions: [
      "没关系，跳过也可以~我会根据你的描述来推荐",
      "不拍照也没问题，告诉我你的身高体重也行~",
      "好的，那我们继续聊聊你的风格偏好~",
    ],
    afterSkip: ["好的，那我根据你告诉我的信息来推荐~", "没问题，我们继续！"],
  },

  analysisWait: {
    messages: [
      "正在分析你的照片，稍等一下哦~",
      "我正在仔细研究你的体型特点~",
      "马上就好，AI正在努力工作中~",
    ],
    tips: [
      "小提示：分析完成后，我会记住你的体型数据，下次就不用再拍了~",
      "分析结果会帮助你获得更精准的穿搭建议~",
    ],
  },

  recommendationReady: {
    messages: [
      "找到了{count}套适合{occasion}的穿搭方案，来看看吧！",
      "根据你的需求，我为你准备了{count}套搭配~",
      "这些是我为你精心挑选的穿搭，觉得怎么样？",
    ],
    explanations: {
      bodyMatch: "这个版型很适合你的身材",
      colorMatch: "这个颜色很衬你的肤色",
      styleMatch: "这个风格正是你喜欢的",
      occasionMatch: "非常适合{occasion}场合",
      budgetMatch: "在你的预算范围内",
    },
  },

  feedback: {
    positive: [
      "太好了，你喜欢这套！要不要看看类似的风格？",
      "你喜欢就好~这套确实很适合你！",
      "你的眼光不错！这套很有品味~",
    ],
    negative: [
      "没关系，告诉我哪里不满意，我再帮你调整~",
      "不喜欢这套？没关系，我们换一套试试~",
      "好的，那我们看看其他风格？",
    ],
    adjustments: ["好的，我帮你换一种风格~", "换个颜色试试？", "预算方面需要调整吗？"],
  },

  fallback: {
    unclear: [
      "抱歉，我没太理解你的意思~能再说详细一点吗？",
      "嗯...能再具体描述一下吗？",
      "让我想想...你是指{guess}吗？",
    ],
    error: [
      "哎呀，出了点小问题~我们重新开始吧？",
      "抱歉，系统有点小故障，稍后再试试？",
      "网络好像不太好，等一下再试？",
    ],
  },

  quickReplies: {
    scenes: [
      { label: "面试", value: "interview" },
      { label: "约会", value: "date" },
      { label: "通勤", value: "work" },
      { label: "旅行", value: "travel" },
      { label: "派对", value: "party" },
      { label: "日常", value: "daily" },
    ],
    styles: [
      { label: "极简", value: "minimal" },
      { label: "韩系", value: "korean" },
      { label: "法式", value: "french" },
      { label: "街头", value: "streetwear" },
      { label: "复古", value: "vintage" },
      { label: "运动", value: "sporty" },
    ],
    colors: [
      { label: "黑白色系", value: "monochrome" },
      { label: "大地色系", value: "earth" },
      { label: "暖色系", value: "warm" },
      { label: "冷色系", value: "cool" },
      { label: "亮色系", value: "bright" },
    ],
    budgets: [
      { label: "平价实惠", value: "budget" },
      { label: "中等价位", value: "mid" },
      { label: "品质优先", value: "premium" },
    ],
  },

  hints: {
    firstTime: "点击光球开始对话~",
    idle: "有什么穿搭问题，随时问我~",
    thinking: "正在思考中...",
    listening: "我在听，请说~",
  },
};

export function getRandomDialog<T extends readonly string[]>(dialogs: T): T[number] {
  return dialogs[Math.floor(Math.random() * dialogs.length)];
}

export function formatDialog(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() ?? match;
  });
}

export function getGreeting(
  isFirstTime: boolean,
  hasProfile: boolean,
  context?: { style?: string; lastTopic?: string }
): string {
  if (hasProfile && context) {
    const dialogs = COLD_START_DIALOGS.greetings.withProfile;
    return formatDialog(getRandomDialog(dialogs), context);
  }

  if (isFirstTime) {
    return getRandomDialog(COLD_START_DIALOGS.greetings.firstTime);
  }

  return getRandomDialog(COLD_START_DIALOGS.greetings.returning);
}

export function getSceneFollowUp(occasion: string): string {
  const followUps =
    COLD_START_DIALOGS.sceneCollection.followUps[
      occasion as keyof typeof COLD_START_DIALOGS.sceneCollection.followUps
    ];
  if (followUps) {
    return getRandomDialog(followUps);
  }
  return getRandomDialog(COLD_START_DIALOGS.sceneCollection.prompts);
}

export function getRecommendationMessage(count: number, occasion: string): string {
  const template = getRandomDialog(COLD_START_DIALOGS.recommendationReady.messages);
  return formatDialog(template, { count, occasion });
}
