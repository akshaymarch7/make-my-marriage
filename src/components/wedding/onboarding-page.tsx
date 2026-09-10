import { OnboardingForm } from "./onboarding-form";
import { WeddingArch } from "./arch";
import styles from "./wedding.module.css";

export function OnboardingPage() {
  return <main id="wedding-content" className={styles.onboarding}>
    <section className={styles.formCard} aria-labelledby="setup-title">
      <p className={styles.eyebrow}>Wedding setup</p><h1 id="setup-title">Let’s bring your wedding to life</h1>
      <p className={styles.intro}>Fill in the essential details to establish your dedicated planning workspace.</p>
      <OnboardingForm/>
    </section>
    <aside className={styles.aside}>
      <div className={styles.illustrationCard}><div className={styles.largeArch}><WeddingArch/></div><p className={styles.eyebrow}>Dedicated workspace</p><h2>A quiet, organized beginning</h2><p>Bring your names, your date, and the place you’ll celebrate together into one home for your wedding.</p><div className={styles.cardFoot}><span>Made for your celebration</span><span>Your first step</span></div></div>
      <div className={styles.adminNote}><span aria-hidden="true">♧</span><div><h3>Your wedding, your beginning</h3><p>You’ll become the first Admin of this wedding when you create it.</p></div></div>
    </aside>
  </main>;
}
