import { defineConfig } from "@tarojs/cli";

export default defineConfig({
  env: {
    NODE_ENV: '"production"',
  },
  defineConstants: {
    "process.env.API_BASE": '"https://api.xuno.ai/api/v1"',
  },
  mini: {},
  h5: {},
});
