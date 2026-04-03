import { aiStylistService } from '../services/AIStylistService';
import {
  ChatMessage,
  AiStylistAction,
  AiStylistSessionState,
  AiStylistOutfitPlan,
  AiStylistOutfitItem,
  AiStylistProgress,
  AiStylistSessionResponse,
  SuggestionItem
} from '../services/types';

const defaultQuickQuestions: string[] = [
  '我要一套面试穿搭',
  '帮我做约会穿搭',
  '预算 1000 以内显高一点',
  '我想走极简通勤风'
];

const actionLabels: Record<string, string> = {
  'ask_question': '继续补充',
  'show_preference_buttons': '确认偏好',
  'request_photo_upload': '拍照分析',
  'poll_analysis': '分析中',
  'confirm_preferences': '确认偏好',
  'generate_outfit': '查看方案',
  'show_outfit_cards': '刷新方案'
};

@Entry
@Component
struct AIStylist {
  @State messages: ChatMessage[] = [];
  @State inputText: string = '';
  @State sessionId: string = '';
  @State nextAction: AiStylistAction | null = null;
  @State sessionState: AiStylistSessionState | null = null;
  @State quickQuestions: string[] = defaultQuickQuestions;
  @State resultPlans: AiStylistOutfitPlan[] = [];
  @State isBootstrapping: boolean = true;
  @State isSending: boolean = false;
  @State isResolving: boolean = false;
  @State analysisStatus: string = '';
  @State progress: AiStylistProgress | null = null;
  @State screenError: string = '';
  @State typingText: string = '';
  @State typingIndex: number = 0;
  @State isTyping: boolean = false;
  @State showQuickQuestions: boolean = true;
  @State showFlowCard: boolean = false;
  @State flowCardTitle: string = '';
  @State flowCardDetail: string = '';
  @State flowCardResolved: boolean = false;
  @State showTypingIndicator: boolean = false;
  @State typingIndicatorText: string = '';
  private typingTimer: number = -1;
  private pollingTimer: number = -1;
  private scroller: Scroller = new Scroller();

  aboutToAppear(): void {
    this.initialize();
  }

  aboutToDisappear(): void {
    if (this.typingTimer !== -1) {
      clearInterval(this.typingTimer);
    }
    if (this.pollingTimer !== -1) {
      clearInterval(this.pollingTimer);
    }
  }

  private async initialize(): Promise<void> {
    this.isBootstrapping = true;
    this.updateFlowCard();
    const suggestionResponse = await aiStylistService.getSuggestions();
    const sessionResponse = await aiStylistService.createSession({
      entry: 'harmony_ai_stylist',
      goal: 'get_outfit_plan'
    });

    if (suggestionResponse.success && suggestionResponse.data) {
      const suggestions = suggestionResponse.data.suggestions;
      if (suggestions && suggestions.length > 0) {
        this.quickQuestions = suggestions.map((item: SuggestionItem) => item.text);
      }
    }

    if (!sessionResponse.success || !sessionResponse.data) {
      const errorMsg = sessionResponse.error || 'AI 造型师暂时不可用，请稍后重试。';
      this.screenError = errorMsg;
      this.messages = [{
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date().toISOString()
      }];
      this.isBootstrapping = false;
      this.updateFlowCard();
      return;
    }

    this.applySessionResponse(sessionResponse.data, true);
    this.isBootstrapping = false;
    this.updateFlowCard();
  }

  private updateFlowCard(): void {
    if (this.progress) {
      this.flowCardTitle = this.progress.title;
      this.flowCardDetail = this.progress.detail || '';
      this.flowCardResolved = this.progress.stage === 'resolved' || this.progress.stage === 'ready_to_resolve';
      this.showFlowCard = true;
    } else if (this.isBootstrapping) {
      this.flowCardTitle = '正在连接 AI 造型师...';
      this.flowCardDetail = '';
      this.flowCardResolved = false;
      this.showFlowCard = true;
    } else if (this.isSending) {
      this.flowCardTitle = '正在理解你的需求...';
      this.flowCardDetail = '';
      this.flowCardResolved = false;
      this.showFlowCard = true;
    } else if (this.isResolving) {
      this.flowCardTitle = '正在生成穿搭方案...';
      this.flowCardDetail = '';
      this.flowCardResolved = false;
      this.showFlowCard = true;
    } else if (this.analysisStatus === 'pending' || this.analysisStatus === 'processing') {
      this.flowCardTitle = '正在分析身材与色彩...';
      this.flowCardDetail = '';
      this.flowCardResolved = false;
      this.showFlowCard = true;
    } else {
      this.showFlowCard = false;
    }

    this.showTypingIndicator = this.isProcessing() && !this.isTyping;
    if (this.showTypingIndicator) {
      this.typingIndicatorText = this.getFlowStatusText();
    }
  }

  private applySessionResponse(payload: AiStylistSessionResponse, resetMessages: boolean = false): void {
    if (payload.sessionId) {
      this.sessionId = payload.sessionId;
    }
    if (payload.nextAction) {
      this.nextAction = payload.nextAction;
    }
    if (payload.sessionState) {
      this.sessionState = payload.sessionState;
    }
    if (payload.analysisStatus) {
      this.analysisStatus = payload.analysisStatus;
    }
    this.progress = payload.progress || null;
    if (payload.result && payload.result.outfits) {
      this.resultPlans = payload.result.outfits;
    }
    if (payload.assistantMessage) {
      if (resetMessages) {
        const timestamp = payload.timestamp || new Date().toISOString();
        this.messages = [{
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: payload.assistantMessage,
          timestamp: timestamp
        }];
      } else {
        this.appendAssistantMessage(payload.assistantMessage);
      }
    }
    this.updateFlowCard();
  }

  private appendAssistantMessage(content: string): void {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content.trim() === content.trim()) {
      return;
    }

    const messageId = `assistant-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...this.messages,
      {
        id: messageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      }
    ];
    this.messages = newMessages;
    this.startTypingAnimation(messageId, content);
  }

  private startTypingAnimation(messageId: string, fullContent: string): void {
    this.isTyping = true;
    this.typingIndex = 0;
    this.typingText = '';

    if (this.typingTimer !== -1) {
      clearInterval(this.typingTimer);
    }

    const self = this;
    this.typingTimer = setInterval(() => {
      if (self.typingIndex < fullContent.length) {
        self.typingText = self.typingText + fullContent[self.typingIndex];
        self.typingIndex = self.typingIndex + 1;

        const messageIndex = self.messages.findIndex((m: ChatMessage) => m.id === messageId);
        if (messageIndex !== -1) {
          const updatedMessages = [...self.messages];
          updatedMessages[messageIndex] = {
            id: self.messages[messageIndex].id,
            role: self.messages[messageIndex].role,
            content: self.typingText,
            timestamp: self.messages[messageIndex].timestamp
          };
          self.messages = updatedMessages;
        }
      } else {
        clearInterval(self.typingTimer);
        self.typingTimer = -1;
        self.isTyping = false;
        self.updateFlowCard();
      }
    }, 30);

    setTimeout(() => {
      self.scroller.scrollEdge(Edge.Bottom);
    }, 100);
  }

  private async sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (trimmed.length === 0 || this.sessionId.length === 0 || this.isSending) {
      return;
    }

    const newMessages: ChatMessage[] = [
      ...this.messages,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString()
      }
    ];
    this.messages = newMessages;
    this.inputText = '';
    this.isSending = true;
    this.screenError = '';
    this.showQuickQuestions = false;
    this.updateFlowCard();

    const self = this;
    setTimeout(() => {
      self.scroller.scrollEdge(Edge.Bottom);
    }, 100);

    const response = await aiStylistService.sendMessage(this.sessionId, trimmed);
    this.isSending = false;

    if (!response.success || !response.data) {
      const errorMsg = response.error || '发送失败，请稍后重试。';
      this.screenError = errorMsg;
      this.appendAssistantMessage(errorMsg);
      return;
    }

    this.applySessionResponse(response.data);
  }

  private async resolveOutfit(): Promise<void> {
    if (this.sessionId.length === 0 || this.isResolving) {
      return;
    }

    this.isResolving = true;
    this.screenError = '';
    this.updateFlowCard();

    const response = await aiStylistService.resolveSession(this.sessionId);
    this.isResolving = false;

    if (!response.success || !response.data) {
      const errorMsg = response.error || '方案生成失败，请稍后重试。';
      this.screenError = errorMsg;
      this.appendAssistantMessage(errorMsg);
      return;
    }

    this.applySessionResponse(response.data);
  }

  private async pollSessionStatus(): Promise<void> {
    if (this.sessionId.length === 0) {
      return;
    }

    const response = await aiStylistService.getSessionStatus(this.sessionId);
    if (!response.success || !response.data) {
      return;
    }

    this.applySessionResponse(response.data);

    if (response.data.analysisStatus === 'pending' || response.data.analysisStatus === 'processing') {
      const self = this;
      setTimeout(() => {
        self.pollSessionStatus();
      }, 2000);
    }
  }

  private async handleActionPress(): Promise<void> {
    if (this.nextAction === null) {
      return;
    }

    if (this.nextAction.type === 'generate_outfit' || this.nextAction.type === 'show_outfit_cards') {
      await this.resolveOutfit();
    } else if (this.nextAction.type === 'poll_analysis') {
      await this.pollSessionStatus();
    }
  }

  private getFlowStatusText(): string {
    if (this.progress) {
      const title = this.progress.title;
      const detail = this.progress.detail || '';
      if (detail.length > 0) {
        return `${title}: ${detail}`;
      }
      return title;
    }
    if (this.isBootstrapping) {
      return '正在连接 AI 造型师...';
    }
    if (this.isSending) {
      return '正在理解你的需求...';
    }
    if (this.isResolving) {
      return '正在生成穿搭方案...';
    }
    if (this.analysisStatus === 'pending' || this.analysisStatus === 'processing') {
      return '正在分析身材与色彩...';
    }
    return '';
  }

  private isProcessing(): boolean {
    return (
      this.isBootstrapping ||
      this.isSending ||
      this.isResolving ||
      this.analysisStatus === 'pending' ||
      this.analysisStatus === 'processing' ||
      this.isTyping
    );
  }

  private getActionButtonText(): string {
    if (this.nextAction === null) {
      return '继续';
    }
    if (this.isResolving) {
      return '生成中...';
    }
    const label = actionLabels[this.nextAction.type];
    return label || '继续';
  }

  private getDisplayContent(message: ChatMessage): string {
    if (message.content.length > 0) {
      return message.content;
    }
    if (this.isTyping && this.messages.length > 0 && this.messages[this.messages.length - 1].id === message.id) {
      return '...';
    }
    return '';
  }

  private getBrandText(item: AiStylistOutfitItem): string {
    return item.brand || item.category;
  }

  private getPriceText(item: AiStylistOutfitItem): string {
    if (item.price) {
      return ` · ¥${Math.round(item.price)}`;
    }
    return '';
  }

  build() {
    Column() {
      this.buildHeader();
      this.buildStateStrip();
      this.buildErrorBanner();
      this.buildFlowCard();
      this.buildMessageList();
      this.buildTypingIndicator();
      this.buildActionArea();
      this.buildInputArea();
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }

  @Builder
  buildHeader() {
    Row() {
      Text('AI 造型师')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333333')
      Blank()
      Circle()
        .width(8)
        .height(8)
        .fill(this.screenError.length > 0 ? '#F59E0B' : '#10B981')
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 16, bottom: 12 })
    .backgroundColor('#FFFFFF')
  }

  @Builder
  buildStateStrip() {
    Row() {
      this.buildStatePill('场景', this.sessionState?.sceneReady ?? false);
      this.buildStatePill('风格', this.sessionState?.styleReady ?? false);
      this.buildStatePill('身材', this.sessionState?.bodyReady ?? false);
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 8 })
    .justifyContent(FlexAlign.Start)
  }

  @Builder
  buildStatePill(label: string, ready: boolean) {
    Text(label)
      .fontSize(12)
      .fontWeight(FontWeight.Medium)
      .fontColor(ready ? '#6366F1' : '#999999')
      .padding({ left: 10, right: 10, top: 6, bottom: 6 })
      .borderRadius(16)
      .backgroundColor(ready ? 'rgba(99, 102, 241, 0.1)' : '#F0F0F0')
      .margin({ right: 8 })
  }

  @Builder
  buildErrorBanner() {
    if (this.screenError.length > 0) {
      Text(this.screenError)
        .fontSize(13)
        .fontColor('#B91C1C')
        .padding(12)
        .borderRadius(12)
        .backgroundColor('#FEE2E2')
        .width('100%')
        .margin({ left: 16, right: 16, top: 12 })
    }
  }

  @Builder
  buildFlowCard() {
    if (this.showFlowCard) {
      Row() {
        Column() {
          if (this.flowCardResolved) {
            Text('✓')
              .fontSize(16)
              .fontColor('#10B981')
          } else {
            LoadingProgress()
              .width(16)
              .height(16)
              .color('#6366F1')
          }
        }
        .width(30)
        .height(30)
        .borderRadius(15)
        .backgroundColor('rgba(99, 102, 241, 0.1)')
        .justifyContent(FlexAlign.Center)

        Column() {
          Text(this.flowCardTitle)
            .fontSize(14)
            .fontWeight(FontWeight.Bold)
            .fontColor('#333333')
          if (this.flowCardDetail.length > 0) {
            Text(this.flowCardDetail)
              .fontSize(12)
              .fontColor('#666666')
              .margin({ top: 4 })
          }
        }
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)
        .margin({ left: 12 })
      }
      .width('100%')
      .padding(14)
      .margin({ left: 16, right: 16, top: 12 })
      .borderRadius(16)
      .backgroundColor('#FFFFFF')
      .border({ width: 1, color: '#E5E5E5' })
    }
  }

  @Builder
  buildMessageList() {
    List({ scroller: this.scroller }) {
      ForEach(this.messages, (message: ChatMessage) => {
        ListItem() {
          this.buildMessageItem(message)
        }
      })
      if (this.showQuickQuestions && this.messages.length <= 1 && this.quickQuestions.length > 0) {
        ListItem() {
          this.buildQuickQuestions()
        }
      }
      ForEach(this.resultPlans, (plan: AiStylistOutfitPlan) => {
        ListItem() {
          this.buildOutfitPlan(plan)
        }
      })
    }
    .width('100%')
    .layoutWeight(1)
    .padding({ left: 16, right: 16, top: 16, bottom: 16 })
    .scrollBar(BarState.Off)
  }

  @Builder
  buildMessageItem(message: ChatMessage) {
    Row() {
      if (message.role === 'assistant') {
        Column() {
          Text('AI')
            .fontSize(12)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Bold)
        }
        .width(34)
        .height(34)
        .borderRadius(17)
        .backgroundColor('#6366F1')
        .justifyContent(FlexAlign.Center)

        Text(this.getDisplayContent(message))
          .fontSize(15)
          .fontColor('#333333')
          .lineHeight(22)
          .padding({ left: 14, right: 14, top: 12, bottom: 12 })
          .borderRadius({ topLeft: 4, topRight: 18, bottomRight: 18, bottomLeft: 18 })
          .backgroundColor('#FFFFFF')
          .constraintSize({ maxWidth: '75%' })
          .margin({ left: 8 })
      } else {
        Text(message.content)
          .fontSize(15)
          .fontColor('#FFFFFF')
          .lineHeight(22)
          .padding({ left: 14, right: 14, top: 12, bottom: 12 })
          .borderRadius({ topLeft: 18, topRight: 4, bottomRight: 18, bottomLeft: 18 })
          .backgroundColor('#6366F1')
          .constraintSize({ maxWidth: '75%' })
      }
    }
    .width('100%')
    .justifyContent(message.role === 'user' ? FlexAlign.End : FlexAlign.Start)
    .margin({ top: 8, bottom: 8 })
  }

  @Builder
  buildQuickQuestions() {
    Column() {
      Text('快速开始')
        .fontSize(13)
        .fontColor('#999999')
        .margin({ bottom: 10 })
      Flex({ wrap: FlexWrap.Wrap }) {
        ForEach(this.quickQuestions, (question: string) => {
          Text(question)
            .fontSize(13)
            .fontColor('#333333')
            .padding({ left: 12, right: 12, top: 9, bottom: 9 })
            .borderRadius(18)
            .backgroundColor('#FFFFFF')
            .border({ width: 1, color: '#E5E5E5' })
            .margin({ right: 8, bottom: 8 })
            .onClick(() => this.sendMessage(question))
        })
      }
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
    .margin({ top: 8, bottom: 16 })
  }

  @Builder
  buildOutfitPlan(plan: AiStylistOutfitPlan) {
    Column() {
      Row() {
        Text(plan.title)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333333')
          .layoutWeight(1)
        if (plan.estimatedTotalPrice !== undefined && plan.estimatedTotalPrice !== null) {
          Text(`约 ¥${Math.round(plan.estimatedTotalPrice)}`)
            .fontSize(13)
            .fontColor('#6366F1')
            .fontWeight(FontWeight.Medium)
        }
      }
      .width('100%')
      ForEach(plan.styleExplanation, (line: string) => {
        Text(line)
          .fontSize(13)
          .fontColor('#666666')
          .margin({ top: 6 })
      })
      ForEach(plan.items, (item: AiStylistOutfitItem) => {
        Row() {
          Column() {
            if (item.imageUrl) {
              Image(item.imageUrl)
                .width(60)
                .height(76)
                .borderRadius(14)
                .objectFit(ImageFit.Cover)
            } else {
              Column() {
                Text('👕')
                  .fontSize(20)
              }
              .width(60)
              .height(76)
              .borderRadius(14)
              .backgroundColor('#F0F0F0')
              .justifyContent(FlexAlign.Center)
            }
          }
          Column() {
            Text(item.name)
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor('#333333')
            Text(this.getBrandText(item) + this.getPriceText(item))
              .fontSize(12)
              .fontColor('#999999')
              .margin({ top: 2 })
            Text(item.reason)
              .fontSize(12)
              .fontColor('#666666')
              .margin({ top: 2 })
          }
          .alignItems(HorizontalAlign.Start)
          .layoutWeight(1)
          .margin({ left: 10 })
        }
        .width('100%')
        .padding({ top: 8, bottom: 8 })
      })
    }
    .width('100%')
    .padding(14)
    .borderRadius(20)
    .backgroundColor('#FFFFFF')
    .margin({ top: 12 })
    .alignItems(HorizontalAlign.Start)
  }

  @Builder
  buildTypingIndicator() {
    if (this.showTypingIndicator) {
      Row() {
        LoadingProgress()
          .width(16)
          .height(16)
          .color('#6366F1')
        Text(this.typingIndicatorText)
          .fontSize(13)
          .fontColor('#666666')
          .margin({ left: 10 })
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 10 })
    }
  }

  @Builder
  buildActionArea() {
    if (this.nextAction) {
      Column() {
        if (this.nextAction.type === 'show_preference_buttons' && this.nextAction.options && this.nextAction.options.length > 0) {
          Text('确认偏好')
            .fontSize(13)
            .fontColor('#999999')
            .margin({ bottom: 10 })
          Flex({ wrap: FlexWrap.Wrap }) {
            ForEach(this.nextAction.options, (option: string) => {
              Text(option)
                .fontSize(13)
                .fontColor('#6366F1')
                .fontWeight(FontWeight.Medium)
                .padding({ left: 14, right: 14, top: 10, bottom: 10 })
                .borderRadius(18)
                .backgroundColor('rgba(99, 102, 241, 0.1)')
                .border({ width: 1, color: 'rgba(99, 102, 241, 0.3)' })
                .margin({ right: 8, bottom: 8 })
                .onClick(() => this.sendMessage(option))
            })
          }
        } else {
          Button(this.getActionButtonText())
            .width('100%')
            .height(46)
            .borderRadius(16)
            .backgroundColor('#6366F1')
            .fontColor('#FFFFFF')
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .enabled(!this.isResolving && this.nextAction !== null && this.nextAction.type !== 'poll_analysis')
            .onClick(() => this.handleActionPress())
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 12 })
      .alignItems(HorizontalAlign.Start)
    }
  }

  @Builder
  buildInputArea() {
    Row() {
      TextInput({ placeholder: '输入你的场景、预算或想要的风格' })
        .layoutWeight(1)
        .height(46)
        .borderRadius(18)
        .backgroundColor('#F0F0F0')
        .padding({ left: 14, right: 14 })
        .fontSize(15)
        .fontColor('#333333')
        .placeholderColor('#999999')
        .onChange((value: string) => {
          this.inputText = value;
        })
        .onSubmit(() => {
          this.sendMessage(this.inputText);
        })
      Button() {
        Text('发送')
          .fontSize(14)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Medium)
      }
      .width(60)
      .height(46)
      .borderRadius(23)
      .backgroundColor(this.inputText.trim().length > 0 && this.sessionId.length > 0 && !this.isSending ? '#6366F1' : '#CCCCCC')
      .margin({ left: 12 })
      .enabled(this.inputText.trim().length > 0 && this.sessionId.length > 0 && !this.isSending)
      .onClick(() => this.sendMessage(this.inputText))
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 10, bottom: 16 })
    .backgroundColor('#FFFFFF')
    .border({ width: 1, color: '#E5E5E5' })
  }
}

export default AIStylist;
