import React from "react";
import Book from "./components/Book";
import Page from "./components/Page";
import noirmale2 from "./assets/noirmale2.png";

function App() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#111]">
      <Book>
        <Page>
          <div className="flex flex-col w-full h-full">
            <img src={noirmale2} alt="ProfilePhoto" />
          </div>
          <div className="flex flex-col w-full h-ful">
            <div className="has-comic-bg p-4">
              <h2>Página 1 - Atrás</h2>
              <p>Contenido del reverso</p>
            </div>
          </div>
        </Page>

        <Page>
          <div className="flex flex-col w-full h-full">
            <h2>Página 2 - Frente</h2>
            <p>Más contenido aquí</p>
          </div>
          <div className="flex flex-col w-full h-full">
            <h2>Página 2 - Atrás</h2>
            <p>Reverso de página 2</p>
          </div>
        </Page>

        <Page>
          <div className="flex flex-col w-full h-full">
            <h2>Página 3 - Frente</h2>
          </div>
          <div className="flex flex-col w-full h-full">
            <h2>Página 3 - Atrás</h2>
          </div>
        </Page>
      </Book>
    </div>
  );
}

export default App;
