import { getApiUrl } from "./index";

// __APP_KEY__ is provided by jest.setup.ts (globalThis) = "roleMgmt".

describe("getApiUrl", () => {
  it("membangun path same-origin /mfe-api/<APP_KEY>/<path>", () => {
    // roleList = "/api/roles/list"
    expect(getApiUrl("roleList")).toBe("/mfe-api/roleMgmt/roles/list");
  });
});
