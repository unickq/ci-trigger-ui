export const PROVIDER_META = [
  {
    type: "github" as const,
    actionType: "github-workflow-dispatch" as const,
    label: "GitHub",
    iconId: "github-icon",
    tokenHelpUrl: "https://github.com/settings/tokens",
    defaultBaseUrl: "https://api.github.com",
  },
  {
    type: "circleci" as const,
    actionType: "circleci-pipeline" as const,
    label: "CircleCI",
    iconId: "circleci-icon",
    tokenHelpUrl: "https://app.circleci.com/settings/user/tokens",
    defaultBaseUrl: "https://circleci.com/api/v2",
  },
] as const;

export type ProviderType = (typeof PROVIDER_META)[number]["type"];
export type ActionType = (typeof PROVIDER_META)[number]["actionType"];
