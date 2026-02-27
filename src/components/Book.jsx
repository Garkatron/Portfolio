import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  Children,
  isValidElement,
  cloneElement
} from "preact/compat";
import styles from "../styles/Book.module.css";

const Book = forwardRef(({ children, className = "", onNext, onPrev }, ref) => {
  const bookRef = useRef(null);

  const pages = Children.toArray(children).filter((child) =>
    isValidElement(child),
  );

  const totalCards = pages.length;
  const [currentPage, setCurrentPage] = useState(0);
  const [audio, setAudio] = useState(null);
  const [pageStates, setPageStates] = useState(
    Array(totalCards).fill({ flipped: false, zIndex: 0 })
  );

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
        bookRef.current.style.transform = "translateX(100%)";
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
  }, [currentPage, pages.length]);

  const playAudio = (name) => {
    const clip = audio?.[name];
    if (!clip) return;
    clip.currentTime = 0;
    clip.play().catch(() => {});
  };

  const goNext = () => {
    setCurrentPage((prev) => {
      const next = Math.min(prev + 1, totalCards);
      
      if (next === prev) return prev;

      setPageStates(states => {
        const newStates = [...states];
        newStates[prev] = { flipped: true, zIndex: states[prev]?.zIndex || (totalCards - prev) };
        return newStates;
      });

      setTimeout(() => {
        setPageStates(states => {
          const newStates = [...states];
          newStates[prev] = { ...newStates[prev], zIndex: prev };
          return newStates;
        });
      }, 70);

      if (prev === 0) playAudio("open");
      else if (next === totalCards) playAudio("close");
      else playAudio("fold");

      onNext?.(next);
      return next;
    });
  };

  const goPrev = () => {
    setCurrentPage((prev) => {
      const next = Math.max(prev - 1, 0);
      
      if (next === prev) return prev;

      setPageStates(states => {
        const newStates = [...states];
        newStates[next] = { flipped: false, zIndex: states[next].zIndex };
        return newStates;
      });

      setTimeout(() => {
        setPageStates(states => {
          const newStates = [...states];
          newStates[next] = { flipped: false, zIndex: totalCards - next };
          return newStates;
        });
      }, 120);

      if (next === 0) playAudio("close");
      else if (prev === totalCards) playAudio("open");
      else playAudio("fold");

      onPrev?.(next);
      return next;
    });
  };

  useImperativeHandle(ref, () => ({
    goNext,
    goPrev,
    getCurrentPage: () => currentPage,
    getTotalPages: () => totalCards
  }));

  return (
    <div className={`${styles.book} ${className}`} ref={bookRef}>
      <div className={styles.bookInner}>
        {pages.map((child, index) =>
          cloneElement(child, {
            key: index,
            index,
            totalCards,
            flipped: pageStates[index]?.flipped || false,
            style: { zIndex: pageStates[index]?.zIndex || (totalCards - index) }
          }),
        )}
      </div>

      <div className={styles.pageCounter}>
        Página {currentPage + 1} de {totalCards}
      </div>
    </div>
  );
});

Book.displayName = "Book";

export default Book;