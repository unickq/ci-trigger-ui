import type { ProviderType, ActionType } from "./providerMeta";
export type { ProviderType, ActionType };

export type ProviderConfig = {
  id: string;
  name: string;
  type: ProviderType;
  token: string;
  baseUrl?: string;
};

export type GitHubActionConfig = {
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  inputs?: Record<string, unknown>;
};

export type CircleCiActionConfig = {
  projectSlug: string;
  branch: string;
  parameters?: Record<string, unknown>;
};

export type SavedAction = {
  id: string;
  name: string;
  providerId: string;
  type: ActionType;
  config: GitHubActionConfig | CircleCiActionConfig;
  pinned?: boolean;
};

export type RunStatus = "success" | "error";

export type RunLog = {
  id: string;
  actionId: string;
  startedAt: string;
  status: RunStatus;
  requestPayload: unknown;
  responsePayload?: unknown;
  error?: string;
  url?: string;
};
