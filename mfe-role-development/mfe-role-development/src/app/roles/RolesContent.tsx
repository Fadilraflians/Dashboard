import React, { useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { useApiService } from "@/clientServices";
import type { RoleRow } from "@/services";
import { getMfeContext } from "@/lib/mfeContext";
import styles from "./roles.module.css";

/**
 * Status cell renderer for the role table. Declared at module scope (not inside
 * the component) so it is not re-created on every render and is not treated as
 * a nested component definition.
 */
function roleStatusBody(row: RoleRow) {
  return (
    <Tag
      value={row.isActive ? "Aktif" : "Nonaktif"}
      severity={row.isActive ? "success" : "danger"}
    />
  );
}

export default function RolesContent() {
  const {
    data: roles,
    loading,
    callApi: loadRoles,
  } = useApiService("roleList");

  const ctx = getMfeContext();

  // Fire-and-forget: errors are already handled inside useApiService (fallback
  // + state). We swallow here so the floating promise is explicitly voided.
  const load = () => {
    void loadRoles(
      { page: 1, pageSize: 10, search: "" },
      { showToast: false },
    ).catch(() => {
      /* handled in useApiService */
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = roles?.data ?? [];

  return (
    <div className={styles.container}>
      {ctx && (
        <div className={styles.contextBanner}>
          <i className="pi pi-user" />
          <span>
            Masuk sebagai <strong>{ctx.name}</strong> ({ctx.role}) — aplikasi{" "}
            <strong>{ctx.app}</strong>
          </span>
        </div>
      )}

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Roles</h1>
        <p className={styles.pageSubtitle}>
          Daftar role dari backend (BFF → shell gateway → API).
        </p>
      </div>

      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <Button
            icon="pi pi-refresh"
            label="Muat ulang"
            size="small"
            outlined
            loading={loading}
            onClick={load}
          />
        </div>
        <DataTable
          value={rows}
          loading={loading}
          paginator
          rows={10}
          emptyMessage="Tidak ada data role."
          size="small"
        >
          <Column field="code" header="Kode" sortable />
          <Column field="name" header="Nama" sortable />
          <Column field="description" header="Deskripsi" />
          <Column field="userType" header="Tipe" />
          <Column field="permissionCount" header="Permission" />
          <Column header="Status" body={roleStatusBody} />
        </DataTable>
      </div>
    </div>
  );
}
