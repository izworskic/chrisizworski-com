const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
  AUDIENCE,
  authorizeCronRequest,
  verifyGitHubActionsToken,
  _internal,
} = require("../lib/fall-color/github-actions-oidc.js");

const NOW_MS = Date.UTC(2026, 7, 16, 16, 0, 0);
const NOW_SECONDS = Math.floor(NOW_MS / 1000);
const SHA = "a".repeat(40);
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: "jwk" });
publicJwk.kid = "test-key";
publicJwk.alg = "RS256";
publicJwk.use = "sig";

function encodedJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeToken(overrides = {}, key = privateKey, headerOverrides = {}) {
  const header = { alg: "RS256", kid: "test-key", typ: "JWT", ...headerOverrides };
  const payload = {
    iss: _internal.ISSUER,
    aud: AUDIENCE,
    iat: NOW_SECONDS - 5,
    nbf: NOW_SECONDS - 5,
    exp: NOW_SECONDS + 300,
    repository: "izworskic/chrisizworski-com",
    repository_id: "1305741696",
    repository_owner: "izworskic",
    repository_owner_id: "46615230",
    repository_visibility: "public",
    ref: _internal.MAIN_REF,
    ref_type: "branch",
    job_workflow_ref: _internal.JOB_WORKFLOW_REF,
    runner_environment: "github-hosted",
    event_name: "push",
    sha: SHA,
    sub: "repo:izworskic/chrisizworski-com:ref:refs/heads/main",
    ...overrides,
  };
  const signingInput = encodedJson(header) + "." + encodedJson(payload);
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), key).toString("base64url");
  return signingInput + "." + signature;
}

function githubJwksFetch() {
  return async (url) => {
    assert.equal(url, _internal.JWKS_URL);
    return {
      ok: true,
      headers: { get: (name) => name.toLowerCase() === "cache-control" ? "public, max-age=300" : null },
      json: async () => ({ keys: [publicJwk] }),
    };
  };
}

async function verify(token, options = {}) {
  _internal.clearJwksCache();
  return verifyGitHubActionsToken(token, {
    fetchImpl: githubJwksFetch(),
    nowMs: NOW_MS,
    expectedSha: SHA,
    ...options,
  });
}

test("accepts a signed GitHub-hosted run of the exact main-branch workflow", async () => {
  assert.equal(await verify(makeToken()), true);
  assert.equal(await verify(makeToken({ event_name: "workflow_dispatch" })), true);
});

test("rejects tokens that can be replayed from another audience, repo, ref, workflow, or deployment", async () => {
  const invalidClaims = [
    { aud: "https://example.com" },
    { repository: "izworskic/another-repo" },
    { repository_id: "999" },
    { ref: "refs/heads/feature" },
    { job_workflow_ref: "izworskic/chrisizworski-com/.github/workflows/other.yml@refs/heads/main" },
    { sha: "b".repeat(40) },
    { runner_environment: "self-hosted" },
    { event_name: "pull_request" },
  ];
  for (const claims of invalidClaims) {
    assert.equal(await verify(makeToken(claims)), false, JSON.stringify(claims));
  }
});

test("rejects expired, stale, malformed, unsigned, and unknown-key tokens", async () => {
  assert.equal(await verify(makeToken({ exp: NOW_SECONDS - 31 })), false);
  assert.equal(await verify(makeToken({ iat: NOW_SECONDS - (16 * 60) })), false);
  assert.equal(await verify("not-a-jwt"), false);

  const tampered = makeToken().split(".");
  tampered[1] = encodedJson({ aud: AUDIENCE });
  assert.equal(await verify(tampered.join(".")), false);
  assert.equal(await verify(makeToken({}, privateKey, { kid: "unknown" })), false);
});

test("keeps CRON_SECRET as the scheduled-job credential and permits OIDC only for test=1", async () => {
  const neverVerify = async () => { throw new Error("OIDC verifier should not run"); };
  assert.equal(await authorizeCronRequest({
    authorization: "Bearer cron-value",
    cronSecret: "cron-value",
    isTest: false,
    verifyToken: neverVerify,
  }), true);

  let received = null;
  const verifyToken = async (token, options) => {
    received = { token, options };
    return true;
  };
  assert.equal(await authorizeCronRequest({
    authorization: "Bearer oidc-value",
    isTest: false,
    verifyToken,
  }), false);
  assert.equal(received, null);

  assert.equal(await authorizeCronRequest({
    authorization: "Bearer oidc-value",
    isTest: true,
    expectedSha: SHA,
    verifyToken,
  }), true);
  assert.deepEqual(received, { token: "oidc-value", options: { expectedSha: SHA } });
});
