import { PROVIDER_META, type ProviderType, type ActionType } from "./providerMeta";
import type { ProviderConfig, SavedAction } from "./types";

export type CardInfo = {
  repoUrl: string | null;
  repoLabel: string | null;
  pipelineUrl: string;
  pipelineLabel: string;
  ref: string;
  params: Record<string, unknown> | null;
};

// Provider-specific fields for the action form (partial - only fields relevant to the provider)
export type ActionFormFields = {
  owner?: string;
  repo?: string;
  workflowId?: string;
  ref?: string;
  inputsJson?: string;
  projectSlug?: string;
  branch?: string;
  parametersJson?: string;
};

export type ProviderDef = {
  type: ProviderType;
  label: string;
  iconId: string;
  tokenHelpUrl: string;
  defaultBaseUrl: string;
  actionType: ActionType;
  buildCardInfo(config: SavedAction["config"]): CardInfo;
  buildFormState(config: SavedAction["config"]): ActionFormFields;
  buildCurl(action: SavedAction, provider: ProviderConfig): string;
  buildRequest(action: SavedAction, provider: ProviderConfig): { url: string; init: RequestInit };
  buildResultUrl(action: SavedAction, responseJson: unknown): string | null;
  mergeParams(config: SavedAction["config"], params: Record<string, unknown>): SavedAction["config"];
  fetchRunUrl?(action: SavedAction, provider: ProviderConfig, dispatchedAt: string): Promise<string | null>;
};

const githubMeta = PROVIDER_META.find((m) => m.type === "github")!;

const github: ProviderDef = {
  ...githubMeta,

  buildCardInfo(config) {
    const { owner, repo, workflowId, ref, inputs } = config as {
      owner: string;
      repo: string;
      workflowId: string;
      ref: string;
      inputs?: Record<string, unknown>;
    };
    return {
      repoUrl: `https://github.com/${owner}/${repo}`,
      repoLabel: `${owner}/${repo}`,
      pipelineUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowId}`,
      pipelineLabel: workflowId,
      ref,
      params: inputs && Object.keys(inputs).length > 0 ? inputs : null,
    };
  },

  buildFormState(config) {
    const { owner, repo, workflowId, ref, inputs } = config as {
      owner: string;
      repo: string;
      workflowId: string;
      ref: string;
      inputs?: Record<string, unknown>;
    };
    return {
      owner: owner ?? "",
      repo: repo ?? "",
      workflowId: workflowId ?? "",
      ref: ref ?? "main",
      inputsJson: JSON.stringify(inputs ?? {}, null, 2),
    };
  },

  buildCurl(action, provider) {
    const { owner, repo, workflowId, ref, inputs } = action.config as {
      owner: string;
      repo: string;
      workflowId: string;
      ref: string;
      inputs?: Record<string, unknown>;
    };
    const base = provider.baseUrl ?? "https://api.github.com";
    const url = `${base}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;
    return [
      `curl -X POST \\`,
      `  -H "Accept: application/vnd.github+json" \\`,
      `  -H "Authorization: Bearer ${provider.token}" \\`,
      `  ${url} \\`,
      `  -d '${JSON.stringify({ ref, inputs: inputs ?? {} })}'`,
    ].join("\n");
  },

  buildRequest(action, provider) {
    const { owner, repo, workflowId, ref, inputs } = action.config as {
      owner: string;
      repo: string;
      workflowId: string;
      ref: string;
      inputs?: Record<string, unknown>;
    };
    const base = provider.baseUrl ?? github.defaultBaseUrl;
    return {
      url: `${base}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      init: {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${provider.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref, inputs: inputs ?? {} }),
      },
    };
  },

  buildResultUrl(action) {
    const { owner, repo, workflowId, ref } = action.config as {
      owner: string;
      repo: string;
      workflowId: string;
      ref: string;
    };
    return `https://github.com/${owner}/${repo}/actions/workflows/${workflowId}?query=branch%3A${ref}`;
  },

  mergeParams(config, params) {
    return { ...(config as object), inputs: params } as SavedAction["config"];
  },

  async fetchRunUrl(action, provider, dispatchedAt) {
    await new Promise((r) => setTimeout(r, 2000));
    const { owner, repo, workflowId, ref } = action.config as {
      owner: string;
      repo: string;
      workflowId: string;
      ref: string;
    };
    const base = provider.baseUrl ?? github.defaultBaseUrl;
    try {
      const res = await fetch(
        `${base}/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?event=workflow_dispatch&branch=${encodeURIComponent(ref)}&per_page=5`,
        { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${provider.token}` } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      const run = (data.workflow_runs as { created_at: string; html_url: string }[])?.find(
        (r) => r.created_at >= dispatchedAt,
      );
      return run?.html_url ?? data.workflow_runs?.[0]?.html_url ?? null;
    } catch {
      return null;
    }
  },
};

function repoUrlFromSlug(slug: string): { url: string; label: string } | null {
  const [vcs, org, repo] = slug.split("/");
  if (!org || !repo) return null;
  if (vcs === "gh" || vcs === "github") return { url: `https://github.com/${org}/${repo}`, label: `${org}/${repo}` };
  if (vcs === "bb" || vcs === "bitbucket")
    return { url: `https://bitbucket.org/${org}/${repo}`, label: `${org}/${repo}` };
  return null;
}

const circleciMeta = PROVIDER_META.find((m) => m.type === "circleci")!;

const circleci: ProviderDef = {
  ...circleciMeta,

  buildCardInfo(config) {
    const { projectSlug, branch, parameters } = config as {
      projectSlug: string;
      branch: string;
      parameters?: Record<string, unknown>;
    };
    const repo = repoUrlFromSlug(projectSlug);
    return {
      repoUrl: repo?.url ?? null,
      repoLabel: repo?.label ?? null,
      pipelineUrl: `https://app.circleci.com/pipelines/${projectSlug}`,
      pipelineLabel: "CircleCI pipelines",
      ref: branch,
      params: parameters && Object.keys(parameters).length > 0 ? parameters : null,
    };
  },

  buildFormState(config) {
    const { projectSlug, branch, parameters } = config as {
      projectSlug: string;
      branch: string;
      parameters?: Record<string, unknown>;
    };
    return {
      projectSlug: projectSlug ?? "",
      branch: branch ?? "main",
      parametersJson: JSON.stringify(parameters ?? {}, null, 2),
    };
  },

  buildCurl(action, provider) {
    const { projectSlug, branch, parameters } = action.config as {
      projectSlug: string;
      branch: string;
      parameters?: Record<string, unknown>;
    };
    const base = provider.baseUrl ?? "https://circleci.com/api/v2";
    const url = `${base}/project/${projectSlug}/pipeline`;
    return [
      `curl -X POST \\`,
      `  -H "Circle-Token: ${provider.token}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  ${url} \\`,
      `  -d '${JSON.stringify({ branch, parameters: parameters ?? {} })}'`,
    ].join("\n");
  },

  buildRequest(action, provider) {
    const { projectSlug, branch, parameters } = action.config as {
      projectSlug: string;
      branch: string;
      parameters?: Record<string, unknown>;
    };
    const base = provider.baseUrl ?? import.meta.env.VITE_CIRCLECI_PROXY ?? circleci.defaultBaseUrl;
    return {
      url: `${base}/project/${projectSlug}/pipeline`,
      init: {
        method: "POST",
        headers: { "Circle-Token": provider.token, "Content-Type": "application/json" },
        body: JSON.stringify({ branch, parameters: parameters ?? {} }),
      },
    };
  },

  buildResultUrl(action, responseJson) {
    const { projectSlug } = action.config as { projectSlug: string };
    const json = responseJson as { number?: number } | null;
    if (json?.number) {
      const [vcs, org, repo] = projectSlug.split("/");
      return `https://app.circleci.com/pipelines/${vcs}/${org}/${repo}/${json.number}`;
    }
    return `https://app.circleci.com/pipelines/${projectSlug}`;
  },

  mergeParams(config, params) {
    return { ...(config as object), parameters: params } as SavedAction["config"];
  },
};

export const PROVIDERS: ProviderDef[] = [github, circleci];

export function getProviderDef(type: ProviderType): ProviderDef {
  const def = PROVIDERS.find((p) => p.type === type);
  if (!def) throw new Error(`Unknown provider type: ${type}`);
  return def;
}

export function getProviderDefByActionType(actionType: ActionType): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.actionType === actionType);
}
