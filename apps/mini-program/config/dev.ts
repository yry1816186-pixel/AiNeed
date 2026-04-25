import { defineConfig } from "@tarojs/cli";

export default defineConfig({
  env: {
    NODE_ENV: '"development"',
  },
  defineConstants: {
    "process.env.API_BASE": '"http://localhost:3001/api/v1"',
  },
  mini: {},
  h5: {},
});
