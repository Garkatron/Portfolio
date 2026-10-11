import { useEffect, useState } from "react";
import { useI18n } from "./i18n.jsx";
import Player from "./Player.jsx";
import SysLog from "./SysLog.jsx";

function uptime(since, now = new Date()) {
  const [y, m = 1] = String(since).split("-").map(Number);
  const months = Math.max(0, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m));
  return { y: Math.floor(months / 12), m: months % 12 };
}

export default function Sidebar({ site, playlist, routes }) {
  const { t } = useI18n();
  // Computed after mount so a stale build date never causes a hydration mismatch.
  const [up, setUp] = useState(null);
  useEffect(() => setUp(uptime(site.codingSince)), [site.codingSince]);

  return (
    <aside className="side">
      <h6 className="px">{t("shell.profile")}</h6>
      <div className="card">
        <div className="kv">
          <span>{t("profile.name")}</span>
          <span>{site.name}</span>
        </div>
        <div className="kv">
          <span>{t("profile.status")}</span>
          <span className={site.openToWork ? "open" : undefined}>● {site.status.toUpperCase()}</span>
        </div>
        <div className="kv">
          <span>{t("profile.uptime")}</span>
          <span className="green">{up ? t("profile.uptimeValue", up) : "…"}</span>
        </div>
      </div>

      <h6 className="px">{t("shell.player")}</h6>
      <Player playlist={playlist} />

      <h6 className="px">{t("shell.assistant")}</h6>
      <div className="card">
        <div className="who">{t("assistant.visitor")}</div>
        {t("assistant.question")}
      </div>
      <div className="card me">
        <div className="who">{t("assistant.agent")}</div>
        {t("assistant.answerPrefix")}{" "}
        <a className="acc-link" href={routes.projects} data-log="open" data-log-arg="/projects">
          /projects
        </a>{" "}
        {t("assistant.answerJoin")}{" "}
        <a className="acc-link" href={routes.contact} data-log="open" data-log-arg="/contact">
          /contact
        </a>{" "}
        {t("assistant.answerSuffix")}
      </div>

      <h6 className="px">{t("shell.syslog")}</h6>
      <SysLog />
    </aside>
  );
}
