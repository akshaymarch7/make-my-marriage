import type { getWeddingContext } from "@/modules/weddings/service";
import { WeddingDetailsForm } from "./wedding-details-form";
import { WeddingArch } from "./arch";
import styles from "./wedding.module.css";

type Wedding = NonNullable<Awaited<ReturnType<typeof getWeddingContext>>["wedding"]>;
export function EditWeddingPage({ wedding }: { wedding: Wedding }) {
  const location = wedding.location.formattedAddress || [wedding.location.city, wedding.location.state, wedding.location.country].filter(Boolean).join(", ");
  return <main id="wedding-content" className={styles.editPage}>
    <a href="/dashboard" className={styles.backLink}>← Back to your wedding</a>
    <h1>Edit your wedding</h1><p className={styles.intro}>Update the details that make your celebration yours.</p>
    <div className={styles.editGrid}>
      <section className={styles.formCard} aria-label="Wedding details"><WeddingDetailsForm initialValues={{ brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate, title: wedding.title, description: wedding.description, timeZone: wedding.timeZone, location }}/></section>
      <aside className={styles.aside}><div className={styles.illustrationCard}><div className={styles.largeArch}><WeddingArch/></div><p className={styles.eyebrow}>Dedicated atelier</p><h2>{wedding.brideName} &amp; {wedding.groomName}</h2><p>Changes made here update your wedding overview and the details of your celebration.</p><div className={styles.cardFoot}><span>Wedding location</span><span>{location}</span></div></div><div className={styles.adminNote}><span aria-hidden="true">♧</span><div><h3>Your shared wedding details</h3><p>Admins and Managers can keep these details up to date.</p></div></div></aside>
    </div>
  </main>;
}
