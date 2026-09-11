"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notifySessionChange } from "@/components/auth/session-events";
import styles from "./members.module.css";

export function MemberActions({ member, userId, lastAdmin, onSaved }: {
  member: { membershipId: string; role: "ADMIN" | "MANAGER"; user: { id: string; name: string; email: string } };
  userId: string; lastAdmin: boolean; onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<"role" | "remove">("role");
  const [role, setRole] = useState(member.role);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const self = member.user.id === userId;
  function open(next: "role" | "remove") {
    setAction(next); setRole(member.role); setError(""); dialog.current?.showModal();
  }
  const titleId = `member-action-${member.membershipId}`;
  return <div className={styles.memberActions}>
    <button className={styles.smallButton} disabled={lastAdmin} title={lastAdmin ? "Make another member an Admin first." : undefined} onClick={() => open("role")}>Change role<span className={styles.srOnly}> for {member.user.name}</span></button>
    <button className={styles.smallButton} disabled={lastAdmin} title={lastAdmin ? "Make another member an Admin first." : undefined} onClick={() => open("remove")}>{self ? "Leave wedding" : "Remove member"}<span className={styles.srOnly}> {member.user.name}</span></button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { if (pending) event.preventDefault(); }}>
      <h2 id={titleId}>{action === "role" ? "Change wedding role" : self ? "Leave this wedding?" : "Remove wedding member?"}</h2>
      <p>{member.user.name}</p><p className={styles.email}>{member.user.email}</p>
      {action === "role" ? <div className={styles.form}><label htmlFor={`${titleId}-role`}>Wedding role</label><select id={`${titleId}-role`} value={role} disabled={pending} onChange={event => setRole(event.target.value as "ADMIN" | "MANAGER")}><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></select><p className={styles.hint}>{role === "ADMIN" ? "Admins can invite people, change roles, and remove members." : "Managers help plan the wedding but cannot manage members or invitations."}</p>{self && role === "MANAGER" && <p className={styles.error}>You’ll no longer be able to manage wedding members and invitations.</p>}</div> : <p className={styles.muted}>{self ? "You’ll lose access to this wedding. An Admin will need to invite you again to rejoin." : "This person will immediately lose access to the wedding. Their account will remain, and you can invite them again later."}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><button className={styles.secondary} autoFocus disabled={pending} onClick={() => dialog.current?.close()}>Cancel</button><button className={styles.primary} disabled={pending || (action === "role" && role === member.role)} onClick={async () => {
        if (pending) return; setPending(true); setError("");
        try {
          const response = await fetch(`/api/members/${member.membershipId}`, action === "role" ? { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) } : { method: "DELETE" });
          if (!response.ok) { const result = await response.json(); setError(result.error?.message ?? "We couldn’t update this member. Please try again."); return; }
          dialog.current?.close(); notifySessionChange();
          if (self) { router.replace(action === "remove" ? "/onboarding" : "/dashboard"); router.refresh(); }
          else onSaved(action === "role" ? `${member.user.name} is now ${role === "ADMIN" ? "an Admin" : "a Manager"}.` : `${member.user.name} was removed from the wedding.`);
        } catch { setError("We couldn’t connect. Please try again."); }
        finally { setPending(false); }
      }}>{pending ? "Saving…" : action === "role" ? "Save role" : self ? "Leave wedding" : "Remove member"}</button></div>
    </dialog>
  </div>;
}
