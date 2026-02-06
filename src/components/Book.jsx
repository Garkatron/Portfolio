import React, { useEffect, useRef, useState } from "react";
import styles from "../styles/Book.module.css";

export default function Book({ children, className = "" }) {
  const bookRef = useRef(null);

  const pages = React.Children.toArray(children).filter((child) =>
    React.isValidElement(child),
  );

  const totalCards = pages.length;
  const [currentPage, setCurrentPage] = useState(0);
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    setAudio({
      fold: new Audio("/assets/sounds/fold.wav"),
      open: new Audio("/assets/sounds/open.wav"),
      close: new Audio("/assets/sounds/close.wav"),
    });
  }, []);

  useEffect(() => {
    function centerBook() {
      if (!bookRef.current) return;

      if (currentPage === 0) {
        bookRef.current.style.transform = "translateX(0%)";
        return;
      } else if (currentPage === pages.length) {
        bookRef.current.style.transform = "translateX(0%)";
        return;
      }

      const width = window.innerWidth;
      if (width <= 686) {
        bookRef.current.style.transform = "translateY(-50%)";
      } else {
        bookRef.current.style.transform = "translateX(50%)";
      }
    }

    centerBook();
    window.addEventListener("resize", centerBook);
    return () => window.removeEventListener("resize", centerBook);
  }, [currentPage]);

  const playAudio = (name) => {
    const clip = audio?.[name];
    if (!clip) return;
    clip.currentTime = 0;
    clip.play().catch(() => {});
  };

  const goNext = () => {
    setCurrentPage((prev) => {
      const next = Math.min(prev + 1, totalCards - 1);

      if (prev === 0) playAudio("open");
      else if (next === totalCards - 1) playAudio("close");
      else playAudio("fold");

      return next;
    });
  };

  const goPrev = () => {
    setCurrentPage((prev) => {
      const next = Math.max(prev - 1, 0);

      if (prev === 0) playAudio("close");
      else if (next === totalCards - 1) playAudio("open");
      else playAudio("fold");

      return next;
    });
  };

  return (
    <div className={`${styles.book} ${className}`} ref={bookRef}>
      <div className={styles.bookInner}>
        {pages.map((child, index) =>
          React.cloneElement(child, {
            key: index,
            index,
            totalCards,
            flipped: index < currentPage,
          }),
        )}
      </div>

      <button
        className={`${styles.navButton} ${styles.navButtonLeft} ${currentPage === 0 ? styles.navButtonDisabled : ""}`}
        onClick={goPrev}
        disabled={currentPage === 0}
        onMouseEnter={(e) =>
          (e.target.style.transform = "translateY(-50%) scale(1.1)")
        }
        onMouseLeave={(e) =>
          (e.target.style.transform = "translateY(-50%) scale(1)")
        }
      >
        ‹
      </button>

      <button
        className={`${styles.navButton} ${styles.navButtonRight} ${currentPage === totalCards - 1 ? styles.navButtonDisabled : ""}`}
        onClick={goNext}
        disabled={currentPage === totalCards - 1}
        onMouseEnter={(e) =>
          (e.target.style.transform = "translateY(-50%) scale(1.1)")
        }
        onMouseLeave={(e) =>
          (e.target.style.transform = "translateY(-50%) scale(1)")
        }
      >
        ›
      </button>

      <div className={styles.pageCounter}>
        Página {currentPage + 1} de {totalCards}
      </div>
    </div>
  );
}
