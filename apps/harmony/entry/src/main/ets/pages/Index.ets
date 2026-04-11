@Entry
@Component
struct Index {
  build() {
    Column() {
      Text('AiNeed Harmony Baseline')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.primary_color'))

      Text('Harmony build baseline is restored to a minimal shell.')
        .fontSize(14)
        .fontColor('#666666')
        .margin({ top: 12 })

      Text('Feature pages are being migrated to strict ArkTS compatibility.')
        .fontSize(12)
        .fontColor('#999999')
        .margin({ top: 8 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .padding(24)
    .backgroundColor('#F5F5F5')
  }
}
