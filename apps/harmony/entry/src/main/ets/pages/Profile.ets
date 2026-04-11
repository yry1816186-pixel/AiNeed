@Component
export struct Profile {
  @State userName: string = '用户';
  @State bodyType: string = '未分析';
  @State colorSeason: string = '未分析';

  build() {
    Column() {
      Text('我的')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 20, bottom: 16 })

      Column() {
        Row() {
          Image($r('app.media.ic_profile'))
            .width(60)
            .height(60)
            .fillColor('#CCCCCC')
            .borderRadius(30)
            .backgroundColor('#F0F0F0')

          Column() {
            Text(this.userName)
              .fontSize(18)
              .fontWeight(FontWeight.Medium)
            Text('点击编辑个人资料')
              .fontSize(12)
              .fontColor('#999999')
              .margin({ top: 4 })
          }
          .alignItems(HorizontalAlign.Start)
          .margin({ left: 16 })
          .layoutWeight(1)
        }
        .width('100%')
        .padding(16)
      }
      .width('100%')
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16 })

      Column() {
        Text('身体档案')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .margin({ bottom: 12 })

        Row() {
          Column() {
            Text('体型')
              .fontSize(12)
              .fontColor('#999999')
            Text(this.bodyType)
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
              .margin({ top: 4 })
          }
          .layoutWeight(1)

          Column() {
            Text('色彩季型')
              .fontSize(12)
              .fontColor('#999999')
            Text(this.colorSeason)
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
              .margin({ top: 4 })
          }
          .layoutWeight(1)
        }
        .width('100%')

        Button('开始身体分析')
          .width('100%')
          .height(40)
          .borderRadius(20)
          .backgroundColor($r('app.color.primary_color'))
          .margin({ top: 16 })
      }
      .width('100%')
      .padding(16)
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16, top: 16 })

      Column() {
        ForEach(['设置', '帮助与反馈', '关于'], (item: string) => {
          Row() {
            Text(item)
              .fontSize(16)
            Blank()
            Image($r('app.media.ic_arrow_right'))
              .width(16)
              .height(16)
              .fillColor('#CCCCCC')
          }
          .width('100%')
          .padding({ top: 16, bottom: 16 })
          .border({ width: { bottom: 0.5 }, color: '#E5E5E5' })
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16 })
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16, top: 16 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
