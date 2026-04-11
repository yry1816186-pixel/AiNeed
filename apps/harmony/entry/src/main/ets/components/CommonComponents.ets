@Component
export struct LoadingOverlay {
  @Prop message: string = '加载中...';
  @Prop isVisible: boolean = false;

  build() {
    if (this.isVisible) {
      Column() {
        Column() {
          LoadingProgress()
            .width(50)
            .height(50)
            .color('#FFFFFF')
          
          Text(this.message)
            .fontSize(14)
            .fontColor('#FFFFFF')
            .margin({ top: 16 })
        }
        .padding(24)
        .backgroundColor('rgba(0, 0, 0, 0.7)')
        .borderRadius(12)
      }
      .width('100%')
      .height('100%')
      .backgroundColor('rgba(0, 0, 0, 0.3)')
      .justifyContent(FlexAlign.Center)
    }
  }
}

@Component
export struct EmptyState {
  @Prop icon: Resource = $r('app.media.ic_empty');
  @Prop title: string = '暂无数据';
  @Prop description: string = '';

  build() {
    Column() {
      Image(this.icon)
        .width(80)
        .height(80)
        .fillColor('#CCCCCC')
      
      Text(this.title)
        .fontSize(16)
        .fontColor('#666666')
        .margin({ top: 16 })
      
      if (this.description) {
        Text(this.description)
          .fontSize(14)
          .fontColor('#999999')
          .margin({ top: 8 })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}

@Component
export struct ErrorState {
  @Prop title: string = '加载失败';
  @Prop message: string = '';
  @Prop retryText: string = '重试';
  onRetry?: () => void;

  build() {
    Column() {
      Image($r('app.media.ic_error'))
        .width(80)
        .height(80)
        .fillColor('#FF6B6B')
      
      Text(this.title)
        .fontSize(16)
        .fontColor('#666666')
        .margin({ top: 16 })
      
      if (this.message) {
        Text(this.message)
          .fontSize(14)
          .fontColor('#999999')
          .margin({ top: 8 })
      }
      
      if (this.onRetry) {
        Button(this.retryText)
          .width(120)
          .height(40)
          .borderRadius(20)
          .backgroundColor('#6366F1')
          .margin({ top: 24 })
          .onClick(() => {
            if (this.onRetry) {
              this.onRetry();
            }
          })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
