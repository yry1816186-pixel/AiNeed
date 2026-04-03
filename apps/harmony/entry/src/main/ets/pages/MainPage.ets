import { Home } from './Home';
import { Wardrobe } from './Wardrobe';
import AIStylist from './AIStylist';
import { TryOn } from './TryOn';
import { Profile } from './Profile';

interface TabItem {
  title: string;
  icon: Resource;
  activeIcon: Resource;
}

@Entry
@Component
struct MainPage {
  @State currentIndex: number = 0;

  private tabs: TabItem[] = [
    { title: '首页', icon: $r('app.media.ic_home'), activeIcon: $r('app.media.ic_home_filled') },
    { title: '衣橱', icon: $r('app.media.ic_wardrobe'), activeIcon: $r('app.media.ic_wardrobe_filled') },
    { title: 'AI造型师', icon: $r('app.media.ic_ai'), activeIcon: $r('app.media.ic_ai_filled') },
    { title: '试衣', icon: $r('app.media.ic_tryon'), activeIcon: $r('app.media.ic_tryon_filled') },
    { title: '我的', icon: $r('app.media.ic_profile'), activeIcon: $r('app.media.ic_profile_filled') }
  ];

  @Builder
  TabBuilder(index: number) {
    Column() {
      Image(this.currentIndex === index ? this.tabs[index].activeIcon : this.tabs[index].icon)
        .width(24)
        .height(24)
        .fillColor(this.currentIndex === index ? $r('app.color.primary_color') : '#999999')

      Text(this.tabs[index].title)
        .fontSize(10)
        .fontColor(this.currentIndex === index ? $r('app.color.primary_color') : '#999999')
        .margin({ top: 4 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  build() {
    Tabs({ barPosition: BarPosition.End }) {
      TabContent() {
        Home()
      }
      .tabBar(this.TabBuilder(0))

      TabContent() {
        Wardrobe()
      }
      .tabBar(this.TabBuilder(1))

      TabContent() {
        AIStylist()
      }
      .tabBar(this.TabBuilder(2))

      TabContent() {
        TryOn()
      }
      .tabBar(this.TabBuilder(3))

      TabContent() {
        Profile()
      }
      .tabBar(this.TabBuilder(4))
    }
    .barHeight(56)
    .barBackgroundColor('#FFFFFF')
    .onChange((index: number) => {
      this.currentIndex = index;
    })
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
