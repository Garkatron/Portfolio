import { useI18n } from "./i18n.jsx";
import { log } from "../../lib/syslog.js";

export default function Explorer({ nav, toolGroups, open }) {
  const { t } = useI18n();

  return (
    <nav className={`tree${open ? " open" : ""}`} id="explorer" aria-label={t("shell.explorer")}>
      <h6 className="px">{t("shell.explorer")}</h6>
      <span className="dir">▾ {t("files.root")}</span>
      {nav.map((item) => (
        <a
          key={item.id}
          href={item.href}
          className={item.active ? "on" : undefined}
          aria-current={item.active ? "page" : undefined}
          onClick={() => log("open", item.file)}
        >
          <span className="i">◆</span>
          {item.file}
        </a>
      ))}

      <h6 className="px tree-gap">{t("shell.tools")}</h6>
      {toolGroups.map((group) => (
        <details key={group.id} className="tree-group" open>
          <summary className="dir">{group.label}/</summary>
          <ul>
            {group.tools.map((tool) => (
              <li key={tool.name}>
                {tool.icon ? (
                  <span
                    className="i tool-icon"
                    aria-hidden="true"
                    style={{ "--tool-color": tool.color, "--tool-icon": `url("${tool.icon}")` }}
                  />
                ) : (
                  <span className="i" aria-hidden="true" style={{ color: tool.color }}>
                    ●
                  </span>
                )}
                {tool.name.toLowerCase()}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  );
}
