// Único archivo de datos simulados. Los servicios de src/services leen de aquí
// hasta que se conecte la API real.
//
// Fotos: todavía no existen fotos reales (PRODUCT.md). Por eso `fotos: []` y
// `foto: null`: las pantallas muestran FotoPendiente en su lugar.
import { FOTOS_DESTINOS } from '@/lib/fotos'
import type {
  Alojamiento,
  Destino,
  DetalleAlojamientoCompleto,
  EstiloViajeInfo,
  Resena,
  Subpuntuacion,
  TipoViajeResena,
} from '@/types/alojamientos'

/** Ecuador primero; después destinos de Latinoamérica de las pantallas de diseño. */
export const ciudades: Destino[] = [
  { id: 1, nombre: 'Quito', pais: 'ec', destacado: true, estilos: ['historicas', 'familia'], foto: FOTOS_DESTINOS['Quito'] },
  { id: 2, nombre: 'Cuenca', pais: 'ec', destacado: true, estilos: ['historicas', 'romantico'], foto: FOTOS_DESTINOS['Cuenca'] },
  { id: 3, nombre: 'Puerto Ayora', pais: 'ec', destacado: false, estilos: ['playa', 'familia', 'romantico'], foto: FOTOS_DESTINOS['Puerto Ayora'] },
  { id: 4, nombre: 'Baños', pais: 'ec', destacado: true, estilos: ['montana', 'familia', 'romantico'], foto: FOTOS_DESTINOS['Baños'] },
  { id: 5, nombre: 'Guayaquil', pais: 'ec', destacado: true, estilos: ['historicas', 'familia'], foto: FOTOS_DESTINOS['Guayaquil'] },
  { id: 6, nombre: 'Otavalo', pais: 'ec', destacado: false, estilos: ['montana', 'historicas'], foto: FOTOS_DESTINOS['Otavalo'] },
  { id: 7, nombre: 'Cartagena', pais: 'co', destacado: true, estilos: ['playa', 'historicas', 'romantico'], foto: FOTOS_DESTINOS['Cartagena'] },
  { id: 8, nombre: 'Cusco', pais: 'pe', destacado: false, estilos: ['historicas', 'montana'], foto: FOTOS_DESTINOS['Cusco'] },
  { id: 9, nombre: 'Bariloche', pais: 'ar', destacado: false, estilos: ['montana', 'familia'], foto: FOTOS_DESTINOS['Bariloche'] },
  { id: 10, nombre: 'Oaxaca', pais: 'mx', destacado: false, estilos: ['historicas'], foto: FOTOS_DESTINOS['Oaxaca'] },
  { id: 11, nombre: 'Punta del Este', pais: 'uy', destacado: false, estilos: ['playa', 'romantico'], foto: FOTOS_DESTINOS['Punta del Este'] },
  { id: 12, nombre: 'San Andrés', pais: 'co', destacado: false, estilos: ['playa', 'familia'], foto: FOTOS_DESTINOS['San Andrés'] },
]

/** Estilos del planificador de viajes. Sin endpoint en el backend. */
export const estilosViaje: EstiloViajeInfo[] = [
  { id: 'playa', etiqueta: 'Playa y relax' },
  { id: 'montana', etiqueta: 'Montaña y naturaleza' },
  { id: 'historicas', etiqueta: 'Ciudades históricas' },
  { id: 'romantico', etiqueta: 'Escapadas románticas' },
  { id: 'familia', etiqueta: 'Con familia' },
]

/** Habitaciones por alojamiento (en el backend: tabla habitaciones) */
export interface HabitacionMock {
  id: string
  alojamientoId: number
  nombre: string
  tipo: string
  capacidadAdultos: number
  capacidadNinos: number
  precioBase: number
  mealPlan: string | null
  cancellationType: string | null
  cupos: number
}

const uuid = (n: number) => `6b0f8a1e-0c1d-4a51-9a4c-1e2f3a4b5c${String(n).padStart(2, '0')}`

const habitacion = (
  n: number,
  alojamientoId: number,
  nombre: string,
  tipo: string,
  capacidadAdultos: number,
  capacidadNinos: number,
  precioBase: number,
  mealPlan: string | null,
  cancellationType: string | null,
  cupos: number,
): HabitacionMock => ({
  id: uuid(n),
  alojamientoId,
  nombre,
  tipo,
  capacidadAdultos,
  capacidadNinos,
  precioBase,
  mealPlan,
  cancellationType,
  cupos,
})

const libre = 'free_cancellation'
const sinReembolso = 'non_refundable'

export const habitaciones: HabitacionMock[] = [
  habitacion(1, 1, 'Habitación Patio', 'doble', 2, 0, 96, 'breakfast', libre, 3),
  habitacion(2, 1, 'Suite Cúpulas', 'suite', 2, 1, 138, 'breakfast', sinReembolso, 1),
  habitacion(3, 2, 'Habitación Río', 'doble', 2, 1, 74, null, libre, 4),
  habitacion(4, 2, 'Familiar Jardín', 'familiar', 3, 2, 112, 'breakfast', libre, 2),
  habitacion(5, 3, 'Vista Bahía', 'doble', 2, 1, 210, 'half_board', libre, 5),
  habitacion(6, 3, 'Villa Mangle', 'villa', 4, 2, 380, 'all_inclusive', sinReembolso, 1),
  habitacion(7, 4, 'Cabaña Volcán', 'cabaña', 2, 2, 88, 'breakfast', libre, 3),
  habitacion(8, 5, 'Habitación Río Guayas', 'doble', 2, 1, 78, 'breakfast', libre, 4),
  habitacion(9, 5, 'Suite Malecón', 'suite', 3, 1, 118, 'breakfast', libre, 2),
  habitacion(10, 6, 'Habitación Laguna', 'doble', 2, 1, 66, null, libre, 3),
  habitacion(11, 6, 'Cabaña Hacienda', 'cabaña', 4, 2, 104, 'breakfast', libre, 2),
  habitacion(12, 7, 'Habitación Mar', 'doble', 2, 1, 95, 'breakfast', libre, 4),
  habitacion(13, 7, 'Suite Murallas', 'suite', 3, 1, 150, 'breakfast', sinReembolso, 1),
  habitacion(14, 8, 'Dormitorio Andino', 'doble', 2, 0, 45, null, libre, 5),
  habitacion(15, 8, 'Habitación Familiar', 'familiar', 4, 2, 72, 'breakfast', libre, 2),
  habitacion(16, 9, 'Cabaña Bosque', 'cabaña', 4, 2, 80, null, libre, 3),
  habitacion(17, 9, 'Cabaña Lago', 'cabaña', 2, 1, 118, 'breakfast', sinReembolso, 1),
  habitacion(18, 10, 'Habitación Patio Colonial', 'doble', 2, 1, 70, 'breakfast', libre, 3),
  habitacion(19, 10, 'Suite Jardín', 'suite', 3, 1, 108, 'breakfast', libre, 2),
  habitacion(20, 11, 'Departamento Terraza', 'departamento', 4, 2, 120, null, libre, 3),
  habitacion(21, 11, 'Penthouse Mar', 'departamento', 5, 3, 210, null, sinReembolso, 1),
  habitacion(22, 12, 'Bungalow Playa', 'bungalow', 3, 1, 130, 'breakfast', libre, 3),
  habitacion(23, 12, 'Bungalow Familiar', 'bungalow', 5, 3, 190, 'half_board', libre, 2),
]

const cuantasHabitaciones = (alojamientoId: number) =>
  habitaciones.filter((h) => h.alojamientoId === alojamientoId).length

const ciudadDe = (id: number) => ciudades.find((c) => c.id === id) ?? null

type DatosAlojamiento = Pick<
  Alojamiento,
  'id' | 'nombre' | 'descripcion' | 'precioPorNoche' | 'capacidadAdultos' | 'capacidadNinos' | 'tienePiscina' | 'facilidades' | 'politicas'
> & {
  ciudadId: number
  actualizado: string
  tipo: string
  zona: string
  distanciaMetros: number
  estrellas: number
  puntuacion: number
  comentariosConteo: number
  fotos: string[]
  descuentoPorcentaje?: number
}

const alojamiento = (d: DatosAlojamiento): Alojamiento => {
  const ciudad = ciudadDe(d.ciudadId)
  return {
    id: d.id,
    nombre: d.nombre,
    destino: ciudad?.nombre ?? '',
    ciudadId: d.ciudadId,
    ciudad,
    descripcion: d.descripcion,
    moneda: 'USD',
    precioPorNoche: d.precioPorNoche,
    capacidadAdultos: d.capacidadAdultos,
    capacidadNinos: d.capacidadNinos,
    habitaciones: cuantasHabitaciones(d.id),
    tienePiscina: d.tienePiscina,
    fotos: d.fotos,
    facilidades: d.facilidades,
    politicas: d.politicas,
    activo: true,
    updatedAt: d.actualizado,
    tipo: d.tipo,
    zona: d.zona,
    distanciaMetros: d.distanciaMetros,
    estrellas: d.estrellas,
    puntuacion: d.puntuacion,
    comentariosConteo: d.comentariosConteo,
    descuentoPorcentaje: d.descuentoPorcentaje,
  }
}

const politicas = (checkin: string, checkout: string, mascotas: string) => ({
  checkin: `Desde las ${checkin}`,
  checkout: `Hasta las ${checkout}`,
  mascotas,
})

export const alojamientos: Alojamiento[] = [
  alojamiento({
    id: 1, ciudadId: 1, nombre: 'Casa Alameda',
    descripcion: 'Casona restaurada en el centro histórico, con patio interior y terraza hacia las cúpulas.',
    precioPorNoche: 96, capacidadAdultos: 2, capacidadNinos: 1, tienePiscina: false,
    facilidades: ['Wi-Fi', 'Desayuno incluido', 'Terraza', 'Recepción 24 h'],
    politicas: politicas('15:00', '12:00', 'No se admiten'), actualizado: '2026-10-01T12:00:00.000Z',
    tipo: 'Hotel boutique', zona: 'Centro Histórico', distanciaMetros: 300, estrellas: 4, puntuacion: 9.3, comentariosConteo: 148,
    descuentoPorcentaje: 20,
    fotos: [
      '/fotos/alojamientos/alojamiento-01-fachada.webp',
      '/fotos/alojamientos/alojamiento-02-habitacion.webp',
      '/fotos/alojamientos/alojamiento-04-interior.webp',
      '/fotos/alojamientos/alojamiento-08-terraza.webp',
      '/fotos/alojamientos/alojamiento-11-suite.webp',
    ],
  }),
  alojamiento({
    id: 2, ciudadId: 2, nombre: 'Río Tomebamba Lodge',
    descripcion: 'Habitaciones amplias junto al río, a pocos pasos de los puentes y museos de Cuenca.',
    precioPorNoche: 74, capacidadAdultos: 3, capacidadNinos: 2, tienePiscina: false,
    facilidades: ['Wi-Fi', 'Estacionamiento', 'Jardín', 'Admite mascotas'],
    politicas: politicas('14:00', '11:00', 'Se admiten'), actualizado: '2026-10-02T12:00:00.000Z',
    tipo: 'Lodge', zona: 'El Vado', distanciaMetros: 450, estrellas: 4, puntuacion: 9.1, comentariosConteo: 112,
    descuentoPorcentaje: 22,
    fotos: [
      '/fotos/alojamientos/alojamiento-02-habitacion.webp',
      '/fotos/alojamientos/alojamiento-04-interior.webp',
      '/fotos/alojamientos/alojamiento-06-habitacion.webp',
      '/fotos/alojamientos/alojamiento-08-terraza.webp',
    ],
  }),
  alojamiento({
    id: 3, ciudadId: 3, nombre: 'Mangle Azul Resort',
    descripcion: 'Resort frente a la bahía, con piscina infinita y excursiones a las islas cercanas.',
    precioPorNoche: 210, capacidadAdultos: 4, capacidadNinos: 2, tienePiscina: true,
    facilidades: ['Piscina', 'Wi-Fi', 'Spa', 'Restaurante', 'Vista al mar'],
    politicas: politicas('15:00', '11:00', 'No se admiten'), actualizado: '2026-10-03T12:00:00.000Z',
    tipo: 'Resort', zona: 'Bahía Academy', distanciaMetros: 800, estrellas: 5, puntuacion: 9.6, comentariosConteo: 240,
    fotos: [
      '/fotos/alojamientos/alojamiento-03-piscina.webp',
      '/fotos/alojamientos/alojamiento-09-piscina.webp',
      '/fotos/alojamientos/alojamiento-11-suite.webp',
      '/fotos/alojamientos/alojamiento-04-interior.webp',
    ],
  }),
  alojamiento({
    id: 4, ciudadId: 4, nombre: 'Refugio Tungurahua',
    descripcion: 'Cabañas de madera rodeadas de montaña, con termas privadas y vista al volcán.',
    precioPorNoche: 88, capacidadAdultos: 2, capacidadNinos: 2, tienePiscina: true,
    facilidades: ['Termas', 'Piscina', 'Wi-Fi', 'Desayuno incluido'],
    politicas: politicas('14:00', '12:00', 'Consultar'), actualizado: '2026-10-04T12:00:00.000Z',
    tipo: 'Cabaña', zona: 'Ruta de las Cascadas', distanciaMetros: 1200, estrellas: 4, puntuacion: 8.9, comentariosConteo: 95,
    descuentoPorcentaje: 18,
    fotos: [
      '/fotos/alojamientos/alojamiento-07-cabana.webp',
      '/fotos/alojamientos/alojamiento-03-piscina.webp',
      '/fotos/alojamientos/alojamiento-04-interior.webp',
    ],
  }),
  alojamiento({
    id: 5, ciudadId: 5, nombre: 'Casa del Malecón',
    descripcion: 'Habitaciones con vista al río Guayas, a pasos del malecón y de los cafés del centro.',
    precioPorNoche: 78, capacidadAdultos: 3, capacidadNinos: 1, tienePiscina: true,
    facilidades: ['Piscina', 'Wi-Fi', 'Aire acondicionado', 'Desayuno incluido'],
    politicas: politicas('14:00', '12:00', 'No se admiten'), actualizado: '2026-10-05T12:00:00.000Z',
    tipo: 'Hotel boutique', zona: 'Malecón 2000', distanciaMetros: 250, estrellas: 4, puntuacion: 8.8, comentariosConteo: 165,
    descuentoPorcentaje: 30,
    fotos: [
      '/fotos/alojamientos/alojamiento-05-fachada.webp',
      '/fotos/alojamientos/alojamiento-06-habitacion.webp',
      '/fotos/alojamientos/alojamiento-09-piscina.webp',
    ],
  }),
  alojamiento({
    id: 6, ciudadId: 6, nombre: 'Hacienda del Lago',
    descripcion: 'Hacienda de adobe con jardines y vista a la laguna, entre los talleres artesanos de la zona.',
    precioPorNoche: 66, capacidadAdultos: 4, capacidadNinos: 2, tienePiscina: false,
    facilidades: ['Wi-Fi', 'Jardín', 'Chimenea', 'Estacionamiento'],
    politicas: politicas('14:00', '11:00', 'Se admiten'), actualizado: '2026-10-05T12:00:00.000Z',
    tipo: 'Hacienda', zona: 'Lago San Pablo', distanciaMetros: 2500, estrellas: 4, puntuacion: 9.0, comentariosConteo: 84,
    fotos: [
      '/fotos/alojamientos/alojamiento-12-hacienda.webp',
      '/fotos/alojamientos/alojamiento-04-interior.webp',
      '/fotos/alojamientos/alojamiento-06-habitacion.webp',
    ],
  }),
  alojamiento({
    id: 7, ciudadId: 7, nombre: 'Hotel boutique frente al mar',
    descripcion: 'Hotel boutique dentro de la ciudad amurallada, con azotea y vista al mar Caribe.',
    precioPorNoche: 95, capacidadAdultos: 3, capacidadNinos: 1, tienePiscina: true,
    facilidades: ['Piscina', 'Wi-Fi', 'Azotea', 'Desayuno incluido', 'Aire acondicionado'],
    politicas: politicas('15:00', '12:00', 'No se admiten'), actualizado: '2026-10-06T12:00:00.000Z',
    tipo: 'Hotel boutique', zona: 'Ciudad Amurallada', distanciaMetros: 150, estrellas: 5, puntuacion: 9.5, comentariosConteo: 310,
    fotos: [
      '/fotos/alojamientos/alojamiento-08-terraza.webp',
      '/fotos/alojamientos/alojamiento-01-fachada.webp',
      '/fotos/alojamientos/alojamiento-03-piscina.webp',
      '/fotos/alojamientos/alojamiento-11-suite.webp',
    ],
  }),
  alojamiento({
    id: 8, ciudadId: 8, nombre: 'Hostal con vista a los Andes',
    descripcion: 'Hostal acogedor en una ladera con vista a los Andes, a diez minutos de la plaza principal.',
    precioPorNoche: 45, capacidadAdultos: 4, capacidadNinos: 2, tienePiscina: false,
    facilidades: ['Wi-Fi', 'Calefacción', 'Cocina compartida', 'Desayuno incluido'],
    politicas: politicas('13:00', '10:00', 'Se admiten'), actualizado: '2026-10-06T12:00:00.000Z',
    tipo: 'Hostal', zona: 'San Blas', distanciaMetros: 500, estrellas: 3, puntuacion: 8.6, comentariosConteo: 190,
    descuentoPorcentaje: 25,
    fotos: [
      '/fotos/alojamientos/alojamiento-06-habitacion.webp',
      '/fotos/alojamientos/alojamiento-04-interior.webp',
      '/fotos/alojamientos/alojamiento-02-habitacion.webp',
    ],
  }),
  alojamiento({
    id: 9, ciudadId: 9, nombre: 'Cabaña en el bosque',
    descripcion: 'Cabañas de madera entre pinos, con chimenea y vista al lago.',
    precioPorNoche: 80, capacidadAdultos: 4, capacidadNinos: 2, tienePiscina: false,
    facilidades: ['Chimenea', 'Wi-Fi', 'Cocina equipada', 'Estacionamiento'],
    politicas: politicas('15:00', '11:00', 'Se admiten'), actualizado: '2026-10-07T12:00:00.000Z',
    tipo: 'Cabaña', zona: 'Circuito Chico', distanciaMetros: 3500, estrellas: 4, puntuacion: 9.2, comentariosConteo: 130,
    fotos: [
      '/fotos/alojamientos/alojamiento-04-interior.webp',
      '/fotos/alojamientos/alojamiento-07-cabana.webp',
      '/fotos/alojamientos/alojamiento-02-habitacion.webp',
    ],
  }),
  alojamiento({
    id: 10, ciudadId: 10, nombre: 'Casona colonial con patio',
    descripcion: 'Casona del siglo pasado con patio central, fuente y habitaciones de techos altos.',
    precioPorNoche: 70, capacidadAdultos: 3, capacidadNinos: 1, tienePiscina: false,
    facilidades: ['Wi-Fi', 'Patio', 'Desayuno incluido', 'Recepción 24 h'],
    politicas: politicas('14:00', '12:00', 'No se admiten'), actualizado: '2026-10-07T12:00:00.000Z',
    tipo: 'Hotel boutique', zona: 'Centro Histórico', distanciaMetros: 200, estrellas: 4, puntuacion: 9.4, comentariosConteo: 175,
    descuentoPorcentaje: 15,
    fotos: [
      '/fotos/alojamientos/alojamiento-09-piscina.webp',
      '/fotos/alojamientos/alojamiento-05-fachada.webp',
      '/fotos/alojamientos/alojamiento-04-interior.webp',
      '/fotos/alojamientos/alojamiento-08-terraza.webp',
    ],
  }),
  alojamiento({
    id: 11, ciudadId: 11, nombre: 'Departamento con terraza al mar',
    descripcion: 'Departamentos amplios con terraza frente al mar y cocina completa.',
    precioPorNoche: 120, capacidadAdultos: 5, capacidadNinos: 3, tienePiscina: true,
    facilidades: ['Piscina', 'Wi-Fi', 'Cocina equipada', 'Terraza', 'Estacionamiento'],
    politicas: politicas('15:00', '11:00', 'Consultar'), actualizado: '2026-10-08T12:00:00.000Z',
    tipo: 'Apartamento', zona: 'Playa Mansa', distanciaMetros: 900, estrellas: 4, puntuacion: 9.1, comentariosConteo: 88,
    fotos: [
      '/fotos/alojamientos/alojamiento-11-suite.webp',
      '/fotos/alojamientos/alojamiento-08-terraza.webp',
      '/fotos/alojamientos/alojamiento-09-piscina.webp',
    ],
  }),
  alojamiento({
    id: 12, ciudadId: 12, nombre: 'Bungalow en la playa',
    descripcion: 'Bungalows de madera a pasos de la arena, con hamacas y desayuno frente al mar.',
    precioPorNoche: 130, capacidadAdultos: 5, capacidadNinos: 3, tienePiscina: false,
    facilidades: ['Acceso a la playa', 'Wi-Fi', 'Aire acondicionado', 'Desayuno incluido'],
    politicas: politicas('15:00', '11:00', 'No se admiten'), actualizado: '2026-10-08T12:00:00.000Z',
    tipo: 'Bungalow', zona: 'Playa Spratt Bight', distanciaMetros: 600, estrellas: 4, puntuacion: 9.0, comentariosConteo: 142,
    fotos: [
      '/fotos/alojamientos/alojamiento-10-bungalow.webp',
      '/fotos/alojamientos/alojamiento-03-piscina.webp',
      '/fotos/alojamientos/alojamiento-02-habitacion.webp',
    ],
  }),
]

/** Orden de los "Alojamientos destacados" del Inicio. Sin endpoint en el backend. */
export const idsDestacados: number[] = [7, 1, 3, 2, 10, 4]

/**
 * Descuentos de ejemplo para "Ofertas por tiempo limitado".
 * SIMULADOS: el backend no tiene ofertas. No presentar como reales.
 */
export const descuentosSimulados: { alojamientoId: number; descuentoPorcentaje: number }[] = [
  { alojamientoId: 1, descuentoPorcentaje: 20 },
  { alojamientoId: 2, descuentoPorcentaje: 22 },
  { alojamientoId: 8, descuentoPorcentaje: 25 },
  { alojamientoId: 4, descuentoPorcentaje: 18 },
  { alojamientoId: 10, descuentoPorcentaje: 15 },
  { alojamientoId: 5, descuentoPorcentaje: 30 },
]

const NOMBRES_RESENAS = ['Lucía', 'Andrés', 'Camila', 'Mateo', 'Valentina', 'Sebastián', 'Isabella', 'Diego', 'Sofía', 'Tomás', 'Martina', 'Joaquín']
const PAISES_RESENAS = ['Ecuador', 'Colombia', 'Argentina', 'Chile', 'México', 'Perú', 'Uruguay', 'España']
const TIPOS_VIAJE_RESENAS: TipoViajeResena[] = ['pareja', 'familia', 'solo', 'trabajo']
const TITULOS_RESENAS = [
  'Justo lo que buscábamos',
  'Un lugar para volver',
  'Muy buena ubicación y tranquilidad',
  'Cumple con todo y la atención es excelente',
  'Estancia impecable, superó expectativas',
  'Tranquilo, limpio y luminoso',
]
const COMENTARIOS_RESENAS = [
  'La habitación era amplia y estaba impecable. El personal nos recibió con mucha amabilidad y nos dio recomendaciones excelentes para caminar por la zona. Volveríamos sin dudarlo.',
  'Todo estuvo muy bien durante nuestra estancia. La cama era sumamente cómoda y el desayuno variado y fresco. El ambiente es silencioso para descansar.',
  'Buena relación entre precio y calidad. El espacio común es hermoso y las fotos son fieles a la realidad. Llegamos tarde y nos atendieron sin ningún contratiempo.',
  'Ideal para trabajar unos días con calma: conexión rápida de Wi-Fi, escritorio cómodo y silencio. El check-in fue ágil y el café delicioso.',
  'Nos encantó la ubicación y el cuidado en cada detalle. Desde la limpieza diaria hasta la cortesía del equipo en recepción. Muy recomendado.',
  'Hermosa vista y atmósfera relajante. Un lugar pensado para desconectar con tranquilidad y recorrer los alrededores con facilidad.',
]
const A_FAVOR_RESENAS = ['Ubicación y atención del personal', 'Limpieza y comodidad de la cama', 'Desayuno fresco y variado', 'Silencio y tranquilidad', 'Wi-Fi rápido y terraza']
const EN_CONTRA_RESENAS = ['Nada relevante que objetar', 'Estacionamiento algo estrecho', 'El check-out a las 11:00 se hace corto', 'Ninguno']

export function obtenerResenasMock(alojamientoId: number): Resena[] {
  const al = alojamientos.find((a) => a.id === alojamientoId)
  const puntBase = al?.puntuacion ?? 9.0
  const total = 7

  return Array.from({ length: total }, (_, i) => {
    const seed = (alojamientoId * 17 + i * 29) % 100
    const nombre = NOMBRES_RESENAS[(alojamientoId + i) % NOMBRES_RESENAS.length]
    const pais = PAISES_RESENAS[(alojamientoId * 2 + i) % PAISES_RESENAS.length]
    const tipoViaje = TIPOS_VIAJE_RESENAS[(i + alojamientoId) % TIPOS_VIAJE_RESENAS.length]
    const titulo = TITULOS_RESENAS[(i + alojamientoId) % TITULOS_RESENAS.length]
    const comentario = COMENTARIOS_RESENAS[(i * 2 + alojamientoId) % COMENTARIOS_RESENAS.length]
    const aFavor = A_FAVOR_RESENAS[(i + alojamientoId) % A_FAVOR_RESENAS.length]
    const enContra = EN_CONTRA_RESENAS[(i + alojamientoId) % EN_CONTRA_RESENAS.length]
    const punt = Math.min(10, Math.max(7.5, Math.round((puntBase + ((seed % 15) - 7) * 0.1) * 10) / 10))
    const fecha = new Date(2026, 8 - Math.floor(i * 0.9), 25 - (i * 3)).toISOString().split('T')[0]
    const utiles = (seed % 14) + 1

    return {
      id: `res-${alojamientoId}-${i + 1}`,
      alojamientoId,
      nombre,
      pais,
      fecha,
      tipoViaje,
      puntuacion: punt,
      titulo,
      comentario,
      aFavor,
      enContra,
      utiles,
    }
  })
}

export function obtenerSubpuntuacionesMock(alojamientoId: number): Subpuntuacion[] {
  const al = alojamientos.find((a) => a.id === alojamientoId)
  const p = al?.puntuacion ?? 9.0
  return [
    { nombre: 'Limpieza', puntuacion: Math.min(9.9, Math.round((p + 0.2) * 10) / 10) },
    { nombre: 'Ubicación', puntuacion: Math.min(9.9, Math.round((p + 0.1) * 10) / 10) },
    { nombre: 'Personal', puntuacion: Math.min(9.9, Math.round((p + 0.3) * 10) / 10) },
    { nombre: 'Relación calidad-precio', puntuacion: Math.min(9.9, Math.round((p - 0.1) * 10) / 10) },
    { nombre: 'Instalaciones', puntuacion: Math.min(9.9, Math.round(p * 10) / 10) },
  ]
}

export function obtenerDetalleCompletoMock(alojamientoId: number): DetalleAlojamientoCompleto | null {
  const al = alojamientos.find((a) => a.id === alojamientoId && a.activo)
  if (!al) return null
  return {
    ...al,
    subpuntuaciones: obtenerSubpuntuacionesMock(alojamientoId),
    resenas: obtenerResenasMock(alojamientoId),
  }
}
