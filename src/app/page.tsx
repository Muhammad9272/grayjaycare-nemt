import Image from "next/image";
import Link from "next/link";
import { Marcellus, Source_Sans_3 } from "next/font/google";
import styles from "./landing.module.css";
import TidioChat from "@/components/TidioChat";
import FloatingCallButton from "@/components/FloatingCallButton";
import ReviewCarousel from "@/components/ReviewCarousel";

const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-landing-display",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-landing-body",
});

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
    q: "What types of transportation do you provide?",
    a: "We provide non-emergency wheelchair, stretcher, ambulatory, and assisted patient transportation for medical appointments, hospital discharges, transfers, long-term care visits, and other approved travel needs.",
  },
  {
    q: "What areas do you serve?",
    a: "We serve Southwestern Ontario and beyond, including trips to Toronto and Hamilton. Transportation outside Ontario or Canada may also be arranged in advance—please contact our team to discuss your route.",
  },
  {
    q: "How do I book transportation?",
    a: "Submit the secure online booking form or call us at (519) 933-5090. Please have the passenger, pickup, destination, timing, and mobility details ready so our dispatcher can confirm the ride.",
  },
  {
    q: "How can I cancel or reschedule my ride?",
    a: "Please provide at least 24 hours’ notice whenever possible. Cancellations with less notice or a no-show may be subject to a $150 fee. We understand circumstances can change and review each situation case by case.",
  },
  {
    q: "Can pickup or arrival times be delayed?",
    a: "We do our best to stay on schedule. However, traffic, weather, road conditions, facility delays, or unforeseen circumstances may occasionally affect pickup or arrival times. If a delay occurs, we will keep you informed and provide an update as soon as possible.",
  },
];

const TESTIMONIALS = [
  {
    name: "David Downs",
    quote: "Excellent service.",
    avatarUrl: "https://lh3.googleusercontent.com/a/ACg8ocIcVugdjikWxNLyy3khYYG9pzxOWIAxTXOTH-u3sNUmpJyXXA=w80-h80-c-rp-mo-br100",
  },
  {
    name: "Amy Osborn",
    quote: "My 84 year old father just recently became unable to walk. We had an appointment at University hospital in neurology and I had no idea how I was going to get him there. Stairs out of their house were a real concern for us too. I contacted a few places but Gray Jay stood out to me because of the professionalism and thoroughness. I am a very anxious person but he made me feel at ease. I was really impressed with the whole process and so was my father. So nice, caring and reassuring. Even when we encountered a change in the length of our appointment we were accomodated. Sometimes I am leery of all five star reviews but in this case they are definitely real. We will be using Gray Jay for as long as their services are required. I definitely recommend!",
    avatarUrl: "https://lh3.googleusercontent.com/a-/ALV-UjVmlaSdBizxfZAxI_5iVuDqzt7-ILN7tNjQbASSRAM2_U991S6pag=w80-h80-c-rp-mo-ba4-br100",
  },
  {
    name: "John Cooke",
    quote: "I was unable to take my wife to her appointment and Gray Jay Care stepped up at the last minute to help. My wife was very impressed and thankful for their excellent service and care.",
    avatarUrl: "https://lh3.googleusercontent.com/a/ACg8ocKwjxZaZX4p5UhEBzTqni-RF-OinYU_Du-h4xThNU4r_QJ_Ow=w80-h80-c-rp-mo-br100",
  },
  {
    name: "AM",
    quote: "Best Medical Transport Service!!! I used Gray Jay Care to transport my wife from University Hospital to the home on Stretcher, They were on time and price is reasonable compare to other companies in area. It was incredible to see that they use a Stair chair to take her upstairs. Highly recommended to anyone looking for best transport for their loved ones.",
    avatarUrl: "https://lh3.googleusercontent.com/a/ACg8ocIRypMDhQ4E-9OFU_YExKSywhbKkHSVU_LletddgM-dowTV1A=w80-h80-c-rp-mo-br100",
  },
  {
    name: "Ronald Patterson",
    quote: "I had a wonderful experience with GrayJayCare! They were incredibly helpful every step of the way, and the entire process was smooth and stress-free. The worker who assisted my family member was so kind, patient, and understanding, which made everything much easier. I really appreciate their professionalism and genuine care. Highly recommend GrayJayCare to anyone looking for quality support and excellent service!",
    avatarUrl: "https://lh3.googleusercontent.com/a/ACg8ocIGpGRoZS8zafw87a7JRK8gXegEewXJlFh4hBIpnxuif_IjVg=w80-h80-c-rp-mo-br100",
  },
  {
    name: "Faizan Ahmad",
    quote: "Great guys! Exceptional service, always my first choice for patient transport.",
    avatarUrl: "https://lh3.googleusercontent.com/a/ACg8ocLW5yOomUOKJNlB6DE01Nea00uSgz7jaD0Rl90nrE6qRtPe=w80-h80-c-rp-mo-br100",
  },
  {
    name: "M. Asad Nabeel",
    quote: "Great service! They transported my grandfather from Victoria Hospital, London to home with care and respect. Highly recommend.",
  },
  {
    name: "Lorraine McKell",
    quote: "Once again, this service is the best way to go. Friendly, caring. I would not have a problem recommend Gray Jay Care to anyone who has to transfer a loved one. Thanks again for looking after my mom ♥️",
  },
  {
    name: "Angelo Marcoccia",
    quote: "Gray Jay Care has provided amazing service to our family member over the past few weeks! The drivers are very polite, respectful and have great empathy for their patients which is a rarity these days!!! Thank you AM and Family",
  },
  {
    name: "Susan Smyth",
    quote: "Very reasonable rates. Clean and modern vehicle. Polite, kind and sympathetic driver. Helped my mom relax during a stressful 2 hour drive. Outstanding service all around. Highly recommend!!!",
  },
];

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#about-us", label: "About US" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact Us" },
  { href: "/careers", label: "Careers" },
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
              <p className={styles.customerCount}>10000+</p>
              <p className={styles.proofLabel}>Satisfied customers</p>
              <a className={styles.phoneNumber} href="tel:+15199335090">(519) 933-5090</a>
              <p className={styles.proofLabel}>Call us:</p>
            </div>
          </div>
        </section>

        <section id="about-us" className={styles.about}>
          <div className={styles.aboutInner}>
            <div className={styles.aboutArt}>
              <LeafOutline className={styles.aboutLeaves} />
              <span className={styles.aboutBlob} aria-hidden="true" />
              <span className={styles.aboutPill} aria-hidden="true" />
              <div className={styles.phoneMockup} aria-label="Preview of the Gray Jay Care online booking experience">
                <div className={styles.phoneSpeaker} aria-hidden="true" />
                <div className={styles.phoneScreen}>
                  <Image src="/site/logo-wordmark.png" alt="Gray Jay Care" width={1648} height={445} />
                  <p>Safe Journeys,<br />Caring Hands</p>
                  <span>Compassionate non-emergency patient transportation, available 24/7.</span>
                  <Link href="/book">Book now</Link>
                  <small>Simple online booking · Secure confirmation</small>
                </div>
              </div>
            </div>

            <div className={styles.aboutCopy}>
              <p className={`${styles.eyebrow} ${styles.orangeEyebrow}`}>About us</p>
              <h2>About Gray Jay Care</h2>
              <p className={styles.aboutTagline}>Two Brothers. One Purpose. A Commitment to Care.</p>
              <p className={styles.aboutLead}>
                Gray Jay Care was founded by two brothers with up to five years of experience in patient
                transportation. After seeing the need for safer, more reliable, on-time and compassionate service,
                they created a family-owned company built around care.
              </p>
              <div className={styles.aboutStory}>
                <p>Our values come from our mother, who raised us after we lost our father at a young age. She taught us that caring for others is something you show through your actions.</p>
                <p>Today, we proudly serve hospitals, nursing homes, clinics, insurance claims, OPGT clients, individuals and families throughout Southwestern Ontario. The name Gray Jay was inspired by the beautiful Canadian bird and reflects the Canadian roots and values that are part of who we are.</p>
                <div><strong>Our Promise</strong><span>Every passenger is treated with the care, respect and patience we would want for our own family.</span><em>Gray Jay Care — Safe Journeys, Caring Hands.</em></div>
              </div>
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
          <ReviewCarousel reviews={TESTIMONIALS} />
          <a className={styles.googleReviewsLink} href="https://share.google/xkWjwOPfR9apkRU8Z" target="_blank" rel="noreferrer">View our latest Google reviews</a>
        </section>

        <section id="contact" className={styles.contact}>
          <div className={styles.contactIntro}>
            <h2 className={styles.eyebrow}>Contact Us</h2>
            <p className={styles.contactDescription}>
              Whether you have questions about our services or need assistance with booking your transportation,
              our team is here to help. Please reach out using the contact information below.
            </p>
          </div>
          <div className={styles.contactGrid}>
            <div className={styles.contactInformation}>
              <h3>Contact information</h3>
              <div className={styles.contactLinks}>
                <ContactLink href="tel:+15199335090" icon="phone" label="(519) 933-5090" />
                <ContactLink href="mailto:support@grayjaycare.com" icon="message" label="support@grayjaycare.com" />
                <ContactLink href="https://www.instagram.com/grayjaycare/" icon="instagram" label="Follow Us on Instagram" external />
                <ContactLink href="https://www.facebook.com/grayjaycare" icon="facebook" label="Follow Us on Facebook" external />
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
      <FloatingCallButton />
      <TidioChat />
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
