import { useEffect, useRef, useState } from "react";
import { readLog, subscribe } from "../../lib/syslog.js";
import { useI18n } from "./i18n.jsx";

const VISIBLE = 9;
const DIM_TYPES = new Set(["coffee", "unknown"]);

export default function SysLog() {
  const { t } = useI18n();
  const [entries, setEntries] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    const sync = () => setEntries(readLog());
    sync();
    return subscribe(sync);
  }, []);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [entries]);

  return (
    <div className="card">
      <div className="log" ref={boxRef} aria-live="polite">
        {entries.slice(-VISIBLE).map((e) => (
          <div key={`${e.t}-${e.type}-${e.arg}`} className={DIM_TYPES.has(e.type) ? "dim" : undefined}>
            &gt; {t(`syslog.${e.type}`, { arg: e.arg ?? "", n: e.arg ?? 0 })}
          </div>
        ))}
        <div>
          &gt; {t("syslog.awaiting")}
          <span className="log-cursor">_</span>
        </div>
      </div>
    </div>
  );
}
