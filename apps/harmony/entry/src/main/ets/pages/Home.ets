@Component
export struct Home {
  @State message: string = 'AiNeed - 智能私人形象定制';

  build() {
    Column() {
      Text(this.message)
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor('#333333')
        .margin({ top: 20, bottom: 20 })

      Column() {
        Text('今日推荐')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .margin({ bottom: 16 })

        Row() {
          ForEach([1, 2, 3], (item: number) => {
            Column() {
              Image($r('app.media.placeholder_outfit'))
                .width(100)
                .height(120)
                .borderRadius(8)
                .backgroundColor('#E5E5E5')
              Text('穿搭方案 ' + item)
                .fontSize(12)
                .margin({ top: 8 })
            }
            .layoutWeight(1)
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
        Text('AI 功能')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .margin({ bottom: 16 })

        Grid() {
          GridItem() {
            Column() {
              Image($r('app.media.ic_ai'))
                .width(40)
                .height(40)
                .fillColor($r('app.color.primary_color'))
              Text('AI 造型师')
                .fontSize(14)
                .margin({ top: 8 })
            }
          }

          GridItem() {
            Column() {
              Image($r('app.media.ic_tryon'))
                .width(40)
                .height(40)
                .fillColor($r('app.color.primary_color'))
              Text('虚拟试衣')
                .fontSize(14)
                .margin({ top: 8 })
            }
          }

          GridItem() {
            Column() {
              Image($r('app.media.ic_wardrobe'))
                .width(40)
                .height(40)
                .fillColor($r('app.color.primary_color'))
              Text('身体分析')
                .fontSize(14)
                .margin({ top: 8 })
            }
          }

          GridItem() {
            Column() {
              Image($r('app.media.ic_profile'))
                .width(40)
                .height(40)
                .fillColor($r('app.color.primary_color'))
              Text('风格档案')
                .fontSize(14)
                .margin({ top: 8 })
            }
          }
        }
        .columnsTemplate('1fr 1fr 1fr 1fr')
        .rowsTemplate('1fr')
        .width('100%')
        .height(100)
      }
      .width('100%')
      .padding(16)
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16, top: 16 })
    }
    .width('100%')
    .height('100%')
  }
}
