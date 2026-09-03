import Image from "next/image";
import PublicHeader from "./PublicHeader";
import Footer from "./Footer";
import styles from "./AuthShell.module.css";

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <>
      <PublicHeader />
      <main className={styles.page}>
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <div className={`${styles.shell} ${compact ? styles.compact : ""}`}>
          <aside className={styles.storyPanel}>
            <div className={styles.storyCopy}>
              <p>Trusted medical transport</p>
              <h2>Every journey handled with care.</h2>
              <ul>
                <li><Check /> Available around the clock</li>
                <li><Check /> Trained, compassionate attendants</li>
                <li><Check /> Wheelchair and stretcher ready</li>
              </ul>
            </div>
            <Image
              src="/site/hero-staff-wheelchair.png"
              alt="Gray Jay Care attendant supporting a passenger"
              width={769}
              height={1345}
              className={styles.careImage}
            />
            <div className={styles.callCard}>
              <span>Need help?</span>
              <a href="tel:+15199335090">(519) 933-5090</a>
            </div>
          </aside>

          <section className={styles.formPanel}>
            <div className={styles.formInner}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1>{title}</h1>
              <p className={styles.description}>{description}</p>
              {children}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Check() {
  return (
    <span aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
