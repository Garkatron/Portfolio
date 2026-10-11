import { useState } from "react";
import { log } from "../../lib/syslog.js";

/** Tabs = the current page's section files. Same-page anchors just move the active tab. */
export default function Tabs({ tabs }) {
  const [active, setActive] = useState(() => tabs.findIndex((tab) => tab.active));

  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab, i) => (
        <a
          key={tab.file}
          href={tab.href}
          role="tab"
          aria-selected={i === active}
          className={i === active ? "on" : undefined}
          onClick={() => {
            setActive(i);
            log("open", tab.file);
          }}
        >
          {tab.file}
        </a>
      ))}
    </div>
  );
}
