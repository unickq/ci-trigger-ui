import { describe, it, expect } from "vitest";
import { getProviderDef } from "./providers";
import type { SavedAction, ProviderConfig } from "./types";

// ─── fixtures ────────────────────────────────────────────────────────────────

const ghProvider: ProviderConfig = {
  id: "p1",
  name: "My GitHub",
  type: "github",
  token: "ghp_test",
};

const ghAction: SavedAction = {
  id: "a1",
  name: "Deploy prod",
  providerId: "p1",
  type: "github-workflow-dispatch",
  config: { owner: "acme", repo: "app", workflowId: "deploy.yml", ref: "main", inputs: { env: "prod" } },
};

const ccProvider: ProviderConfig = {
  id: "p2",
  name: "My CircleCI",
  type: "circleci",
  token: "cc_test",
};

const ccAction: SavedAction = {
  id: "a2",
  name: "Run tests",
  providerId: "p2",
  type: "circleci-pipeline",
  config: { projectSlug: "github/acme/app", branch: "main", parameters: { run_e2e: true } },
};

// ─── GitHub ───────────────────────────────────────────────────────────────────

describe("github", () => {
  const def = getProviderDef("github");

  describe("buildCardInfo", () => {
    const info = def.buildCardInfo(ghAction.config);
    it("repoUrl points to github.com", () => {
      expect(info.repoUrl).toBe("https://github.com/acme/app");
    });
    it("pipelineUrl includes workflow file", () => {
      expect(info.pipelineUrl).toBe("https://github.com/acme/app/actions/workflows/deploy.yml");
    });
    it("ref is correct", () => {
      expect(info.ref).toBe("main");
    });
    it("params are returned", () => {
      expect(info.params).toEqual({ env: "prod" });
    });
    it("params null when inputs empty", () => {
      const info2 = def.buildCardInfo({ ...ghAction.config, inputs: {} } as never);
      expect(info2.params).toBeNull();
    });
  });

  describe("buildResultUrl", () => {
    it("includes branch filter query", () => {
      const url = def.buildResultUrl(ghAction, null);
      expect(url).toBe("https://github.com/acme/app/actions/workflows/deploy.yml?query=branch%3Amain");
    });
  });

  describe("buildRequest", () => {
    const { url, init } = def.buildRequest(ghAction, ghProvider);
    it("posts to correct dispatch endpoint", () => {
      expect(url).toBe("https://api.github.com/repos/acme/app/actions/workflows/deploy.yml/dispatches");
      expect(init.method).toBe("POST");
    });
    it("includes Authorization header", () => {
      expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer ghp_test");
    });
    it("body contains ref and inputs", () => {
      const body = JSON.parse(init.body as string);
      expect(body.ref).toBe("main");
      expect(body.inputs).toEqual({ env: "prod" });
    });
    it("uses custom baseUrl when set", () => {
      const { url } = def.buildRequest(ghAction, { ...ghProvider, baseUrl: "https://ghe.acme.com" });
      expect(url.startsWith("https://ghe.acme.com")).toBe(true);
    });
  });

  describe("buildCurl", () => {
    const curl = def.buildCurl(ghAction, ghProvider);
    it("uses circleci.com by default (not proxy)", () => {
      expect(curl).toContain("https://api.github.com");
    });
    it("includes token", () => {
      expect(curl).toContain("ghp_test");
    });
  });

  describe("mergeParams", () => {
    it("replaces inputs, keeps other fields", () => {
      const result = def.mergeParams(ghAction.config, { env: "staging" }) as typeof ghAction.config;
      expect((result as never as { inputs: unknown }).inputs).toEqual({ env: "staging" });
      expect((result as never as { owner: string }).owner).toBe("acme");
    });
  });
});

// ─── CircleCI ─────────────────────────────────────────────────────────────────

describe("circleci", () => {
  const def = getProviderDef("circleci");

  describe("buildCardInfo", () => {
    const info = def.buildCardInfo(ccAction.config);
    it("pipelineUrl points to app.circleci.com", () => {
      expect(info.pipelineUrl).toBe("https://app.circleci.com/pipelines/github/acme/app");
    });
    it("repoUrl resolves from slug", () => {
      expect(info.repoUrl).toBe("https://github.com/acme/app");
    });
    it("ref is branch", () => {
      expect(info.ref).toBe("main");
    });
    it("params are returned", () => {
      expect(info.params).toEqual({ run_e2e: true });
    });
    it("params null when parameters empty", () => {
      const info2 = def.buildCardInfo({ ...ccAction.config, parameters: {} } as never);
      expect(info2.params).toBeNull();
    });
    it("repoUrl null for unknown vcs prefix", () => {
      const info3 = def.buildCardInfo({ ...ccAction.config, projectSlug: "gitlab/acme/app" } as never);
      expect(info3.repoUrl).toBeNull();
    });
  });

  describe("buildResultUrl", () => {
    it("uses pipeline number when present", () => {
      const url = def.buildResultUrl(ccAction, { number: 42 });
      expect(url).toBe("https://app.circleci.com/pipelines/github/acme/app/42");
    });
    it("falls back to project pipelines page when no number", () => {
      const url = def.buildResultUrl(ccAction, null);
      expect(url).toBe("https://app.circleci.com/pipelines/github/acme/app");
    });
    it("falls back when response is unexpected shape", () => {
      const url = def.buildResultUrl(ccAction, { id: "abc" });
      expect(url).toBe("https://app.circleci.com/pipelines/github/acme/app");
    });
  });

  describe("buildRequest", () => {
    const { url, init } = def.buildRequest(ccAction, ccProvider);
    it("posts to pipeline endpoint", () => {
      expect(url).toContain("/project/github/acme/app/pipeline");
      expect(init.method).toBe("POST");
    });
    it("includes Circle-Token header", () => {
      expect((init.headers as Record<string, string>)["Circle-Token"]).toBe("cc_test");
    });
    it("body contains branch and parameters", () => {
      const body = JSON.parse(init.body as string);
      expect(body.branch).toBe("main");
      expect(body.parameters).toEqual({ run_e2e: true });
    });
  });

  describe("buildCurl", () => {
    const curl = def.buildCurl(ccAction, ccProvider);
    it("uses circleci.com directly (not proxy)", () => {
      expect(curl).toContain("https://circleci.com/api/v2");
    });
    it("includes token", () => {
      expect(curl).toContain("cc_test");
    });
  });

  describe("mergeParams", () => {
    it("replaces parameters, keeps other fields", () => {
      const result = def.mergeParams(ccAction.config, { run_e2e: false, deploy: true }) as never as {
        parameters: unknown;
        projectSlug: string;
      };
      expect(result.parameters).toEqual({ run_e2e: false, deploy: true });
      expect(result.projectSlug).toBe("github/acme/app");
    });
  });
});
