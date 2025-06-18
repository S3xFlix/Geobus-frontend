import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Configuración inicial
mapboxgl.accessToken = 'pk.eyJ1Ijoia2VuZWw1MDciLCJhIjoiY21idWF5djI0MGNyMzJ0cG51ZmxxM3J4aSJ9.u4_5ohkOKmvME4skGDKt6w';
const API_URL = 'https://geobus-backend.onrender.com/api/rutas';
const API_HORARIOS = 'https://geobus-backend.onrender.com/api/horarios';
const API_PARADAS = 'https://geobus-backend.onrender.com/api/paradas';

function App() {
  // Referencias y estado
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const [rutas, setRutas] = useState([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  const [paradaInicio, setParadaInicio] = useState('');
  const [paradaFin, setParadaFin] = useState('');
  const [rutaInicio, setRutaInicio] = useState('');
  const [rutaFin, setRutaFin] = useState('');
  const currentLocationMarkerRef = useRef(null);
  const nearestStopMarkerRef = useRef(null);
  const waypointMarkersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [todasLasRutas, setTodasLasRutas] = useState({});
  const [activeTab, setActiveTab] = useState('ruta');
  const [paradaA, setParadaA] = useState('');
  const [paradaB, setParadaB] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [nearestStopInfo, setNearestStopInfo] = useState(null);
  const [showHorarios, setShowHorarios] = useState(false);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paradas, setParadas] = useState([]);

  // Función para forzar el redimensionamiento del mapa
  const triggerMapResize = () => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.resize();
        mapRef.current.triggerRepaint();
      }, 100);
    }
  };

  // Normalizar formato de coordenadas
  const normalizeCoordinate = (coord) => {
    if (!coord) return null;
    
    if (Array.isArray(coord) && coord.length === 2 && !isNaN(coord[0]) && !isNaN(coord[1])) {
      return [Number(coord[0]), Number(coord[1])];
    }
    
    if (typeof coord === 'object' && coord !== null) {
      const lng = coord.lng !== undefined ? coord.lng : coord.lon;
      if (lng !== undefined && coord.lat !== undefined) {
        return [Number(lng), Number(coord.lat)];
      }
    }
    
    return null;
  };

  // Validar coordenadas
  const isValidCoordinate = (coord) => {
    const normalized = normalizeCoordinate(coord);
    if (!normalized) return false;
    
    const [lng, lat] = normalized;
    return Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
  };

  // Calcular distancia entre dos puntos en km
  const calcularDistancia = (coord1, coord2) => {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Encontrar la parada más cercana a una ubicación
  const encontrarParadaMasCercana = (ubicacion) => {
    let paradaMasCercana = null;
    let distanciaMinima = Infinity;
    let rutaParada = null;

    // Buscar en todas las paradas
    paradas.forEach(parada => {
      const distancia = calcularDistancia(ubicacion, parada.ubicacion.coordinates);
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        paradaMasCercana = parada;
        rutaParada = rutas.find(r => r._id === parada.rutas[0]?._id);
      }
    });

    return {
      parada: paradaMasCercana,
      distancia: distanciaMinima,
      ruta: rutaParada
    };
  };

  // Cargar horarios desde la API
  const cargarHorariosAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_HORARIOS);
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);

      const data = await response.json();

      // Agrupar por días
      const horariosAgrupados = {};

      data.forEach((horario) => {
        const dias = horario.dias?.join(', ') || 'General';
        if (!horariosAgrupados[dias]) {
          horariosAgrupados[dias] = [];
        }
        horariosAgrupados[dias].push(...horario.salidas);
      });

      // Convertir a formato limpio y ordenado
      const horariosFinales = Object.entries(horariosAgrupados).map(([dia, salidas]) => ({
        dia,
        salidas: salidas
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      }));

      setHorarios(horariosFinales);
      setError(null);
    } catch (error) {
      console.error('Error cargando horarios:', error);
      setError('Error al cargar los horarios');
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar horarios de la ruta seleccionada
  const renderHorarios = () => {
    if (loading) {
      return (
        <div className="bg-white p-4 rounded-lg shadow mt-4">
          <p className="text-gray-600">Cargando horarios...</p>
        </div>
      );
    }

    if (!horarios || horarios.length === 0) {
      return (
        <div className="bg-white p-4 rounded-lg shadow mt-4">
          <p className="text-gray-600">No hay información de horarios disponible.</p>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow mt-4">
        <h3 className="font-bold text-lg mb-4 text-orange-600">Horarios Disponibles</h3>
        {horarios.map((grupoHorario, index) => (
          <div key={index} className="mb-8">
            <h4 className="font-semibold text-md mb-2 capitalize">{grupoHorario.dia}</h4>
            <div
              className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto"
              style={{ maxHeight: '180px' }}
            >
              {grupoHorario.salidas.map((hora, i) => (
                <span
                  key={i}
                  className="bg-gray-100 px-3 py-1 rounded text-sm text-center hover:bg-orange-100 transition"
                >
                  🕒 {hora}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Mostrar ubicación actual del usuario y ruta más cercana
  const mostrarUbicacionActual = async () => {
    if (!mapRef.current || !navigator.geolocation) {
      setError('Geolocalización no soportada o mapa no listo');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        if (!isValidCoordinate(coords)) {
          setError('Coordenadas de ubicación inválidas');
          return;
        }

        // Limpiar marcadores anteriores
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.remove();
        }
        if (nearestStopMarkerRef.current) {
          nearestStopMarkerRef.current.remove();
        }
        
        // Crear marcador de ubicación actual
        currentLocationMarkerRef.current = new mapboxgl.Marker({ color: 'blue' })
          .setLngLat(coords)
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Ubicación actual'))
          .addTo(mapRef.current);

        // Encontrar parada más cercana
        const { parada, distancia, ruta } = encontrarParadaMasCercana(coords);
        
        if (parada && ruta) {
          // Cargar la ruta si no está cargada
          if (!todasLasRutas[ruta._id]) {
            await cargarRuta(ruta._id);
          }

          // Mostrar la ruta completa automáticamente
          mostrarRutaCompleta(ruta._id);

          // Crear marcador de parada más cercana
          nearestStopMarkerRef.current = new mapboxgl.Marker({ color: 'red' })
            .setLngLat(parada.ubicacion.coordinates)
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<strong>${parada.nombre}</strong><br>
               Ruta: ${ruta.nombre}<br>
               Distancia: ${distancia.toFixed(2)} km`
            ))
            .addTo(mapRef.current);

          // Mostrar información de la parada cercana
          setNearestStopInfo({
            nombre: parada.nombre,
            ruta: ruta.nombre,
            distancia: distancia.toFixed(2)
          });

          // Ajustar vista para mostrar ambos puntos y la ruta
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend(coords);
          bounds.extend(parada.ubicacion.coordinates);
          
          mapRef.current.fitBounds(bounds, {
            padding: {top: 50, bottom: 50, left: 50, right: 50},
            maxZoom: 14,
            duration: 1000
          });

          // Mostrar instrucciones
          setInstrucciones(`
            <div class="bg-white p-4 rounded-lg shadow">
              <h3 class="font-bold text-lg mb-2 text-blue-600">Información de ubicación</h3>
              <div class="space-y-2">
                <p><strong>Ubicación actual:</strong> ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}</p>
                <p><strong>Parada más cercana:</strong> ${parada.nombre}</p>
                <p><strong>Ruta:</strong> ${ruta.nombre}</p>
                <p><strong>Distancia:</strong> ${distancia.toFixed(2)} km</p>
                <p class="text-green-600">Se ha cargado automáticamente la ruta ${ruta.nombre}</p>
              </div>
            </div>
          `);
        } else {
          // Si no hay paradas cercanas
          mapRef.current.flyTo({ center: coords, zoom: 14 });
          setNearestStopInfo(null);
          setInstrucciones(`
            <div class="bg-white p-4 rounded-lg shadow">
              <h3 class="font-bold text-lg mb-2 text-blue-600">Información de ubicación</h3>
              <p>No se encontraron paradas cercanas a tu ubicación.</p>
              <p><strong>Coordenadas:</strong> ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}</p>
            </div>
          `);
        }

        setError(null);
        triggerMapResize();
      },
      (err) => {
        setError('Error obteniendo ubicación: ' + err.message);
      }
    );
  };

  // Quitar marcador de ubicación actual y parada cercana
  const quitarUbicacionActual = () => {
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
      currentLocationMarkerRef.current = null;
    }
    if (nearestStopMarkerRef.current) {
      nearestStopMarkerRef.current.remove();
      nearestStopMarkerRef.current = null;
    }
    setNearestStopInfo(null);
    setInstrucciones('');
  };

  // Extraer paradas de un GeoJSON
  const extraerParadas = (geojson) => {
    if (!geojson?.features) return [];
    
    return geojson.features
      .filter(f => f.geometry?.type === "Point" && f.properties)
      .map((f, index) => {
        const normalizedCoord = normalizeCoordinate(f.geometry.coordinates);
        if (!normalizedCoord) return null;
        
        return {
          id: f.properties.id || `parada-${index}`,
          name: f.properties.name || `Parada ${index + 1}`,
          coordinates: normalizedCoord,
          properties: f.properties
        };
      })
      .filter(Boolean);
  };

  // Extraer líneas de ruta de un GeoJSON
  const extraerLineasRuta = (geojson) => {
    if (!geojson?.features) return [];
    
    return geojson.features
      .filter(f => f.geometry?.type === "LineString")
      .map(f => ({
        coordinates: f.geometry.coordinates.map(coord => normalizeCoordinate(coord)).filter(coord => coord !== null),
        properties: f.properties
      }));
  };

  // Cargar datos de una ruta específica
  const cargarRuta = async (rutaId) => {
    if (!rutaId) return null;
    
    try {
      setError(null);
      const res = await fetch(`${API_URL}/${rutaId}`);
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (data?.geojson?.type === 'FeatureCollection') {
        const paradasRuta = extraerParadas(data.geojson);
        const lineasRuta = extraerLineasRuta(data.geojson);
        
        setTodasLasRutas(prev => ({
          ...prev,
          [rutaId]: {
            geojson: data.geojson,
            paradas: paradasRuta,
            lineas: lineasRuta,
            nombre: data.nombre
          }
        }));
        
        return { 
          geojson: data.geojson, 
          paradas: paradasRuta, 
          lineas: lineasRuta,
          nombre: data.nombre
        };
      }
      throw new Error('Formato de datos inválido');
    } catch (err) {
      console.error('Error obteniendo ruta:', err);
      setError(`Error al cargar la ruta: ${err.message}`);
      return null;
    }
  };

  // Manejar selección de ruta
  const handleSeleccionRuta = async (rutaId) => {
    setRutaSeleccionada(rutaId || '');
    setParadaA('');
    setParadaB('');
    setInstrucciones('');
    setShowHorarios(false);
    if (rutaId) {
      await cargarRuta(rutaId);
    }
  };

  // Manejar selección de ruta en conexión
  const handleSeleccionRutaConexion = async (tipo, rutaId) => {
    if (tipo === 'inicio') {
      setRutaInicio(rutaId);
      setParadaInicio('');
    } else {
      setRutaFin(rutaId);
      setParadaFin('');
    }
    setInstrucciones('');
    
    if (rutaId && !todasLasRutas[rutaId]) {
      await cargarRuta(rutaId);
    }
  };

  // Encontrar segmento de línea entre dos puntos
  const encontrarSegmentoLinea = (lineas, puntoInicio, puntoFin) => {
    for (const linea of lineas) {
      const coords = linea.coordinates;
      const indexInicio = coords.findIndex(coord => 
        coord[0] === puntoInicio[0] && coord[1] === puntoInicio[1]
      );
      const indexFin = coords.findIndex(coord => 
        coord[0] === puntoFin[0] && coord[1] === puntoFin[1]
      );
      
      if (indexInicio !== -1 && indexFin !== -1) {
        const start = Math.min(indexInicio, indexFin);
        const end = Math.max(indexInicio, indexFin);
        return coords.slice(start, end + 1);
      }
    }
    return null;
  };

  // Mostrar ruta completa o segmento
  const mostrarRutaCompleta = (rutaId, desdeParadaId = '', hastaParadaId = '') => {
    const rutaData = todasLasRutas[rutaId];
    if (!rutaData) return;
    
    try {
      // Limpiar elementos anteriores
      waypointMarkersRef.current.forEach(marker => marker?.remove());
      waypointMarkersRef.current = [];
      setInstrucciones('');
      
      ['ruta', 'waypoints', 'waypoint-labels', 'ruta-parcial', 'ruta-inicio', 'ruta-fin', 'ruta-conexion'].forEach(id => {
        if (mapRef.current.getLayer(id)) mapRef.current.removeLayer(id);
        if (mapRef.current.getSource(id)) mapRef.current.removeSource(id);
      });

      // Mostrar toda la ruta o solo un segmento
      let lineCoords = [];
      let paradasAMostrar = [];
      let paradasEnSegmento = [];
      
      if (desdeParadaId && hastaParadaId) {
        // Encontrar las paradas seleccionadas
        const paradaAObj = rutaData.paradas.find(p => p.id === desdeParadaId);
        const paradaBObj = rutaData.paradas.find(p => p.id === hastaParadaId);
        
        if (!paradaAObj || !paradaBObj) {
          throw new Error('No se encontraron las paradas seleccionadas');
        }

        // Encontrar índices de las paradas en la ruta
        const indexA = rutaData.paradas.findIndex(p => p.id === desdeParadaId);
        const indexB = rutaData.paradas.findIndex(p => p.id === hastaParadaId);
        
        // Determinar el orden correcto
        const startIndex = Math.min(indexA, indexB);
        const endIndex = Math.max(indexA, indexB);
        
        // Obtener paradas del segmento seleccionado
        paradasEnSegmento = rutaData.paradas.slice(startIndex, endIndex + 1);
        
        // Encontrar las coordenadas de la línea que conecta estas paradas
        const segmentoLinea = encontrarSegmentoLinea(
          rutaData.lineas, 
          paradasEnSegmento[0].coordinates, 
          paradasEnSegmento[paradasEnSegmento.length - 1].coordinates
        );
        
        if (segmentoLinea) {
          lineCoords = segmentoLinea;
        } else {
          // Si no encontramos la línea exacta, usamos las coordenadas de las paradas
          lineCoords = paradasEnSegmento.map(p => p.coordinates);
        }
        
        // Todas las paradas para mostrar (pero marcamos las del segmento)
        paradasAMostrar = [...rutaData.paradas];
      } else {
        // Mostrar toda la ruta
        paradasAMostrar = [...rutaData.paradas];
        paradasEnSegmento = [...rutaData.paradas];
        
        // Combinar todas las líneas de la ruta
        lineCoords = rutaData.lineas.flatMap(linea => linea.coordinates);
      }

      // Añadir la ruta (completa o segmento)
      if (lineCoords.length > 0) {
        mapRef.current.addSource('ruta', {
          type: 'geojson',
          data: { 
            type: "FeatureCollection", 
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: lineCoords
              },
              properties: {}
            }]
          }
        });

        mapRef.current.addLayer({
          id: 'ruta',
          type: 'line',
          source: 'ruta',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 
            'line-color': '#4CAF50',
            'line-width': 4,
            'line-opacity': 0.7
          },
        });
      }

      // Añadir marcadores para todas las paradas
      paradasAMostrar.forEach(parada => {
        const isParadaA = parada.id === desdeParadaId;
        const isParadaB = parada.id === hastaParadaId;
        const estaEnSegmento = paradasEnSegmento.some(p => p.id === parada.id);
        
        let color = '#9e9e9e'; // Gris para paradas fuera del segmento
        let size = 6;
        
        if (isParadaA || isParadaB) {
          color = isParadaA ? '#FF5722' : '#F44336'; // Naranja/rojo para A/B
          size = 8;
        } else if (estaEnSegmento) {
          color = '#4CAF50'; // Verde para paradas dentro del segmento
        }
        
        // Crear contenido del popup con información de la parada
        let popupContent = `<strong>${parada.name}</strong><br>Ruta: ${rutaData.nombre || rutaId}`;
        
        // Añadir información de horarios si está disponible
        if (horarios.length > 0) {
          popupContent += `<br><small class="text-gray-500">Ver horarios en el panel principal</small>`;
        }
        
        waypointMarkersRef.current.push(
          new mapboxgl.Marker({ 
            color,
            scale: size/6
          })
            .setLngLat(parada.coordinates)
            .setPopup(new mapboxgl.Popup().setHTML(popupContent))
            .addTo(mapRef.current)
        );
      });

      // Ajustar vista
      const allCoords = [
        ...lineCoords,
        ...paradasEnSegmento.map(p => p.coordinates)
      ];

      if (allCoords.length > 0) {
        const lngs = allCoords.map(c => c[0]);
        const lats = allCoords.map(c => c[1]);
        
        mapRef.current.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)]
          ],
          {
            padding: 40,
            maxZoom: 15,
            duration: 1000
          }
        );
      }

      setError(null);
    } catch (error) {
      console.error('Error mostrando ruta completa:', error);
      setError('Error al mostrar la ruta completa');
    }
  };

  // Mostrar conexión entre paradas de diferentes rutas
  const mostrarConexionEntreRutas = (paradaInicioObj, paradaFinObj) => {
    if (!mapReady || !mapRef.current) return;
    
    try {
      if (!paradaInicioObj?.coordinates || !paradaFinObj?.coordinates) {
        throw new Error('Coordenadas de paradas no definidas');
      }

      const inicioCoords = normalizeCoordinate(paradaInicioObj.coordinates);
      const finCoords = normalizeCoordinate(paradaFinObj.coordinates);

      if (!inicioCoords || !finCoords) {
        throw new Error('Coordenadas no válidas');
      }

      // Limpiar elementos anteriores
      waypointMarkersRef.current.forEach(marker => marker?.remove());
      waypointMarkersRef.current = [];
      
      ['ruta-conexion', 'waypoints-conexion', 'ruta-inicio', 'ruta-fin'].forEach(id => {
        if (mapRef.current.getLayer(id)) mapRef.current.removeLayer(id);
        if (mapRef.current.getSource(id)) mapRef.current.removeSource(id);
      });

      const rutaInicioData = todasLasRutas[rutaInicio];
      const rutaFinData = todasLasRutas[rutaFin];
      
      if (!rutaInicioData || !rutaFinData) {
        throw new Error('Datos de rutas no cargados');
      }

      const indexInicio = rutaInicioData.paradas.findIndex(p => p.id === paradaInicioObj.id);
      const indexFin = rutaFinData.paradas.findIndex(p => p.id === paradaFinObj.id);
      
      if (indexInicio === -1 || indexFin === -1) {
        throw new Error('No se encontraron las paradas seleccionadas');
      }

      const waypoints = [];
      const lineCoords = [];
      
      // 1. Obtener todas las paradas desde la seleccionada hasta el final en ruta inicio
      for (let i = indexInicio; i < rutaInicioData.paradas.length; i++) {
        waypoints.push({
          ...rutaInicioData.paradas[i],
          tipo: 'ruta-origen',
          rutaId: rutaInicio,
          esInicio: i === indexInicio,
          esFin: false
        });
        
        // Agregar coordenadas de la línea si existe
        if (i < rutaInicioData.paradas.length - 1) {
          const segmento = encontrarSegmentoLinea(
            rutaInicioData.lineas,
            rutaInicioData.paradas[i].coordinates,
            rutaInicioData.paradas[i + 1].coordinates
          );
          
          if (segmento) {
            lineCoords.push(...segmento);
          } else {
            lineCoords.push(rutaInicioData.paradas[i].coordinates);
          }
        }
      }
      
      // 2. Obtener todas las paradas desde el inicio hasta la seleccionada en ruta fin
      for (let i = 0; i <= indexFin; i++) {
        waypoints.push({
          ...rutaFinData.paradas[i],
          tipo: 'ruta-destino',
          rutaId: rutaFin,
          esInicio: false,
          esFin: i === indexFin
        });
        
        // Agregar coordenadas de la línea si existe
        if (i > 0) {
          const segmento = encontrarSegmentoLinea(
            rutaFinData.lineas,
            rutaFinData.paradas[i - 1].coordinates,
            rutaFinData.paradas[i].coordinates
          );
          
          if (segmento) {
            lineCoords.push(...segmento);
          } else {
            lineCoords.push(rutaFinData.paradas[i].coordinates);
          }
        }
      }

      // Encontrar paradas importantes para las instrucciones
      const ultimaParadaRutaInicio = rutaInicioData.paradas[rutaInicioData.paradas.length - 1];
      const primeraParadaRutaFin = rutaFinData.paradas[0];
      const nombreRutaInicio = rutas.find(r => r._id === rutaInicio)?.nombre || 'Ruta Origen';
      const nombreRutaFin = rutas.find(r => r._id === rutaFin)?.nombre || 'Ruta Destino';

      // Verificar si hay una parada de conexión común entre las rutas
      const paradaConexion = rutaInicioData.paradas.find(p1 => 
        rutaFinData.paradas.some(p2 => 
          p1.coordinates[0] === p2.coordinates[0] && 
          p1.coordinates[1] === p2.coordinates[1]
        )
      );

      // Generar instrucciones detalladas
      let textoInstrucciones = `
        <div class="bg-white p-4 rounded-lg shadow">
          <h3 class="font-bold text-lg mb-2 text-orange-600">Instrucciones de viaje</h3>
          <ol class="list-decimal pl-5 space-y-2">
            <li>
              <strong>Sube</strong> en la parada <strong>${paradaInicioObj.name}</strong> 
              (${nombreRutaInicio})
            </li>
      `;

      if (paradaConexion) {
        // Si hay una parada de conexión común
        textoInstrucciones += `
            <li>
              <strong>Baja</strong> en la parada <strong>${paradaConexion.name}</strong> 
              (Punto de conexión entre rutas)
            </li>
            <li>
              <strong>Sube</strong> en la misma parada <strong>${paradaConexion.name}</strong> 
              (${nombreRutaFin})
            </li>
        `;
      } else {
        // Si no hay parada común, usar la última de la primera ruta y primera de la segunda
        textoInstrucciones += `
            <li>
              <strong>Baja</strong> en la parada final <strong>${ultimaParadaRutaInicio.name}</strong> 
              (${nombreRutaInicio})
            </li>
            <li>
              <strong>Sube</strong> en la parada inicial <strong>${primeraParadaRutaFin.name}</strong> 
              (${nombreRutaFin})
            </li>
        `;
      }

      textoInstrucciones += `
            <li>
              <strong>Baja</strong> en tu destino <strong>${paradaFinObj.name}</strong>
            </li>
          </ol>
          <div class="mt-3 p-2 bg-orange-100 rounded">
            <strong>Recorrido total:</strong> ${waypoints.length} paradas
          </div>
        </div>
      `;

      setInstrucciones(textoInstrucciones);

      // Añadir las rutas completas como referencia
      if (rutaInicioData.lineas.length > 0) {
        mapRef.current.addSource('ruta-inicio', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: rutaInicioData.lineas.map(linea => ({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: linea.coordinates
              },
              properties: {}
            }))
          }
        });

        mapRef.current.addLayer({
          id: 'ruta-inicio',
          type: 'line',
          source: 'ruta-inicio',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 
            'line-color': '#FF9800',
            'line-width': 2,
            'line-opacity': 0.4
          }
        });
      }

      if (rutaFinData.lineas.length > 0) {
        mapRef.current.addSource('ruta-fin', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: rutaFinData.lineas.map(linea => ({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: linea.coordinates
              },
              properties: {}
            }))
          }
        });

        mapRef.current.addLayer({
          id: 'ruta-fin',
          type: 'line',
          source: 'ruta-fin',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 
            'line-color': '#2196F3',
            'line-width': 2,
            'line-opacity': 0.4
          }
        });
      }

      // Añadir la línea de conexión principal
      if (lineCoords.length >= 2) {
        mapRef.current.addSource('ruta-conexion', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: lineCoords
              },
              properties: {}
            }]
          }
        });

        mapRef.current.addLayer({
          id: 'ruta-conexion',
          type: 'line',
          source: 'ruta-conexion',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#9c27b0',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      }

      // Añadir marcadores para todas las paradas
      waypoints.forEach((wp) => {
        let color = '#4CAF50';
        let size = 6;
        
        if (wp.esInicio) {
          color = '#FF5722'; // Naranja para inicio
          size = 8;
        } else if (wp.esFin) {
          color = '#F44336'; // Rojo para fin
          size = 8;
        } else if (wp.tipo === 'ruta-origen') {
          color = '#FF9800'; // Amarillo/naranja para ruta origen
        } else {
          color = '#2196F3'; // Azul para ruta destino
        }
        
        const marker = new mapboxgl.Marker({ 
          color,
          scale: size/6
        })
          .setLngLat(wp.coordinates)
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<strong>${wp.name}</strong><br>
             Ruta: ${wp.rutaId}<br>
             ${wp.tipo === 'ruta-origen' ? 'Ruta Origen' : 'Ruta Destino'}`
          ))
          .addTo(mapRef.current);
          
        waypointMarkersRef.current.push(marker);
      });

      // Ajustar vista para mostrar todos los waypoints
      const bounds = new mapboxgl.LngLatBounds();
      waypoints.forEach(wp => bounds.extend(wp.coordinates));
      
      mapRef.current.fitBounds(bounds, {
        padding: {top: 50, bottom: 50, left: 50, right: 50},
        maxZoom: 14,
        duration: 1000
      });

      setError(null);
    } catch (error) {
      console.error('Error mostrando conexión:', error);
      setError(`Error al mostrar la conexión: ${error.message}`);
    }
  };

  // Mostrar conexión entre paradas seleccionadas
  const handleMostrarConexion = async () => {
    if (!paradaInicio || !paradaFin || !rutaInicio || !rutaFin) {
      setError('Selecciona paradas de inicio y fin con sus rutas correspondientes');
      return;
    }

    const [rutaInicioData, rutaFinData] = await Promise.all([
      !todasLasRutas[rutaInicio] ? cargarRuta(rutaInicio) : Promise.resolve(todasLasRutas[rutaInicio]),
      !todasLasRutas[rutaFin] ? cargarRuta(rutaFin) : Promise.resolve(todasLasRutas[rutaFin])
    ]);

    if (!rutaInicioData || !rutaFinData) {
      setError('Error al cargar los datos de las rutas seleccionadas');
      return;
    }

    const paradaInicioObj = rutaInicioData.paradas.find(p => p.id === paradaInicio);
    const paradaFinObj = rutaFinData.paradas.find(p => p.id === paradaFin);

    if (!paradaInicioObj || !paradaFinObj) {
      setError('No se encontraron las paradas seleccionadas');
      return;
    }

    mostrarConexionEntreRutas(paradaInicioObj, paradaFinObj);
  };

  // Mostrar segmento de ruta entre paradas A y B
  const handleMostrarSegmento = () => {
    if (!paradaA || !paradaB || !rutaSeleccionada) {
      setError('Selecciona ambas paradas para mostrar el segmento');
      return;
    }
    mostrarRutaCompleta(rutaSeleccionada, paradaA, paradaB);
  };

  // Limpiar el mapa
  const limpiarMapa = () => {
    if (!mapRef.current) return;
    
    waypointMarkersRef.current.forEach(marker => marker?.remove());
    waypointMarkersRef.current = [];
    setInstrucciones('');
    setShowHorarios(false);
    
    ['ruta', 'waypoints', 'waypoint-labels', 'ruta-conexion', 'waypoints-conexion', 'ruta-parcial', 'ruta-inicio', 'ruta-fin'].forEach(id => {
      if (mapRef.current.getLayer(id)) mapRef.current.removeLayer(id);
      if (mapRef.current.getSource(id)) mapRef.current.removeSource(id);
    });
    
    setError(null);
  };

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-80.98835, 8.11731],
      zoom: 13,
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapReady(true);
      setMapLoaded(true);

      map.on('mouseenter', 'waypoints', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', 'waypoints', () => {
        map.getCanvas().style.cursor = '';
      });

      setTimeout(() => {
        map.resize();
        map.triggerRepaint();
      }, 100);
    });

    const handleResize = () => {
      if (map) {
        map.resize();
        map.triggerRepaint();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (map) map.remove();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Cargar lista de rutas y paradas
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        // Cargar rutas
        const resRutas = await fetch(API_URL);
        const dataRutas = await resRutas.json();
        setRutas(Array.isArray(dataRutas) ? dataRutas : []);

        // Cargar paradas
        const resParadas = await fetch(API_PARADAS);
        const dataParadas = await resParadas.json();
        setParadas(Array.isArray(dataParadas) ? dataParadas : []);

        // Cargar horarios
        await cargarHorariosAPI();

        setError(null);
      } catch (err) {
        console.error('Error cargando datos iniciales:', err);
        setError('Error al cargar los datos iniciales');
      }
    };

    cargarDatosIniciales();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 bg-[#E0E7EF] rounded-2xl mt-6 shadow">
      <h1 className="text-2xl sm:text-3xl font-bold font-poppins text-center mb-6 text-orange-500">
        Sistema de Visualización de Rutas
      </h1>

      {/* Botones de modo */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
        <button
          className={`py-2 px-4 rounded-full font-poppins border-2 transition-all duration-300 ${
            activeTab === "ruta"
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-white text-orange-500 border-orange-500 hover:bg-orange-500 hover:text-white"
          }`}
          onClick={() => {
            setActiveTab("ruta");
            limpiarMapa();
          }}
        >
          Visualizar ruta
        </button>
        <button
          className={`py-2 px-4 rounded-full font-poppins border-2 transition-all duration-300 ${
            activeTab === "conexion"
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-white text-orange-500 border-orange-500 hover:bg-orange-500 hover:text-white"
          }`}
          onClick={() => {
            setActiveTab("conexion");
            limpiarMapa();
          }}
        >
          Conexión entre Rutas
        </button>
      </div>

      {/* Visualizar ruta */}
      {activeTab === "ruta" && (
        <div className="flex flex-col gap-4 mb-8">
          <input
            type="text"
            className="border border-gray-300 rounded-md p-2 font-poppins"
            placeholder="Buscar ruta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <select
            name="rutaSeleccionada"
            className="border border-gray-300 rounded-md p-2 font-poppins"
            value={rutaSeleccionada}
            onChange={(e) => handleSeleccionRuta(e.target.value)}
          >
            <option value="">Selecciona una opción</option>
            {rutas.map((ruta) => (
              <option key={ruta._id} value={ruta._id}>
                {ruta.nombre}
              </option>
            ))}
          </select>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block mb-1 font-poppins font-semibold">Parada A</label>
              <select
                className="border border-gray-300 rounded-md p-2 font-poppins w-full"
                value={paradaA}
                onChange={(e) => setParadaA(e.target.value)}
                disabled={!rutaSeleccionada}
              >
                <option value="">-- Parada A --</option>
                {rutaSeleccionada &&
                  todasLasRutas[rutaSeleccionada]?.paradas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-poppins font-semibold">Parada B</label>
              <select
                className="border border-gray-300 rounded-md p-2 font-poppins w-full"
                value={paradaB}
                onChange={(e) => setParadaB(e.target.value)}
                disabled={!rutaSeleccionada}
              >
                <option value="">-- Parada B --</option>
                {rutaSeleccionada &&
                  todasLasRutas[rutaSeleccionada]?.paradas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => rutaSeleccionada && mostrarRutaCompleta(rutaSeleccionada)}
              className="bg-orange-500 text-white font-poppins py-2 px-4 rounded-full hover:bg-orange-600 transition-all duration-300 w-full"
            >
              Mostrar ruta completa
            </button>
            <button
              onClick={handleMostrarSegmento}
              className="bg-white border-2 border-orange-500 text-orange-500 font-poppins py-2 px-4 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300 w-full"
            >
              Mostrar segmento A-B
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={mostrarUbicacionActual}
              className="bg-orange-500 text-white font-poppins py-2 px-4 rounded-full hover:bg-orange-600 transition-all duration-300 w-full"
            >
              Mostrar ubicación
            </button>
            <button
              onClick={quitarUbicacionActual}
              className="bg-white border-2 border-orange-500 text-orange-500 font-poppins py-2 px-4 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300 w-full"
            >
              Quitar ubicación
            </button>
            <button
              onClick={limpiarMapa}
              className="bg-gray-200 text-gray-700 font-poppins py-2 px-4 rounded-full hover:bg-gray-300 transition-all duration-300 w-full"
            >
              Limpiar Mapa
            </button>
          </div>
        </div>
      )}

      {/* Conexión entre rutas */}
      {activeTab === "conexion" && (
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <p className="font-poppins font-semibold mb-2">Ruta y Parada de Inicio</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                className="border border-gray-300 rounded-md p-2 font-poppins w-full"
                value={rutaInicio}
                onChange={(e) => handleSeleccionRutaConexion("inicio", e.target.value)}
              >
                <option value="">Selecciona una ruta</option>
                {rutas.map((ruta) => (
                  <option key={ruta._id} value={ruta._id}>
                    {ruta.nombre}
                  </option>
                ))}
              </select>
              <select
                className="border border-gray-300 rounded-md p-2 font-poppins w-full"
                value={paradaInicio}
                onChange={(e) => setParadaInicio(e.target.value)}
              >
                <option value="">Selecciona una parada</option>
                {todasLasRutas[rutaInicio]?.paradas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className="font-poppins font-semibold mb-2">Ruta y Parada de Fin</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                className="border border-gray-300 rounded-md p-2 font-poppins w-full"
                value={rutaFin}
                onChange={(e) => handleSeleccionRutaConexion("fin", e.target.value)}
              >
                <option value="">Selecciona una ruta</option>
                {rutas.map((ruta) => (
                  <option key={ruta._id} value={ruta._id}>
                    {ruta.nombre}
                  </option>
                ))}
              </select>
              <select
                className="border border-gray-300 rounded-md p-2 font-poppins w-full"
                value={paradaFin}
                onChange={(e) => setParadaFin(e.target.value)}
              >
                <option value="">Selecciona una parada</option>
                {todasLasRutas[rutaFin]?.paradas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleMostrarConexion}
            className="bg-orange-500 text-white font-poppins py-2 px-4 rounded-full hover:bg-orange-600 transition-all duration-300 w-full mb-2"
          >
            Mostrar Conexión entre Rutas
          </button>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={mostrarUbicacionActual}
              className="bg-orange-500 text-white font-poppins py-2 px-4 rounded-full hover:bg-orange-600 transition-all duration-300 w-full"
            >
              Mostrar ubicación
            </button>
            <button
              onClick={quitarUbicacionActual}
              className="bg-white border-2 border-orange-500 text-orange-500 font-poppins py-2 px-4 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300 w-full"
            >
              Quitar ubicación
            </button>
            <button
              onClick={limpiarMapa}
              className="bg-gray-200 text-gray-700 font-poppins py-2 px-4 rounded-full hover:bg-gray-300 transition-all duration-300 w-full"
            >
              Limpiar Mapa
            </button>
          </div>
        </div>
      )}

      {/* Instrucciones de conexión o información de ubicación */}
      {instrucciones && (
        <div 
          className="mt-4 p-4 bg-white rounded-lg shadow"
          dangerouslySetInnerHTML={{ __html: instrucciones }}
        />
      )}

      {/* Mostrar horarios cuando corresponda */}
      {showHorarios && renderHorarios()}

      {/* Mapa con overlay seguro */}
      <div className="relative w-full h-96 mt-4">
        {!mapLoaded && (
          <div className="absolute inset-0 bg-gray-300 rounded-xl flex items-center justify-center text-gray-500 font-poppins text-lg z-10">
            Cargando mapa...
          </div>
        )}
        <div
          ref={mapContainer}
          className="w-full h-full rounded-xl"
        />
      </div>

      {/* Sección de horarios */}
      <div className="mt-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Horarios de Rutas</h2>
        {renderHorarios()}
      </div>
    </div>
  );
}

export default App;