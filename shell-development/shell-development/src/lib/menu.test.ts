import { getMenuBySlug, SHELL_MENUS } from "./menu";

describe("getMenuBySlug", () => {
  it("mengembalikan menu MFE yang cocok dengan slug", () => {
    const menu = getMenuBySlug("dashboard");
    expect(menu).toBeDefined();
    expect(menu?.appKey).toBe("dashboardBok");
    expect(menu?.kind).toBe("mfe");
  });

  it("mengembalikan menu role untuk slug 'role'", () => {
    expect(getMenuBySlug("role")?.appKey).toBe("roleMgmt");
  });

  it("mengembalikan undefined untuk slug yang tidak dikenal", () => {
    expect(getMenuBySlug("tidak-ada")).toBeUndefined();
  });

  it("hanya mengembalikan menu berjenis 'mfe'", () => {
    for (const menu of SHELL_MENUS) {
      if (menu.kind === "mfe") {
        expect(getMenuBySlug(menu.href.replace("/app/", ""))).toBe(menu);
      }
    }
  });
});
