'use client';

import { useState } from 'react';
import styles from './VideoFacade.module.css';

/**
 * Click-to-load YouTube. The player is ~1 MB and must never be in the critical
 * path, so until someone asks for it this is a thumbnail and a button.
 * The box is reserved by aspect-ratio, so swapping in the iframe shifts nothing.
 */
export default function VideoFacade({
  id,
  title,
  className,
}: {
  id: string;
  title: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        className={[styles.frame, className].filter(Boolean).join(' ')}
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      className={[styles.facade, className].filter(Boolean).join(' ')}
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}
    >
      <span className={styles.play} aria-hidden="true" />
      <span className={styles.caption}>{title}</span>
    </button>
  );
}
