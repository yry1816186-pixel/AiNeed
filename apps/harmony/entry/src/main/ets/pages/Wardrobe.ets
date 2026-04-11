@Component
export struct Wardrobe {
  @State categories: string[] = ['全部', '上衣', '裤子', '裙子', '外套', '鞋靴', '配饰'];
  @State selectedCategory: number = 0;

  build() {
    Column() {
      Text('我的衣橱')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 20, bottom: 16 })

      Row() {
        ForEach(this.categories, (category: string, index: number) => {
          Text(category)
            .fontSize(14)
            .padding({ left: 12, right: 12, top: 6, bottom: 6 })
            .borderRadius(16)
            .backgroundColor(this.selectedCategory === index ? $r('app.color.primary_color') : '#F0F0F0')
            .fontColor(this.selectedCategory === index ? '#FFFFFF' : '#666666')
            .onClick(() => {
              this.selectedCategory = index;
            })
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16 })

      Grid() {
        ForEach([1, 2, 3, 4, 5, 6], (item: number) => {
          GridItem() {
            Column() {
              Image($r('app.media.placeholder_clothing'))
                .width('100%')
                .height(150)
                .borderRadius(8)
                .backgroundColor('#E5E5E5')
              Text('服装 ' + item)
                .fontSize(12)
                .margin({ top: 8 })
            }
          }
        })
      }
      .columnsTemplate('1fr 1fr')
      .rowsGap(16)
      .columnsGap(16)
      .width('100%')
      .layoutWeight(1)
      .padding(16)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
