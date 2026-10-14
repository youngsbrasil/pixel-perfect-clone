import { useMemo } from "react";
import { scopeUF, useApp } from "./store";

export function useScoped() {
  const s = useApp();
  return useMemo(() => {
    const uf = scopeUF(s);
    const profiles = uf ? s.profiles.filter((p) => p.uf_provavel === uf) : s.profiles;
    const alerts = uf ? s.alerts.filter((a) => a.seccional_uf === uf) : s.alerts;
    const user = s.users.find((u) => u.id === s.currentUserId)!;
    const canTriage = user.role !== "leitor";
    const canAdmin = user.role === "admin_nacional" || user.role === "admin_seccional";
    return { s, uf, profiles, alerts, user, canTriage, canAdmin };
  }, [s]);
}
