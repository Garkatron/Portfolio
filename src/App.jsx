import HTMLFlipBook from "react-pageflip";
import { useRef } from "react";

import Page from "./components/Page";

import noirmale2 from "./assets/2026.jpg";
import cover from "./assets/Portfolio2026Cover.png";

import {
  frameworksIcons,
  languagesIcons,
  librariesIcons,
  toolsIcons,
  databasesIcons,
} from "./data/techIcons";

function Banner() {
  return (
    <div className="has-comic-bg text-center p-4 mt-5 text-white">
      <h3 className="text-6xl DMSerifDisplay text-[#cc0030]">2026</h3>
      <h3 className="text-3xl DMSerifDisplay">Web Developer</h3>
      <h3 className="text-3xl DMSerifDisplay text-[#cc0030]">Portfolio</h3>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="p-6 text-black">
      <h2 className="text-4xl DMSerifDisplay text-[#cc0030]">{title}</h2>
      {children}
    </div>
  );
}

function IconGrid({ items }) {
  return (
    <ul className="grid grid-cols-4 gap-6 place-items-center mt-4">
      {items.map(({ name, icon }) => (
        <li key={name} className="flex flex-col items-center gap-2 text-black">
          <img src={icon.src} alt={name} className="w-10 h-10" />
          <span>{name}</span>
        </li>
      ))}
    </ul>
  );
}

function ProjectPage({ title, description, link, tags, tech }) {
  return (
    <div className="text-black">
      {/* IMAGE PLACEHOLDER */}
      <div className="w-full h-96 bg-gray-300 flex items-center justify-center mb-4">
        <span className="text-gray-700 text-sm">Project Image Placeholder</span>
      </div>

      <div className="p-2">
        <h2 className="text-3xl DMSerifDisplay text-[#cc0030]">{title}</h2>

        <p className="text-sm mt-2">{description}</p>

        <a
          href={link}
          target="_blank"
          className="text-xs underline break-all block mt-2"
        >
          {link}
        </a>

        <div className="flex flex-wrap gap-2 mt-3">
          {tags.map((t) => (
            <span key={t} className="text-xs px-2 py-1 bg-black text-white">
              {t}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          {tech.map(({ name, icon }) => (
            <div
              key={name}
              className="flex items-center gap-2 text-sm text-black"
            >
              <img src={icon.src} className="w-5 h-5" alt={name} />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from "react";

function PracticeCard({
  company,
  startDate,
  endDate,
  website,
  description,
  children,
}) {
  return (
    <div className="mb-6 text-black">
      <div className="flex flex-col gap-1">
        <h4 className="text-xl DMSerifDisplay text-[#cc0030]">{company}</h4>

        <div className="text-xs text-gray-700">
          {startDate} - {endDate}
        </div>

        {website && (
          <a
            href={website}
            target="_blank"
            className="text-xs underline break-all"
          >
            {website}
          </a>
        )}
      </div>

      {description && (
        <p className="text-sm mt-2 leading-relaxed">{description}</p>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function App() {
  const bookRef = useRef(null);

  const goNext = () => bookRef.current?.pageFlip()?.flipNext();
  const goPrev = () => bookRef.current?.pageFlip()?.flipPrev();

  return (
    <div className="relative flex justify-center items-center min-h-screen bg-[#111]">
      <HTMLFlipBook
        width={500}
        height={680}
        size="fixed"
        minWidth={320}
        maxWidth={1000}
        minHeight={400}
        maxHeight={1200}
        showCover={true}
        mobileScrollSupport={true}
        drawShadow={true}
        maxShadowOpacity={0.2}
        ref={bookRef}
      >
        <Page>
          <img
            src={noirmale2.src}
            className="w-full h-full object-cover"
            alt="cover"
          />
        </Page>

        <Page>
          <Banner />
        </Page>

        <Page>
          <Section title="About Me">
            <p className="text-lg mt-4 text-black">
              I began my programming journey during the pandemic...
            </p>
          </Section>
        </Page>

        <Page>
          <Section title="Tech Stack">
            <h4 className="text-black mt-4">Languages</h4>
            <IconGrid items={languagesIcons} />

            <h4 className="text-black mt-6">Libraries</h4>
            <IconGrid items={librariesIcons} />

            <h4 className="text-black mt-6">Frameworks</h4>
            <IconGrid items={frameworksIcons} />
          </Section>
        </Page>

        <Page>
          <Section title="Other">
            <h4 className="text-black mt-4">Tools</h4>
            <IconGrid items={toolsIcons} />

            <h4 className="text-black mt-6">Databases</h4>
            <IconGrid items={databasesIcons} />
          </Section>
        </Page>

        <Page>
          <Section title="Projects"></Section>
        </Page>

        <Page>
          <ProjectPage
            title="ScrapRenderer"
            description="3D rasterizer in Rust"
            link="https://github.com/Garkatron/ScrapRenderer"
            tags={["Rust"]}
            tech={[...languagesIcons, ...librariesIcons].slice(0, 6)}
          />
        </Page>

        <Page>
          <ProjectPage
            title="Lox Interpreter"
            description="Interpreter in Rust"
            link="https://github.com/Garkatron/Rust-Lox-Interpreter"
            tags={["Rust"]}
            tech={[...languagesIcons].slice(0, 6)}
          />
        </Page>

        <Page>
          <ProjectPage
            title="Express Quiz API"
            description="REST API"
            link="https://github.com/Garkatron/ExpressQuizzApi"
            tags={["TS", "Express"]}
            tech={[...frameworksIcons, ...toolsIcons].slice(0, 6)}
          />
        </Page>

        <Page>
          <Section title="Contact">
            <ul className="mt-4 text-lg space-y-2 text-black">
              <li>email@ejemplo.com</li>
              <li>github.com/tuusuario</li>
              <li>linkedin.com/in/tuusuario</li>
            </ul>
          </Section>
        </Page>

        <Page>
          <Section title="Practices">
            <PracticeCard
              company="Platita Software"
              startDate="2025"
              endDate="2026"
              website="https://platita.es"
              description="Desarrollo de invitaciones de bodas digitales."
            >
              <a
                className="text-xs underline break-all"
                href="https://www.invited.es/es"
              >
                Invited.es
              </a>
              <ul className="text-sm list-disc ml-5">
                <li>
                  Crear invitaciones con JavaScript, React, Tailwind y
                  Bootstrap.
                </li>
                <li>Integración con APIs existentes.</li>
                <li>Organizacion del tiempo.</li>
              </ul>
            </PracticeCard>

            <PracticeCard
              company="Platita Software"
              startDate="2026"
              endDate="2026"
              website="https://platita.es"
              description="Desarrollo de invitaciones de bodas digitales."
            >

              <ul className="text-sm list-disc ml-5">
                <li>
                  Desarrollo de servicio Backend con Typescript y AdonisJS
                </li>
                <li>Desarrollo de App móvil con React Native y React Expo</li>
                <li>
                  Desarrollo de App de escritorio con Preact, Tauri y Tailwind
                </li>
                <li>Tecnología NFC</li>
                <li>Coordinación y comunicación con Desarrollador Front-End</li>
                <li>
                  Gestion de tiempo, fechas limite y tareas con fecha definida
                </li>
                <li>Selección de tecnologías a usar para el proyecto</li>
                <li>Comunicacion con los clientes</li>
                <li>Reuniones semanales para reporte de avances</li>
              </ul>
            </PracticeCard>
          </Section>
        </Page>

        <Page></Page>

        {/*  */}

        <Page></Page>

        <Page>
          <img
            src={cover.src}
            className="w-full h-full object-cover"
            alt="cover"
          />
        </Page>
      </HTMLFlipBook>

      <button
        onClick={goPrev}
        className="fixed left-6 top-1/2 -translate-y-1/2 bg-white/10 px-6 py-4 text-white"
      >
        ←
      </button>

      <button
        onClick={goNext}
        className="fixed right-6 top-1/2 -translate-y-1/2 bg-white/10 px-6 py-4 text-white"
      >
        →
      </button>
    </div>
  );
}
