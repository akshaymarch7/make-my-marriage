'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { Icon } from './icon';
import { themes, wedding, type Theme } from './home-data';

export function PlanningButton({ children = 'Start Planning', className = 'button button-primary', signIn = false }: { children?: React.ReactNode; className?: string; signIn?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button className={className} onClick={() => dialog.current?.showModal()}>{children}</button>
    <dialog ref={dialog} className="home-dialog" aria-label={signIn ? "Sign in availability" : "Start planning availability"} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <button className="dialog-close" aria-label="Close" onClick={() => dialog.current?.close()}><Icon name="close"/></button>
      <span className="icon-tile"><Icon name="heart" size={28}/></span><p className="eyebrow">Your wedding starts here</p>
      <h2>{signIn ? 'Your workspace is on its way.' : 'Something lovely is coming.'}</h2>
      <p>{signIn ? 'Sign in will be available when wedding accounts open.' : 'Wedding accounts aren’t open just yet. Explore what you’ll be able to plan, share and celebrate together.'}</p>
      <button className="button button-primary" onClick={() => { dialog.current?.close(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Explore the features <Icon name="arrow"/></button>
    </dialog></>;
}
export function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header" onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}><div className="header-inner">
    <a href="#top" aria-label="Make My Marriage home"><Image src="/images/make-my-marriage-logo.svg" alt="Make My Marriage — Wedding Workspace" width={240} height={60} className="brand-logo" priority/></a>
    <nav aria-label="Main navigation" className="desktop-nav"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#themes">Themes</a></nav>
    <div className="header-actions"><PlanningButton signIn className="text-button">Sign In</PlanningButton><PlanningButton/><button className="menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'}/></button></div>
    {open && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{[['Features','features'],['How it works','how-it-works'],['Themes','themes']].map(([label,id]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>)}<PlanningButton signIn className="text-button">Sign In</PlanningButton></nav>}
  </div></header>;
}
export function ThemeCards() {
  const [selected, setSelected] = useState<Theme>(themes[0]);
  const dialog = useRef<HTMLDialogElement>(null);
  return <><div className="theme-grid">{themes.map(theme => <article className={`theme-card theme-${theme.id}`} key={theme.id}>
    <div className="theme-swatch"><span>THE WEDDING COLLECTION</span><div className="theme-flourish">A <span>&</span> P</div><h3>{theme.label}</h3><p>{theme.subtitle}</p></div>
    <div className="theme-description"><h4>{theme.name}</h4><p>{theme.description}</p><button onClick={() => { setSelected(theme); dialog.current?.showModal(); }}>Preview theme <Icon name="arrow" size={16}/></button></div>
  </article>)}</div><dialog ref={dialog} className={`theme-dialog theme-${selected.id}`} aria-label={`${selected.name} wedding website preview`} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
    <button className="dialog-close" aria-label="Close theme preview" onClick={() => dialog.current?.close()}><Icon name="close"/></button>
    <div className="theme-preview"><p className="eyebrow">{selected.name} · Theme preview</p><Icon name="heart" size={32}/><p className="invitation-intro">Together with our families</p><h2>{wedding.couple}</h2><p>invite you to celebrate the beginning of forever.</p><div className="preview-rule"/><p>{wedding.date}</p><p>{wedding.location}</p><span className="preview-welcome">We can’t wait to celebrate with you.</span></div>
  </dialog></>;
}
