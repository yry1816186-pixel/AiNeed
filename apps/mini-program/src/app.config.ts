export default defineAppConfig({
  pages: ["pages/index/index", "pages/profile/index"],
  subPackages: [
    {
      root: "pages/chat",
      pages: ["index"],
    },
    {
      root: "pages/search",
      pages: ["index"],
    },
    {
      root: "pages/social",
      pages: ["index"],
    },
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#FAFAF8",
    navigationBarTitleText: "寻裳",
    navigationBarTextStyle: "black",
  },
});
