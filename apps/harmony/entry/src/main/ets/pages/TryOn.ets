@Component
export struct TryOn {
  @State selectedClothing: string = '';
  @State isProcessing: boolean = false;

  build() {
    Column() {
      Text('虚拟试衣')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 20, bottom: 16 })

      Column() {
        Text('选择服装')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .margin({ bottom: 12 })

        Row() {
          ForEach([1, 2, 3], (item: number) => {
            Column() {
              Image($r('app.media.placeholder_clothing'))
                .width(80)
                .height(100)
                .borderRadius(8)
                .backgroundColor('#E5E5E5')
                .border({
                  width: this.selectedClothing === 'item_' + item ? 2 : 0,
                  color: $r('app.color.primary_color')
                })
                .onClick(() => {
                  this.selectedClothing = 'item_' + item;
                })
            }
            .margin({ left: 8, right: 8 })
          })
        }
      }
      .width('100%')
      .padding(16)
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16 })

      Column() {
        Text('试衣效果')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .margin({ bottom: 12 })

        if (this.isProcessing) {
          LoadingProgress()
            .width(50)
            .height(50)
            .color($r('app.color.primary_color'))
        } else {
          Image($r('app.media.placeholder_model'))
            .width(200)
            .height(280)
            .borderRadius(12)
            .backgroundColor('#E5E5E5')
        }
      }
      .width('100%')
      .layoutWeight(1)
      .padding(16)
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16, top: 16 })
      .justifyContent(FlexAlign.Center)

      Button('开始试衣')
        .width('90%')
        .height(48)
        .borderRadius(24)
        .backgroundColor($r('app.color.primary_color'))
        .margin({ top: 16, bottom: 16 })
        .enabled(this.selectedClothing !== '')
        .onClick(() => {
          this.isProcessing = true;
          setTimeout(() => {
            this.isProcessing = false;
          }, 3000);
        })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
