/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-platform-to-identity",
      comment: "Platform layer must not depend on identity domain",
      severity: "error",
      from: { path: "^src/domains/platform/" },
      to: { path: "^src/domains/identity/" },
    },
    {
      name: "no-common-to-domain",
      comment: "Common layer must not depend on any domain",
      severity: "error",
      from: { path: "^src/common/" },
      to: { path: "^src/domains/" },
    },
    {
      name: "no-identity-to-unmigrated-modules",
      comment:
        "Identity domain should not depend on unmigrated modules (transitional)",
      severity: "warn",
      from: { path: "^src/domains/identity/" },
      to: { path: "^src/modules/" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: "\\.d\\.ts$",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "./tsconfig.json",
    },
  },
};
