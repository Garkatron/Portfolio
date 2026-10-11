// Used statically on the home page and inside the ProjectExplorer island.
// `project` comes from getProjects() in src/lib/content.js.
export default function ProjectCard({ project, labels }) {
  const file = `projects/${project.slug}.tsx`;
  return (
    <article className="proj">
      <a className="thumb" data-pagefind-ignore href={project.href} data-log="open" data-log-arg={file} tabIndex={-1} aria-hidden="true">
        {project.image && <img src={project.image} alt="" loading="lazy" />}
        <span className="rec">REC ●</span>
        {!project.image && <span className="slug">{file}</span>}
      </a>
      <h3>
        <a href={project.href} data-log="open" data-log-arg={file}>
          {project.title}
        </a>{" "}
        {project.year && <span>— {project.year}</span>}
      </h3>
      {project.description && <p className="desc">{project.description}</p>}
      {project.tags.length > 0 && <div className="tags">{project.tags.join(" · ")}</div>}
      {(project.links.repo || project.links.live) && (
        <div className="proj-links">
          {project.links.repo && (
            <a href={project.links.repo} target="_blank" rel="noreferrer" data-log="open" data-log-arg={`${project.slug}:repo`}>
              ↗ {labels.repo}
            </a>
          )}
          {project.links.live && (
            <a href={project.links.live} target="_blank" rel="noreferrer" data-log="open" data-log-arg={`${project.slug}:live`}>
              ↗ {labels.live}
            </a>
          )}
        </div>
      )}
      <a
        className="barcode-link"
        data-pagefind-ignore
        href={project.href}
        title={labels.barcode}
        aria-label={labels.barcode}
        data-log="open"
        data-log-arg={file}
      >
        <span dangerouslySetInnerHTML={{ __html: project.barcode }} />
      </a>
    </article>
  );
}
