"use client";

import { useState } from "react";
import styles from "@/app/landing.module.css";

type Review = {
  name: string;
  quote: string;
};

export default function ReviewCarousel({ reviews }: { reviews: Review[] }) {
  const [paused, setPaused] = useState(false);

  return (
    <div className={styles.reviewCarousel}>
      <button
        type="button"
        className={styles.reviewMotionButton}
        aria-pressed={paused}
        onClick={() => setPaused((current) => !current)}
      >
        <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
        {paused ? "Resume reviews" : "Pause reviews"}
      </button>
      <div className={styles.reviewViewport}>
        <div className={`${styles.reviewTrack} ${paused ? styles.reviewTrackPaused : ""}`}>
          {[...reviews, ...reviews].map((review, index) => (
            <article className={styles.reviewCard} key={`${review.name}-${index}`} aria-hidden={index >= reviews.length}>
              <div className={styles.reviewHeader}>
                <span className={styles.reviewAvatar}>{review.name.charAt(0)}</span>
                <span>
                  <strong>{review.name}</strong>
                  <small>Verified Google review</small>
                </span>
                <b aria-label="Google review">G</b>
              </div>
              <div className={styles.stars} aria-label="5 out of 5 stars">★★★★★</div>
              <p>{review.quote}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
