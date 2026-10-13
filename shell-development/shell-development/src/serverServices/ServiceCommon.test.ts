import { generateServerUrl, getBaseUrl } from "./ServiceCommon";

describe("getBaseUrl", () => {
  const original = process.env.API_BASE_URL;
  afterEach(() => {
    process.env.API_BASE_URL = original;
  });

  it("membaca API_BASE_URL dan menghapus trailing slash", () => {
    process.env.API_BASE_URL = "http://gateway.example.com/";
    expect(getBaseUrl()).toBe("http://gateway.example.com");
  });

  it("melempar error jika API_BASE_URL tidak di-set", () => {
    delete process.env.API_BASE_URL;
    expect(() => getBaseUrl()).toThrow("API_BASE_URL is not set");
  });
});

describe("generateServerUrl", () => {
  const original = process.env.API_BASE_URL;
  beforeEach(() => {
    process.env.API_BASE_URL = "http://gateway.example.com";
  });
  afterEach(() => {
    process.env.API_BASE_URL = original;
  });

  it("menggabungkan base URL dengan endpoint service", () => {
    const { url, method } = generateServerUrl("login");
    expect(url).toBe("http://gateway.example.com/api/auth/login");
    expect(method).toBe("POST");
  });

  it("melempar error untuk service key yang tidak valid", () => {
    // @ts-expect-error — sengaja key tak dikenal untuk menguji guard.
    expect(() => generateServerUrl("ngaco")).toThrow("Invalid service key");
  });
});
