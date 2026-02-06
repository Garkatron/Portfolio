import React from "react";
import pageTexture from "../assets/papel0.png";
import styles from "../styles/Page.module.css";

export default function Page({ index, totalCards, flipped = false, children, className = "" }) {
  const zIndex = totalCards ? totalCards - (index ?? 0) : 0;
  const childArray = React.Children.toArray(children);
  const front = childArray[0];
  const back = childArray[1];

  return (
    <div 
      className={`${styles.paper} ${flipped ? styles.flipped : ""} ${className}`} 
      style={{ 
        zIndex: flipped ? totalCards + index : zIndex,
        backgroundImage: `url(${pageTexture})`
      }}
    >
      <div className={styles.front}>
        <div className="frontContent">{front}</div>
      </div>
      <div className={styles.back}>
        <div className="backContent">{back}</div>
      </div>
    </div>
  );
}
