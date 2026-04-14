// commitlint.config.js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Types allowed — conventional defaults + "note" for curriculum additions
    "type-enum": [
      2,
      "always",
      [
        "feat", // new feature
        "fix", // bug fix
        "docs", // documentation only
        "style", // formatting, no logic change
        "refactor", // code change, no feature/fix
        "test", // adding or updating tests
        "chore", // tooling, config, dependencies
        "perf", // performance improvement
        "ci", // CI/CD changes
        "revert", // reverts a previous commit
        "note", // curriculum note added or updated
      ],
    ],
    // Scope is optional but must be one of the listed values if provided
    "scope-enum": [
      1,
      "always",
      [
        "app",
        "tts",
        "search",
        "sw", // service worker
        "manifest", // notes-manifest
        "notes", // curriculum notes
        "deps", // dependency updates
        "ci",
        "config",
        "docs",
        "biome",
        "types",
      ],
    ],
    // Subject must not end with a period
    "subject-full-stop": [2, "never", "."],
    // Subject must start with a lowercase letter
    "subject-case": [2, "always", "lower-case"],
    // Header max length
    "header-max-length": [2, "always", 100],
    // Body and footer must have a blank line before them
    "body-leading-blank": [1, "always"],
    "footer-leading-blank": [1, "always"],
  },
};
