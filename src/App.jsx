import './App.css'
import React, { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import ig from './assets/instagram.svg';
import wt from './assets/whatsapp.svg';
import tw from './assets/twitter-x.svg';
import Rutas from './rutas';

// FAQItem debe ir antes de HomeContent
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-orange-500 rounded-md bg-white border-4">
      <button
        className="w-full text-left px-4 py-3 font-poppins font-semibold flex justify-between items-center focus:outline-none transition-all duration-300"
        onClick={() => setOpen(!open)}
      >
        {question}
        <span className="text-orange-500">{open ? "▲" : "▼"}</span>
      </button>
      <div className={`faq-transition ${open ? "open" : ""}`}>
        <div className="px-4 pb-4 text-gray-700 font-poppins font-light">
          {answer}
        </div>
      </div>
    </div>
  );
}

function HomeContent() {
  return (
    <main className="p-2 sm:p-4 bg-[#E0E7EF] rounded-2xl">
      <section className="bg-[#CACACA] h-[20rem] sm:h-[30rem] rounded-[20px] sm:rounded-[30px]">
        <div className="flex flex-col justify-center items-center h-full">
          <h2 className="text-4xl sm:text-7xl md:text-9xl font-poppins font-light text-center">GeoBus</h2>
          <p className="text-lg sm:text-2xl md:text-4xl text-center mt-4 font-light">
            Conoce tu ruta. <span className="text-orange-500">Conoce tu ruta. Llega a tiempo.</span>
          </p>
        </div>
      </section>
      <section>
        <div className="mt-45 flex flex-col lg:flex-row justify-around items-center gap-8">
          <div className="w-full lg:w-auto flex justify-center">
            <img src="/src/assets/img/section1.png" alt="buses en la terminal" className="h-48 sm:h-64 md:h-80 lg:h-[20rem] rounded-tr-[40px] sm:rounded-tr-[100px] rounded-bl-[40px] sm:rounded-bl-[100px]" />
          </div>
          <div className="flex flex-col justify-center gap-4 w-full lg:w-1/2">
            <h2 className="text-xl sm:text-2xl font-poppins font-semibold">Rutas claras, viajes sin estrés</h2>
            <p className="font-light text-base sm:text-lg">Usa nuestras herramientas para encontrar la mejor opción para tu destino.</p>
            <div className="flex justify-center">
              <button type="button" className="bg-transparent border-2 w-full sm:w-[8rem] cursor-pointer border-orange-500 text-orange-500 font-poppins py-2 px-6 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300">Rutas</button>
            </div>
          </div>
        </div>
      </section>
      <section className="mt-45">
        <div className="flex flex-col md:flex-row justify-around items-center gap-8 mt-10">
          <div className="flex flex-col justify-center items-center">
            <div className="contenedor-img">
              <img src="/src/assets/img/school_13643308.png" alt="logo de bus" className="h-20 sm:h-[5rem]" />
            </div>
            <div className="contenedor-text ">
              <p className="text-center font-poppins font-light text-base sm:text-lg">
                235
                <br />
                UNIDADES
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center items-center">
            <div className="contenedor-img">
              <img src="/src/assets/img/direction_15905299.png" alt="logo de rutas" className="h-20 sm:h-[5rem]" />
            </div>
            <div className="contenedor-text ">
              <p className="text-center font-poppins font-light text-base sm:text-lg">
                34
                <br />
                RUTAS
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center items-center">
            <div className="contenedor-img">
              <img src="/src/assets/img/people_3239045.png" alt="logo de usuarios" className="h-20 sm:h-[5rem]" />
            </div>
            <div className="contenedor-text ">
              <p className="text-center font-poppins font-light text-base sm:text-lg">
                1350
                <br />
                PASAJEROS DIARIOS
              </p>
            </div>
          </div>
        </div>
      </section>
      <section>
        <div className="mt-45 mb-45 flex flex-col lg:flex-row justify-around items-center gap-8">
          <div className="w-full lg:w-auto flex justify-center">
            <img src="/src/assets/img/image 2.png" alt="Terminal de buses de Santiago" className="h-48 sm:h-64 md:h-80 lg:h-[20rem] rounded-tr-[40px] sm:rounded-tr-[100px] rounded-bl-[40px] sm:rounded-bl-[100px]" />
          </div>
          <div className="w-full lg:w-1/2">
            <h2 className="text-xl sm:text-2xl font-poppins font-semibold mb-6 text-center">Preguntas frecuentes</h2>
            <div className="space-y-4">
              <FAQItem
                question="¿Cómo consulto una ruta?"
                answer="Puedes buscar tu ruta usando el buscador en la parte superior o navegando en la sección de rutas."
              />
              <FAQItem
                question="¿Cómo sé el horario de los buses?"
                answer="Los horarios están disponibles en la sección de rutas y paradas, seleccionando la ruta de tu interés."
              />
              <FAQItem
                question="¿Puedo ver las paradas cercanas?"
                answer="Sí, en la sección de paradas puedes ver todas las paradas y su ubicación en el mapa."
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Header siempre visible */}
      <header className="flex flex-col md:flex-row md:justify-between items-center bg-white p-4 md:pl-28 md:pr-28 gap-4 relative">
        <div>
          <h1 className="text-orange-500 light text-2xl sm:text-3xl font-poppins">GeoBus</h1>
        </div>
        <div className="w-full md:w-auto mt-2 md:mt-0">
          <input
            type="search"
            className="border border-gray-300 rounded-md p-2 w-full md:w-96"
            placeholder="Buscar..."
          />
        </div>
        <button
          className="md:hidden absolute top-4 right-4 z-20"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menú"
        >
          <span className="block w-7 h-1 bg-orange-500 mb-1 rounded"></span>
          <span className="block w-7 h-1 bg-orange-500 mb-1 rounded"></span>
          <span className="block w-7 h-1 bg-orange-500 rounded"></span>
        </button>
        <nav className={`
          flex flex-col
          overflow-hidden transition-all duration-300
          ${menuOpen ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4'}
          w-full bg-white shadow-md p-4 gap-4
          md:static md:max-h-full md:opacity-100 md:translate-y-0 md:w-auto md:bg-transparent md:shadow-none md:p-0 md:gap-8 md:flex-row md:items-center
        `}>
          <Link to="/" className="font-poppins font-light border-b-2 border-transparent hover:border-orange-500 transition-all duration-300" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link to="/rutas" className="font-poppins font-light border-b-2 border-transparent hover:border-orange-500 transition-all duration-300" onClick={() => setMenuOpen(false)}>Rutas</Link>
          <a href="#" className="font-poppins font-light border-b-2 border-transparent hover:border-orange-500 transition-all duration-300">Paradas</a>
          <a href="#" className="font-poppins font-light border-b-2 border-transparent hover:border-orange-500 transition-all duration-300">Contacto</a>
        </nav>
      </header>
      {/* Contenido de cada página */}
      <Routes>
        <Route path="/" element={<HomeContent />} />
        <Route path="/rutas" element={<Rutas />} />
        <Route path="*" element={<HomeContent />} />
      </Routes>
      {/* Footer siempre visible */}
      <footer className="h-auto mt-10">
        <div className="flex flex-col md:flex-row justify-around items-center bg-white p-4 md:pl-28 md:pr-28 gap-8">
          <div>
            <h1 className="text-orange-500 light text-3xl sm:text-6xl font-poppins font-light">GeoBus</h1>
          </div>
          <div className="hidden md:block h-24 w-px bg-gray-300 mx-2"></div>
          <div className="flex flex-col gap-2 items-center">
            <h2 className="font-poppins font-light text-xl sm:text-2xl">Enlaces</h2>
            <ul className="list-none">
              <li className="font-poppins font-light hover:translate-x-1 transition-all duration-300">
                <Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
              </li>
              <li className="font-poppins font-light hover:translate-x-1 transition-all duration-300">
                <Link to="/rutas" onClick={() => setMenuOpen(false)}>Rutas</Link>
              </li>
              <li className="font-poppins font-light hover:translate-x-1 transition-all duration-300">
                <a href="#">Sobre nosotros</a>
              </li>
            </ul>
          </div>
          <div className="hidden md:block h-24 w-px bg-gray-300 mx-2"></div>
          <div className="flex flex-col gap-2 items-center">
            <h2 className="font-poppins font-light text-xl sm:text-2xl">Contacto</h2>
            <p className="font-poppins font-light">info@geobus.com</p>
            <p className="font-poppins font-light">(+507) 9999-9999</p>
          </div>
          <div className="hidden md:block h-24 w-px bg-gray-300 mx-2"></div>
          <div className="flex flex-col gap-2 items-center">
            <h2>Redes sociales</h2>
            <img src={ig} alt="Logo de Instagram" className="h-4 w-4 cursor-pointer hover:translate-x-1 transition-all duration-300" />
            <img src={wt} alt="Logo de WhatsApp" className="h-4 w-4 cursor-pointer hover:translate-x-1 transition-all duration-300" />
            <img src={tw} alt="Logo de Twitter" className="h-4 w-4 cursor-pointer hover:translate-x-1 transition-all duration-300" />
          </div>
        </div>
      </footer>
    </>
  )
}

export default App;
