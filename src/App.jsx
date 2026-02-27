import { useRef } from "preact/compat";
import Book from "./components/Book";
import Page from "./components/Page";
// import noirmale2 from "./assets/noirmale2.png";
import noirmale2 from "./assets/2026.jpg";
import maletin from "./assets/maletin2.png";
import terminator from "./assets/terminator.jpg";
import ProjectCard from "./components/ProjectCard";

import {
  databasesIcons,
  frameworksIcons,
  languagesIcons,
  librariesIcons,
  techIcons,
  toolsIcons,
} from "./data/techIcons";

function Banner({}) {
  return (
    <div className="has-comic-bg text-center p-4 mt-5">
      <h3 className="text-6xl DMSerifDisplay" style={{ color: "#cc0030" }}>
        2026
      </h3>
      <h3 className="text-3xl DMSerifDisplay">Web Developer</h3>
      <h3 className="text-3xl DMSerifDisplay" style={{ color: "#cc0030" }}>
        Portfolio
      </h3>
    </div>
  );
}

function App() {
  const bookRef = useRef(null);

  const handleNext = (newPage) => {
    console.log("Página siguiente:", newPage);
  };

  const handlePrev = (newPage) => {
    console.log("Página anterior:", newPage);
  };

  return (
    <div className="relative flex justify-center items-center min-h-screen bg-[#111]">
      <Book ref={bookRef} onNext={handleNext} onPrev={handlePrev}>
        <Page>
          <div className="flex flex-col w-full h-full overflow-hidden">
            <img
              src={noirmale2.src}
              alt="ProfilePhoto"
              className="w-full h-full object-cover"
            />
          </div>
        </Page>

        <Page>
          <div className="flex flex-col w-full h-full  overflow-hidden">
            <Banner />
          </div>
          <div className="flex flex-col w-full h-full  overflow-hidden">
            <div></div>
          </div>
        </Page>

        <Page>
          <div className="flex flex-col w-full h-full p-6 justify-center">
            <h2 className="has-comic-bg text-4xl DMSerifDisplay mb-4 text-[#cc0030]! p-5">
              About Me
            </h2>

            <p className="text-lg leading-relaxe">
              I began my programming journey during the pandemic, starting with
              Java and exploring other languages. Since then, I’ve been building
              projects, learning new concepts, and recently completed a
              vocational training program (GM FP) in Microinformatic Systems and
              Communications. I am currently studying DAW (Web Development).
            </p>

            <h4 className="has-comic-bg text-2xl DMSerifDisplay mt-4 p-2">
              Use of AI
            </h4>
            <p className="mt-4 text-lg leading-relaxed">
              I use AI to research, clarify concepts, and handle small
              refactorings or optimizations. It saves time on repetitive tasks,
              but I avoid relying on it for major refactors or as my main
              learning source. Download CV GitHub
            </p>
          </div>
          <div className="flex flex-col w-full h-full p-6">
            <h2 className="has-comic-bg text-4xl DMSerifDisplay mb-4 text-[#cc0030]! p-5">
              Tech Stack
            </h2>
            <h4 className="has-comic-bg text-2xl DMSerifDisplay mt-4 mb-4 p-2">
              Languages
            </h4>
            <ul className="grid grid-cols-4 gap-6 place-items-center">
              {languagesIcons.map(({ name, icon }) => (
                <li key={name} className="flex flex-col items-center gap-2">
                  <img src={icon.src} alt={name} className="w-10 h-10" />
                  <span className="opacity-70 text-2xl">{name}</span>
                </li>
              ))}
            </ul>
            <h4 className="has-comic-bg text-2xl DMSerifDisplay mt-4 mb-4 p-2">
              Libraries
            </h4>
            <ul className="grid grid-cols-4 gap-6 place-items-center">
              {librariesIcons.map(({ name, icon }) => (
                <li key={name} className="flex flex-col items-center gap-2">
                  <img src={icon.src} alt={name} className="w-10 h-10" />
                  <span className="opacity-70 text-2xl">{name}</span>
                </li>
              ))}
            </ul>
            <h4 className="has-comic-bg text-2xl DMSerifDisplay mt-4 mb-4 p-2">
              Frameworks
            </h4>
            <ul className="grid grid-cols-4 gap-6 place-items-center">
              {frameworksIcons.map(({ name, icon }) => (
                <li key={name} className="flex flex-col items-center gap-2">
                  <img src={icon.src} alt={name} className="w-10 h-10" />
                  <span className="opacity-70 text-2xl">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        </Page>
        <Page>
          <div className="flex flex-col w-full h-full p-6">
            <h2 className="has-comic-bg text-4xl DMSerifDisplay mb-4 text-[#cc0030]! p-5">
              Other
            </h2>
            <h4 className="has-comic-bg text-2xl DMSerifDisplay mt-4 mb-4 p-2">
              Tools
            </h4>
            <ul className="grid grid-cols-4 gap-6 place-items-center">
              {toolsIcons.map(({ name, icon }) => (
                <li key={name} className="flex flex-col items-center gap-2">
                  <img src={icon.src} alt={name} className="w-10 h-10" />
                  <span className="opacity-70 text-2xl">{name}</span>
                </li>
              ))}
            </ul>
            <h4 className="has-comic-bg text-2xl DMSerifDisplay mt-4 mb-4 p-2">
              Databases
            </h4>

            <ul className="grid grid-cols-4 gap-6 place-items-center">
              {databasesIcons.map(({ name, icon }) => (
                <li key={name} className="flex flex-col items-center gap-2">
                  <img src={icon.src} alt={name} className="w-10 h-10" />
                  <span className="opacity-70 text-2xl">{name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col w-full h-full p-6">
            <h2 className="has-comic-bg text-4xl DMSerifDisplay mb-4 text-[#cc0030]! p-5">
              My Career
            </h2>

            <div className="space-y-4 text-lg ">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Inicié
                mi camino en el desarrollo web enfocándome en frontend.
              </p>

              <p>
                He trabajado en proyectos personales y profesionales, mejorando
                continuamente mis habilidades técnicas y creativas.
              </p>
            </div>
          </div>
        </Page>
        <Page>
          <div className="flex flex-col w-full h-full p-6 gap-6">
            <h2 className="has-comic-bg text-4xl DMSerifDisplay text-[#cc0030]! p-5">
              Projects
            </h2>
            <ProjectCard
              title="ScrapRenderer — 3D Rasterizer in Rust"
              description="Una breve descripción del proyecto, qué hace y por qué está bueno."
              tags={["Rust"]}
              link="https://github.com/Garkatron/ScrapRenderer"
            />
            <ProjectCard
              title="Lox Interpreter in Rust"
              description="Una breve descripción del proyecto, qué hace y por qué está bueno."
              tags={["Rust"]}
              link="https://github.com/Garkatron/Rust-Lox-Interpreter"
            />
            <ProjectCard
              title="CLOX Implementation (incomplete)"
              description="Una breve descripción del proyecto, qué hace y por qué está bueno."
              tags={["C"]}
              link="https://github.com/Garkatron/OWN_CLOX_IMPLEMENTATION"
            />
            <ProjectCard
              title="Express Quiz REST API"
              description="Una breve descripción del proyecto, qué hace y por qué está bueno."
              tags={["Typescript", "Express", "JWT"]}
              link="https://github.com/Garkatron/ExpressQuizzApi"
            />
            <ProjectCard
              title="Comic / Noir Style Portfolio"
              description="Una breve descripción del proyecto, qué hace y por qué está bueno."
              tags={["Astro", "Tailwind", "Doodle.css"]}
                            link="https://garkatron.github.io/ComicPortfolio/"

            />
          </div>
          <div className="flex flex-col w-full h-full p-6 gap-6">
            <ProjectCard
              title="Resources"
              description="Una breve descripción del proyecto, qué hace y por qué está bueno."
              image=""
              tags={[]}
              link="https://github.com/Garkatron/IWantToLearnX"
            />
          </div>
        </Page>

        <Page>
          <div className="flex flex-col w-full h-full p-6 justify-center">
            <h2 className="has-comic-bg text-4xl DMSerifDisplay mb-4 text-[#cc0030]! p-5">
              Contact
            </h2>

            <p className="text-lg mb-4">
              ¿Querés trabajar conmigo o tenés una idea?
            </p>

            <ul className="space-y-3 text-lg ">
              <li>📧 email@ejemplo.com</li>
              <li>💼 linkedin.com/in/tuusuario</li>
              <li>🐙 github.com/tuusuario</li>
            </ul>
          </div>
        </Page>
      </Book>

      <button
        onClick={() => bookRef.current?.goPrev()}
        className="fixed left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-lg text-2xl font-bold transition-all duration-300 hover:scale-110 backdrop-blur-sm z-50"
      >
        ← Anterior
      </button>
      <button
        onClick={() => bookRef.current?.goNext()}
        className="fixed right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-lg text-2xl font-bold transition-all duration-300 hover:scale-110 backdrop-blur-sm z-50"
      >
        Siguiente →
      </button>
    </div>
  );
}

export default App;
