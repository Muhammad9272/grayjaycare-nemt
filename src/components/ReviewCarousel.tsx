"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/landing.module.css";

type Review = {
  name: string;
  date: string;
  quote: string;
  avatarUrl?: string;
};

export default function ReviewCarousel({ reviews }: { reviews: Review[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  useEffect(() => {
    const card = viewportRef.current?.querySelector<HTMLElement>(`[data-review-index="${activeIndex}"]`);
    viewportRef.current?.scrollTo({ left: card?.offsetLeft ?? 0, behavior: "smooth" });
  }, [activeIndex]);

  useEffect(() => {
    if (paused || reviews.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % reviews.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [paused, reviews.length]);

  function move(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + reviews.length) % reviews.length);
  }

  return (
    <div className={styles.reviewCarousel}>
      <button type="button" className={`${styles.reviewArrow} ${styles.reviewPrevious}`} onClick={() => move(-1)} aria-label="Previous review">‹</button>
      <div className={styles.reviewViewport} ref={viewportRef}>
        <div className={styles.reviewTrack}>
          {reviews.map((review, index) => {
            const expanded = expandedReview === review.name;
            return (
              <article className={styles.reviewCard} key={review.name} data-review-index={index}>
                <div className={styles.reviewHeader}>
                  <span
                    className={styles.reviewAvatar}
                    style={review.avatarUrl ? { backgroundImage: `url(${review.avatarUrl})` } : undefined}
                    aria-hidden="true"
                  >{review.avatarUrl ? "" : review.name.charAt(0)}</span>
                  <span className={styles.reviewProfile}>
                    <strong>{review.name}</strong>
                    <small>{review.date}</small>
                  </span>
                  <span className={styles.reviewGoogleIcon} aria-label="Google review" />
                </div>
                <div className={styles.stars} aria-label="5 out of 5 stars">★★★★★</div>
                <p className={expanded ? styles.reviewQuoteExpanded : ""}>{review.quote}</p>
                {review.quote.length > 190 && (
                  <button
                    type="button"
                    className={styles.reviewReadMore}
                    aria-expanded={expanded}
                    onClick={() => setExpandedReview(expanded ? null : review.name)}
                  >{expanded ? "Hide" : "Read more"}</button>
                )}
              </article>
            );
          })}
        </div>
      </div>
      <button type="button" className={`${styles.reviewArrow} ${styles.reviewNext}`} onClick={() => move(1)} aria-label="Next review">›</button>
      <button
        type="button"
        className={styles.reviewMotionButton}
        aria-pressed={paused}
        aria-label={paused ? "Resume automatic review movement" : "Pause automatic review movement"}
        onClick={() => setPaused((current) => !current)}
      >{paused ? "▶" : "Ⅱ"}</button>
    </div>
  );
}
