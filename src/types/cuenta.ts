// Tipos de la cuenta del cliente conectados con el módulo auth/cuenta del backend.

/** Rol de la cuenta (usuarios.rol en el backend) */
export type RolUsuario = 'cliente' | 'administrador' | 'superadmin'

/** Estado de la cuenta (usuarios.estado). Solo una cuenta activa obtiene token. */
export type EstadoUsuario = 'pendiente' | 'activo' | 'suspendido'

export interface SesionCliente {
  id?: string
  nombre: string
  apellido: string
  correo: string
  /** Token JWT retornado por /auth/login */
  token?: string
  /** Iniciales para el avatar del menú de usuario, ej. "AP" */
  iniciales: string
  /** Rol y estado de /auth/login o /auth/me. Faltan en sesiones guardadas antes de que existieran. */
  rol?: RolUsuario
  estado?: EstadoUsuario
}

export interface DatosRegistro {
  nombre: string
  apellido: string
  correo: string
  contrasena: string
}

export interface DatosIngreso {
  correo: string
  contrasena: string
}
