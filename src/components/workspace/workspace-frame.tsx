"use client";
import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/home/icon";
import { LogoutButton } from "@/components/auth/auth-form";
import { navigationGroups, plannedFeatures, type PlannedFeature } from "./navigation";
import { FeaturePreviewContext } from "./feature-preview";
import styles from "./workspace.module.css";

export function WorkspaceFrame({ children, user, role }: { children: ReactNode; user: { name: string }; role?: string }) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const [feature, setFeature] = useState<PlannedFeature>("events");
  const featureInfo = plannedFeatures[feature];
  const section = pathname.startsWith("/guests") ? "Guests" : pathname.startsWith("/tasks") ? "Tasks" : pathname.startsWith("/events") ? "Events" : pathname === "/wedding/edit" ? "Wedding details" : pathname === "/settings/members" ? "Wedding members" : "Dashboard";
  function openFeature(next: PlannedFeature) {
    drawer.current?.close(); setFeature(next); panel.current?.showModal();
  }
  const navigation = <>
    <Link href="/" className={styles.logo} aria-label="Make My Marriage home"><Image src="/images/make-my-marriage-logo.svg" alt="Make My Marriage" width={190} height={48} priority/></Link>
    <nav aria-label="Wedding workspace">
      <Link href="/dashboard" className={styles.navItem} aria-current={pathname === "/dashboard" ? "page" : undefined} onClick={() => drawer.current?.close()}><Icon name="dashboard" size={17}/><span>Dashboard</span></Link>
      {navigationGroups.map(group => <div className={styles.navGroup} key={group.label}><p>{group.label}</p>{group.features.map(key => key === "invitations" ? <Link key={key} href="/dashboard#rsvp-summary" className={styles.navItem} onClick={() => drawer.current?.close()}><Icon name="mail" size={17}/><span>Invitations &amp; RSVP</span></Link> : (key === "events" || key === "tasks" || key === "guests") ? <Link key={key} href={`/${key}`} className={styles.navItem} aria-current={pathname.startsWith(`/${key}`) ? "page" : undefined} onClick={() => drawer.current?.close()}><Icon name={plannedFeatures[key].icon} size={17}/><span>{plannedFeatures[key].label}</span></Link> : <button type="button" className={styles.navItem} key={key} onClick={() => openFeature(key)}><Icon name={plannedFeatures[key].icon} size={17}/><span>{plannedFeatures[key].label}</span><small>Soon</small></button>)}</div>)}
      <div className={styles.navGroup}><p>Settings</p>
        {/* Keep document entry into editing so browser Back invokes its unload guard. */}
        <a href="/wedding/edit" className={styles.navItem} aria-current={pathname === "/wedding/edit" ? "page" : undefined} onClick={() => drawer.current?.close()}><Icon name="settings" size={17}/><span>Wedding Details</span></a>
        {role === "ADMIN" && <Link href="/settings/members" className={styles.navItem} aria-current={pathname === "/settings/members" ? "page" : undefined} onClick={() => drawer.current?.close()}><Icon name="users" size={17}/><span>Wedding Members</span></Link>}
      </div>
    </nav>
    <div className={styles.sidebarFoot}><Icon name="heart" size={15}/><span>A little less planning.<br/>A lot more celebrating.</span></div>
  </>;
  return <FeaturePreviewContext.Provider value={openFeature}><div className={styles.workspace}>
    <a href="#wedding-content" className={styles.skip}>Skip to content</a>
    <aside className={styles.sidebar}>{navigation}</aside>
    <div className={styles.workspaceBody}>
      <header className={styles.topbar}><div className={styles.breadcrumb}><button className={styles.menu} aria-label="Open workspace navigation" onClick={() => drawer.current?.showModal()}><Icon name="menu"/></button><span>Workspace <span aria-hidden="true">/</span> <strong>{section}</strong></span></div><div className={styles.account}><span className={styles.userName}>{user.name}</span><span className={styles.role}>{role === "ADMIN" ? "Admin" : "Manager"}</span><LogoutButton className={styles.signOut}/></div></header>
      <div className={styles.content}>{children}</div><footer className={styles.footer}>Make My Marriage <span>A shared space for your celebration.</span></footer>
    </div>
    <dialog ref={drawer} className={styles.drawer} aria-label="Workspace navigation"><button className={styles.close} aria-label="Close workspace navigation" onClick={() => drawer.current?.close()}><Icon name="close"/></button>{navigation}</dialog>
    <dialog ref={panel} className={styles.featurePanel} aria-labelledby="feature-title"><button className={styles.close} aria-label="Close feature preview" autoFocus onClick={() => panel.current?.close()}><Icon name="close"/></button><div className={styles.featureIcon}><Icon name={featureInfo.icon} size={28}/></div><p className={styles.eyebrow}>Planned for V1</p><h2 id="feature-title">{featureInfo.label}</h2><span className={styles.comingSoon}>Coming soon</span><p>{featureInfo.description}</p><p className={styles.muted}>This feature isn’t available yet. Dashboard previews use sample data; nothing is created or sent from this panel.</p><button className={styles.primary} onClick={() => panel.current?.close()}>Back to workspace</button></dialog>
  </div></FeaturePreviewContext.Provider>;
}
