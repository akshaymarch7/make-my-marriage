import type { getWeddingContext } from "@/modules/weddings/service";
import { daysUntilWedding, weddingDateLabel } from "@/modules/weddings/dates";
import { WeddingCountdown } from "./countdown";
import { WeddingArch } from "./arch";
import { timeZoneLabel } from "./time-zones";
import { Icon } from "@/components/home/icon";
import styles from "./wedding.module.css";

type Wedding = NonNullable<Awaited<ReturnType<typeof getWeddingContext>>["wedding"]>;
export function OverviewPage({ wedding }: { wedding: Wedding }) {
  const location = wedding.location.formattedAddress || [wedding.location.city, wedding.location.state, wedding.location.country].filter(Boolean).join(", ");
  return <main id="wedding-content" className={styles.overview}>
    <div className={styles.overviewInner}>
      <p className={styles.ready}><span aria-hidden="true">✓</span> Your wedding is ready</p>
      <div className={styles.smallArch}><WeddingArch compact/></div>
      {wedding.title && <p className={styles.weddingTitle}>{wedding.title}</p>}
      <h1>{wedding.brideName} <span>&amp;</span> {wedding.groomName}</h1>
      <div className={styles.dateRow}><span className={styles.dateBadge}><Icon name="calendar" size={17}/><time dateTime={wedding.weddingDate}>{weddingDateLabel(wedding.weddingDate)}</time></span><span className={styles.dot} aria-hidden="true">•</span><span className={styles.countdown}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><WeddingCountdown date={wedding.weddingDate} timeZone={wedding.timeZone} initialDays={daysUntilWedding(wedding.weddingDate, wedding.timeZone)}/></span></div>
      <section className={styles.details} aria-label="Your wedding details">
        <dl className={styles.detailsGrid}>
          <div className={styles.detail}><span className={styles.detailIcon}><Icon name="location" size={18}/></span><div><dt>Wedding city / location</dt><dd>{location}</dd></div></div>
          <div className={styles.detail}><span className={styles.detailIcon}><Icon name="globe" size={18}/></span><div><dt>Time zone</dt><dd>{timeZoneLabel(wedding.timeZone)}</dd></div></div>
        </dl>
        {wedding.description && <div className={styles.description}><h2>Description</h2><p>{wedding.description}</p></div>}
      </section>
      <p className={styles.endNote}>A quiet, dedicated atelier crafted for your celebration.</p>
    </div>
  </main>;
}
