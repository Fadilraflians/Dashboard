// Domain: roles — client-side service definitions (types + url).
// Real API (no mock) — resolves to the backend via BFF -> shell gateway.

export interface RoleListRequest {
  page: number;
  pageSize: number;
  search: string;
}

export interface RoleRow {
  id: number;
  code: string;
  name: string;
  description: string;
  userType: string;
  isActive: boolean;
  permissionCount: number;
  createdAt: string;
}

export interface RoleListResponse {
  success: boolean;
  code?: string;
  message?: string;
  data: RoleRow[];
  meta?: {
    total: number;
    page: number;
    pageSize: number;
  } | null;
}

export interface RolesServiceMapping {
  roleList: { body: RoleListRequest; response: RoleListResponse };
}

export const rolesUrls: Record<keyof RolesServiceMapping, string> = {
  roleList: "/api/roles/list",
};

// No mock — this domain always hits the real backend.
export const rolesMocks = {} as const;
