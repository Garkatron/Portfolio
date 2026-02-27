const ProjectCard = ({ title, description, image = "", tags = [], link = "" }) => {
  return (
    <a  href={link} className="group relative flex gap-3 p-3 bg-black/40 border-white/20 hover:border-[#cc0030] transition-all duration-300">
      {/* Imagen compacta */}
      <div className="w-24 h-24 shrink-0 overflow-hidden bg-[#1a1a1a]">
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
            NO IMAGE
          </div>
        )}
      </div>

      {/* Info compacta */}
      <div className="flex-1 min-w-0">
        <h3 className="DMSerifDisplay text-xl text-white mb-1 tracking-wide">
          {title}
        </h3>
        <p className="text-sm text-white/70 mb-2 line-clamp-2">
          {description}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span 
              key={i}
              className="px-2 py-0.5 text-xs text-white  font-mono uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Detalle noir: esquinas de investigación */}
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#cc0030] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#cc0030] opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};

export default ProjectCard;