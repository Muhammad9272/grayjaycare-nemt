import Image from "next/image";
import Link from "next/link";
import { Marcellus, Source_Sans_3 } from "next/font/google";
import styles from "./landing.module.css";

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-landing-display",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-landing-body",
});

const PARTNERS = [
  { src: "/site/partner-sienna.png", alt: "Sienna Senior Living" },
  { src: "/site/partner-bluewater-health.png", alt: "Bluewater Health" },
  { src: "/site/partner-windsor-regional.png", alt: "Windsor Regional Hospital" },
  { src: "/site/partner-lhsc.png", alt: "London Health Sciences Centre" },
  { src: "/site/partner-cambridge-memorial.png", alt: "Cambridge Memorial Hospital" },
  { src: null, alt: "Meadow Park Long-Term Care" },
];

const FEATURES = [
  {
    icon: "shield" as const,
    title: "Safe & Reliable",
    body: "Your safety is our top priority. We provide secure and dependable transportation services, giving you peace of mind on every journey. Our team is available 24/7 to meet your transportation needs.",
  },
  {
    icon: "chair" as const,
    title: "QUICK BOOKING",
    body: "Our user-friendly booking system makes scheduling your transport simple and convenient. With just a few clicks, you can enjoy a seamless experience from start to finish.",
  },
  {
    icon: "timer" as const,
    title: "PROMPT PICKUPS",
    body: "Rely on Gray Jay Care for timely pickups. Our dedicated team ensures quick response times, getting you to your destination efficiently and without unnecessary delays.",
  },
];

const SERVICES = [
  {
    image: "/site/service-stretcher.jpg",
    title: "Stretcher Transport:",
    body: "Safe, professional transport for patients who need to remain lying down, managed by trained staff using specialized stretcher-equipped vehicles.",
  },
  {
    image: "/site/service-attendant.jpg",
    title: "Wheelchair Transport:",
    body: "Comfortable, secure transportation for wheelchair users with door-to-door assistance, ideal for appointments, hospital discharges, and community outings.",
  },
  {
    image: "/site/service-wheelchair.jpg",
    title: "Driver Attendant Support:",
    body: "Compassionate attendants assist with mobility, boarding, and personal care throughout the journey, ensuring dignity and comfort every step of the way.",
  },
];

const FAQS = [
  {
    q: "What is Non-Emergency Medical Transportation (NEMT)?",
    a: "Non-Emergency Medical Transportation (NEMT) provides transportation for patients who need to get to medical appointments but do not have an emergency medical condition. This service helps individuals reach hospitals, doctor’s offices, dialysis centers, and other healthcare facilities safely and on time.",
  },
  {
    q: "How do I book a ride for NEMT services?",
    a: "Call our team or use the online booking form with your appointment time, pickup location, destination, and any mobility requirements.",
  },
  {
    q: "What types of vehicles are used for NEMT?",
    a: "Our purpose-equipped fleet includes wheelchair-accessible and stretcher vehicles chosen to suit each passenger’s mobility and care needs.",
  },
  {
    q: "Are the drivers trained to handle medical transportation?",
    a: "Yes. Our professional attendants are trained to assist passengers safely, respectfully, and comfortably throughout their journey.",
  },
  {
    q: "How can I cancel or reschedule my ride?",
    a: "Please call us as soon as possible at (519) 933-5090 and our team will help update your booking.",
  },
];

const TESTIMONIALS = [
  {
    name: "David Downs",
    quote: "Excellent service.",
  },
  {
    name: "Amy Osborn",
    quote:
      "My 84 year old father just recently became unable to walk. We had an appointment at University hospital and Gray Jay Care made the trip professional, caring, and reassuring.",
  },
  {
    name: "John Cooke",
    quote:
      "I was unable to take my wife to her appointment and Gray Jay Care stepped up at the last minute to help. My wife was very impressed.",
  },
  {
    name: "AM",
    quote:
      "Best Medical Transport Service! They were on time, careful, and reasonably priced. We felt supported every step of the way.",
  },
];

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#about-us", label: "About US" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact Us" },
];

export default function Home() {
  return (
    <div className={`${styles.page} ${marcellus.variable} ${sourceSans.variable}`}>
      <LandingHeader />

      <main>
        <section id="home" className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div>
                <h1>Safe Journeys,<br />Caring Hands</h1>
                <p className={styles.heroLead}>
                  Safe, Professional, and Compassionate Transport for Non-Emergency Patients Across Southwestern
                  Ontario.
                </p>
                <div className={styles.heroActions}>
                  <Link className={styles.primaryButton} href="/book">
                    Book now
                  </Link>
                  <Link className={styles.secondaryButton} href="#about-us">
                    Learn more
                  </Link>
                </div>
                <div className={styles.canadianLine}>
                  <span className={styles.flag} aria-hidden="true" />
                  <span>Proudly Canadian Since 2024</span>
                </div>
              </div>
            </div>

            <div className={styles.heroArt} aria-hidden="true">
              <div className={styles.medicalCross}><span /></div>
              <LeafSprig className={styles.heroLeaves} />
              <div className={styles.heroPurplePetal} />
              <div className={styles.heroFlourish}>♥<span>♥</span><i>♥</i></div>
              <Image
                src="/site/hero-staff-wheelchair.png"
                alt=""
                width={769}
                height={1345}
                priority
                className={styles.heroPeople}
              />
            </div>

            <div className={styles.heroProof}>
              <div className={styles.trustRow}>
                <span className={styles.trustAvatar} aria-hidden="true" />
                <span className={styles.quoteMark} aria-hidden="true">“</span>
                <p>Your Trusted Partner in<br />Patient Transport</p>
              </div>
              <p className={styles.customerCount}>5000+</p>
              <p className={styles.proofLabel}>Satisfied customers</p>
              <a className={styles.phoneNumber} href="tel:+15199335090">(519) 933-5090</a>
              <p className={styles.proofLabel}>Call us:</p>
            </div>
          </div>
        </section>

        <section className={styles.partners} aria-label="Healthcare partners">
          <div className={styles.partnerTrack}>
            {PARTNERS.map((partner) => (
              <div className={styles.partnerLogo} key={partner.alt}>
                {partner.src ? (
                  <Image src={partner.src} alt={partner.alt} width={180} height={90} />
                ) : (
                  <span className={styles.meadowLogo} aria-label={partner.alt}>
                    <b>Meadow Park</b>
                    <small>Long-Term Care</small>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="about-us" className={styles.about}>
          <div className={styles.aboutInner}>
            <div className={styles.aboutArt}>
              <LeafOutline className={styles.aboutLeaves} />
              <span className={styles.aboutBlob} aria-hidden="true" />
              <span className={styles.aboutPill} aria-hidden="true" />
              <Image
                src="/site/about-phone-mockup.png"
                alt="Gray Jay Care mobile booking experience"
                width={514}
                height={600}
                className={styles.phoneMockup}
              />
            </div>

            <div className={styles.aboutCopy}>
              <p className={`${styles.eyebrow} ${styles.orangeEyebrow}`}>About us</p>
              <h2>Comfort and Care on the Move</h2>
              <p className={styles.aboutLead}>
                At Gray Jay Care, we are dedicated to providing safe and reliable non-emergency medical
                transportation, ensuring that our clients reach their destinations comfortably and on time.
              </p>
              <div className={styles.features}>
                {FEATURES.map((feature) => (
                  <article className={styles.feature} key={feature.title}>
                    <FeatureIcon type={feature.icon} />
                    <div>
                      <h3>{feature.title}</h3>
                      <p>{feature.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.videoSection} aria-label="Gray Jay Care introduction video">
          <div className={styles.videoShade} />
          <a
            className={styles.videoCard}
            href="https://fast.wistia.net/embed/iframe/a8903q2mzp"
            target="_blank"
            rel="noreferrer"
            aria-label="Watch the Gray Jay Care introduction video"
          >
            <span className={styles.playButton} aria-hidden="true"><i /></span>
            <span className={styles.videoControls} aria-hidden="true">
              <b>▶</b><strong>1:05</strong><i /><em>•••</em>
            </span>
          </a>
        </section>

        <section className={styles.services}>
          <div className={styles.servicesIntro}>
            <p className={styles.servicesEyebrow}>Services We Offer</p>
            <h2>
              We provide 24/7 stretcher service for specialized care, wheelchair service for safe and comfortable
              transfers, and driver attendants for personalized support throughout your journey.
            </h2>
          </div>
          <div className={styles.serviceGrid}>
            {SERVICES.map((service, index) => (
              <article className={`${styles.serviceCard} ${styles[`serviceCard${index + 1}`]}`} key={service.title}>
                <div className={styles.serviceImage}>
                  <Image src={service.image} alt={service.title} fill sizes="(max-width: 767px) 80vw, 400px" />
                </div>
                <h3>{service.title}</h3>
                <p>{service.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className={styles.faq}>
          <div className={styles.faqIntro}>
            <p className={styles.eyebrow}>FAQ’s</p>
            <h2>Find answers here</h2>
            <p>Here Are Some Frequently Asked Questions From Our Customers.</p>
          </div>
          <div className={styles.faqBox}>
            {FAQS.map((faq, index) => (
              <details className={styles.faqItem} key={faq.q} open={index === 0}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.testimonials}>
          <h2>Hear From Our Happy Clients</h2>
          <div className={styles.reviewGrid}>
            {TESTIMONIALS.map((review) => (
              <article className={styles.reviewCard} key={review.name}>
                <div className={styles.reviewHeader}>
                  <span className={styles.reviewAvatar}>{review.name.charAt(0)}</span>
                  <span>
                    <strong>{review.name}</strong>
                    <small>12 months ago</small>
                  </span>
                  <b aria-label="Google review">G</b>
                </div>
                <div className={styles.stars} aria-label="5 out of 5 stars">★★★★★</div>
                <p>{review.quote}</p>
                <small>Read more</small>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className={styles.contact}>
          <div className={styles.contactIntro}>
            <p className={styles.eyebrow}>Find us</p>
            <h2>
              Whether you have questions about our services or need assistance, our team is always here to help.
              Please contact us using the details provided below.
            </h2>
          </div>
          <div className={styles.contactGrid}>
            <div className={styles.contactInformation}>
              <h3>Contact information</h3>
              <div className={styles.contactLinks}>
                <ContactLink href="tel:+15199335090" icon="phone" label="(519) 933-5090" />
                <ContactLink href="mailto:support@grayjaycare.com" icon="message" label="support@GrayJayCare.com" />
                <ContactLink href="https://www.instagram.com/grayjaycare/" icon="instagram" label="Follow us" external />
                <ContactLink href="https://www.facebook.com/grayjaycare" icon="facebook" label="Get last updates" external />
              </div>
            </div>
            <div className={styles.mapWrap}>
              <iframe
                title="Gray Jay Care service area in London, Ontario"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-81.3900%2C42.8900%2C-80.9900%2C43.0900&layer=mapnik&marker=42.9849%2C-81.2453"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        Copyright ©{new Date().getFullYear()} Gray Jay Care. All rights reserved.
      </footer>
    </div>
  );
}

function LandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="#home" className={styles.brand} aria-label="Gray Jay Care home">
          <Image src="/site/logo-wordmark.png" alt="Gray Jay Care" width={1648} height={445} priority />
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {NAV_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          <Link className={styles.headerButton} href="/book">Book Now</Link>
        </nav>
        <details className={styles.mobileMenu}>
          <summary aria-label="Open navigation menu"><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
            <Link href="/book">Book Now</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function FeatureIcon({ type }: { type: "shield" | "chair" | "timer" }) {
  return (
    <span className={styles.featureIcon} aria-hidden="true">
      {type === "shield" && (
        <svg viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z" /><path d="m9 12 2 2 4-5" /></svg>
      )}
      {type === "chair" && (
        <svg viewBox="0 0 24 24"><circle cx="10" cy="5" r="2" /><path d="M10 8v6h5l3 5M10 11H7l-2 4a5 5 0 1 0 9 3" /></svg>
      )}
      {type === "timer" && (
        <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" /><path d="M12 13V8M9 2h6M12 2v3" /></svg>
      )}
    </span>
  );
}

function LeafSprig({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 220 300" fill="none" aria-hidden="true">
      <path d="M35 284c59-60 100-132 139-254" />
      <path d="M146 91c-3-34 12-57 42-74 0 34-13 59-42 74ZM119 142c-28-19-37-45-27-77 26 17 36 43 27 77ZM89 194c-31-12-45-35-43-68 31 11 46 34 43 68ZM150 116c30-17 58-15 83 7-29 17-57 15-83-7ZM124 167c33-11 59-4 80 22-32 11-59 3-80-22ZM94 217c34-3 58 11 72 40-34 3-58-10-72-40Z" />
    </svg>
  );
}

function LeafOutline({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 320 330" fill="none" aria-hidden="true">
      <path d="M167 315c-1-107-18-189-79-283" />
      <path d="M105 79C65 63 35 74 14 109c40 17 71 7 91-30ZM126 126c-42-4-69 16-80 56 42 5 70-14 80-56ZM148 184c-38 12-59 38-59 78 38-11 59-37 59-78ZM91 66c12-39 39-59 80-60-11 39-38 60-80 60ZM122 113c24-34 56-46 96-35-23 34-55 46-96 35ZM148 166c32-27 65-30 101-10-31 27-65 31-101 10Z" />
    </svg>
  );
}

function ContactLink({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: "phone" | "message" | "instagram" | "facebook";
  label: string;
  external?: boolean;
}) {
  return (
    <a href={href} className={styles.contactLink} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      <span aria-hidden="true"><ContactIcon type={icon} /></span>
      <strong>{label}</strong>
    </a>
  );
}

function ContactIcon({ type }: { type: "phone" | "message" | "instagram" | "facebook" }) {
  if (type === "facebook") return <svg viewBox="0 0 24 24"><path fill="currentColor" d="M14 8h3V4h-3c-3 0-5 2-5 5v2H6v4h3v7h4v-7h3l1-4h-4V9c0-.7.3-1 1-1Z" /></svg>;
  if (type === "instagram") return <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>;
  if (type === "message") return <svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5Z" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="M7 3 4 5c0 8 7 15 15 15l2-3-5-3-2 2c-3-1-5-3-6-6l2-2-3-5Z" /></svg>;
}
