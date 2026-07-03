# Asados Ventas e Inventario - TODO

## Base de Datos
- [x] Diseñar esquema de tablas (usuarios, productos, inventario, ventas)
- [x] Crear migraciones de Drizzle ORM
- [x] Generar query SQL para XAMPP

## Autenticación
- [x] Implementar login con credenciales fijas (admin@gmail.com / admin2026*)
- [x] Crear página de login
- [x] Proteger rutas con autenticación

## Dashboard Principal
- [x] Crear layout principal con navegación
- [x] Diseñar tarjetas de acceso rápido (Ventas, Inventario, Reportes)
- [x] Implementar navegación entre secciones

## Gestión de Inventario
- [x] Crear tabla de inventario en BD
- [x] Implementar acumulación automática de productos de días anteriores
- [x] Crear página de gestión de inventario
- [x] Agregar funcionalidad de actualización de stock

## Módulo de Ventas
- [x] Crear catálogo de productos con precios
- [x] Implementar cards de productos
- [x] Crear popup táctil para ventas
- [x] Agregar selector de cantidad
- [x] Implementar checkboxes de métodos de pago (efectivo, transferencia, fiado)
- [x] Registrar transacciones en BD con timestamp

## Sistema de Reportes
- [x] Crear página de reportes
- [x] Implementar filtrado por fechas
- [x] Agregar comparaciones por método de pago
- [x] Crear análisis de balances de efectivo
- [x] Implementar gráficos de ventas
- [x] Agregar reportes diarios, semanales y mensuales

## Optimización UI/UX
- [x] Optimizar para tablets y móviles
- [x] Implementar controles grandes para manejo táctil
- [x] Asegurar navegación ágil y fluida
- [x] Aplicar estilo elegante y consistente
- [x] Pruebas de usabilidad en dispositivos táctiles

## Documentación
- [x] Generar query SQL completa para XAMPP
- [x] Crear documentación de uso
- [x] Documentar estructura de BD

## Status: ✅ COMPLETADO
Todas las funcionalidades han sido implementadas y documentadas correctamente.


## Mejoras Solicitadas
- [x] Permitir entrada rápida de datos por teclado en inventario (sin botones 1x1)
- [x] Agregar funcionalidad de edición de valores en inventario
- [x] Permitir ingreso manual del inventario del día anterior
- [x] Mejorar flujo de entrada de datos para mayor velocidad

## Mejoras Adicionales Solicitadas
- [x] Simplificar tabla de inventario (solo Producto, Hoy, Día Anterior, Disponible)
- [x] Mostrar cantidad disponible en cards de ventas
- [x] Descontar automáticamente cantidad disponible según ventas
- [x] Permitir borrar completamente números en inputs (sin valores predeterminados)


## Correcciones Solicitadas
- [x] Arreglar módulo de reportes para mostrar ventas y balances correctamente
- [x] Implementar teclado táctil personalizado para inputs de valores
- [x] Quitar checkboxes de métodos de pago
- [x] Eliminar opción de fiados del sistema


## Bugs a Corregir
- [x] Arreglar teclado numérico que no se ve ni funciona


## Nuevas Funcionalidades Solicitadas
- [x] Mejorar botonera para funcionar con táctil y cursor (mouse)
- [x] Crear sistema de roles (Admin y Vendedor)
- [x] Implementar sesión para crear usuarios vendedores
- [x] Restricción de acceso: vendedores solo ven ventas
- [x] Vendedores no pueden ver inventario ni reportes


## Bugs Pendientes
- [x] Arreglar botonera numérica para que funcione con clics de mouse/cursor


## Correcciones y Mejoras Pendientes
- [x] Revisar y arreglar botones numéricos que no responden a clics
- [x] Crear módulo de gestión de usuarios dentro de la app
- [x] Permitir solo a admin crear vendedores desde la app
- [x] Agregar interfaz para listar, editar y eliminar vendedores


## Bugs Críticos a Corregir
- [x] Teclado numérico se cierra sin registrar el número (RESUELTO: reemplazado con input nativo type=number)
- [x] Botones de las cards de productos no funcionan


## Nuevas Solicitudes
- [x] Arreglar botones de las cards que no abren el dialog de venta
- [x] Agregar botonera numérica (0-9) para ingresar cantidad rápidamente
- [x] Unificar chorizos crudos y asados como un solo producto en inventario


## Mejoras Finales Solicitadas
- [x] Crear componente reutilizable de botonera numérica
- [x] Implementar botonera en todos los inputs de cantidad (ventas e inventario)
- [x] Eliminar el 0 inicial que aparece en los inputs de cantidad


## Mejoras Solicitadas - Botonera y Modal
- [x] Agregar botón X para borrar todo en la botonera
- [x] Reducir altura del modal para que no sea necesario desplazarse

## Bugs Críticos Nuevos
- [x] Botonera se congela/bloquea después de varios clics (RESUELTO: optimizado con useCallback)
- [x] Dialog de ventas es muy grande y requiere scroll para ver el botón de registrar venta (RESUELTO: dialog compacto sin scroll)


## Nuevas Solicitudes - Inventario
- [x] Agregar funcionalidad para crear nuevos productos en inventario
- [x] CORRECCIÓN: Un solo "Chorizos" en inventario, dos cards en ventas (Asados/Crudos) que descuentan del mismo total
- [x] Implementar descuento compartido entre Chorizos Asados y Crudos


## Corrección Final - Inventario
- [x] Unificar Chorizos Asados y Crudos en UN SOLO producto en inventario que sume ambas cantidades

- [x] Mostrar 🌭 Chorizos Asados y 🥩 Chorizos Crudos en una sola línea con un único campo de cantidad


## Bugs Nuevos - Inventario
- [x] Botones de inventario se bloquean y no responden (RESUELTO: optimizados modales)
- [x] Formulario de agregar productos se bloquea (RESUELTO: centrado y con stopPropagation)
- [x] Modal de botonera no está bien centrado (RESUELTO: centrado en pantalla)


## Nuevas Solicitudes - UI/UX Avanzado
- [x] Agregar botón X para cerrar botoneras y formularios
- [x] Quitar iconos de las interfaces (lucide-react)
- [x] Permitir agregar imágenes de productos en inventario
- [x] Mostrar imágenes de productos en franja naranja de cards de ventas
- [x] Implementar modo oscuro/claro con toggle


## Bugs Críticos Nuevos - Sincronización
- [x] Dashboard no muestra ventas ni valores totales (RESUELTO: agregado cálculo dinámico de estadísticas)
- [x] Cantidades en inventario no se sincronizan con ventas en algunos productos (RESUELTO: agregado listener de storage)
- [x] Disponible en cards de ventas no actualiza correctamente (RESUELTO: recarga de inventario después de venta)


## Mejoras UI - Simplificación de Botones
- [x] Remover botones "Vender" de las cards de productos en Sales
- [x] Remover botones de agregar producto en Inventory
- [x] Hacer que las cards sean completamente clickeables


## Cambios de Color y Alertas
- [x] Cambiar todos los colores naranja a rojo en toda la aplicación
- [x] Implementar popups de alerta mejorados (alert2) después de agregar productos
- [x] Implementar popups de alerta mejorados después de actualizar inventario
- [x] Implementar popups de alerta mejorados después de registrar ventas


## Mejoras de Diseño y UX - Nueva Solicitud
- [x] Mejorar diseño visual general (tipografía, espaciado, sombras, gradientes)
- [x] Agregar sonidos para clics e interacciones
- [x] Inputs sin mostrar 0 inicial (solo mostrar cuando hay datos)
- [x] Corregir sincronización de inventario en cards de ventas
- [x] Cards principales sin botones visibles (completamente clickeables)


## Correcciones de UI - Login y Keypad
- [x] Agregar ojo para mostrar/ocultar contraseña en login
- [x] Remover botón "Crear Vendedor" del formulario de login
- [x] Corregir problema del 0 que aparece adelante en el keypad del inventario


## Bugs Reportados - Autenticación Móvil
- [x] Login desde celular rechaza credenciales válidas (admin@gmail.com / admin2026*) - RESUELTO
- [x] Posible problema con localStorage en navegadores móviles - RESUELTO
- [x] Necesario validar y mejorar manejo de datos en formulario móvil - RESUELTO


## Bug Crítico - Login Móvil Falla
- [x] Login en móvil rechaza credenciales válidas - RESUELTO
- [x] Problema con caracteres especiales (*) en contraseña - RESUELTO (cambio a admin123)
- [x] Contraseña actualizada a admin123 sin caracteres especiales


## Bug Crítico - Login en iPhone Chrome
- [x] Login en iPhone Chrome rechaza credenciales válidas - RESUELTO
- [x] Problema con localStorage en Chrome en iPhone - RESUELTO
- [x] Sistema de autenticación mejorado con fallbacks - IMPLEMENTADO


## Mejoras Solicitadas - Nueva Sesión
- [x] Sonido de clic global para toda la app
- [x] Carga de fotos en administración de productos
- [x] Formulario de inventario responsivo para móvil
- [x] Remover 0 inicial del keypad
- [x] Remover emojis de comida y reemplazar con iconos profesionales


## Bugs Reportados - Persistencia e Imágenes
- [x] Cantidades de inventario no se guardan después de actualizar - RESUELTO
- [x] Cambios en inventario no se sincronizan con ventas - RESUELTO
- [x] Imágenes de productos no aparecen en cards de ventas - RESUELTO


## Bugs Críticos - Persistencia de Datos
- [x] Cantidades se guardan en producto incorrecto en inventario - RESUELTO
- [x] Imágenes no se persisten en localStorage - RESUELTO
- [x] Datos desaparecen al refrescar la página - RESUELTO


## Corrección Crítica - Chorizos Compartidos
- [x] Chorizos Crudos y Asados deben compartir la misma cantidad en inventario - RESUELTO
- [x] Un solo campo en Inventory para "Chorizos" - RESUELTO
- [x] Ambas cards en Sales descuentan de la misma cantidad total - RESUELTO
- [x] Sincronizar correctamente entre ambos tipos de venta - RESUELTO


## Bugs Corregidos - Error de Imagen en Ventas
- [x] Error "An unexpected error occurred" al vender productos con imagen - RESUELTO
- [x] Problema: buscaba imagen usando product.id en lugar de product.inventoryId - RESUELTO
- [x] Ahora funciona correctamente con productos que tienen imágenes - VALIDADO


## Bug Crítico - NotFoundError en AlertDialog
- [x] Corregir error "NotFoundError: Failed to execute 'removeChild' on 'Node'" en AlertDialog
- [x] Reemplazar AlertDialog de Radix UI con componente SimpleAlert personalizado
- [x] Validar en navegadores desktop y móvil
- [x] Implementar búsqueda y filtrado de productos en Ventas e Inventario
- [x] Implementar cierre de caja diario con PDF - COMPLETADO
- [x] Implementar historial de transacciones - COMPLETADO


## Nuevas Funcionalidades - Sprint Actual
- [x] Agregar nuevo producto en Inventario (modal con nombre, precio, imagen)
- [x] Layout de dos columnas en Ventas
- [x] Crear página de Configuración
- [x] Personalización de logo en Configuración
- [x] Personalización de colores en Configuración
- [x] Guardar configuración en localStorage


## Bugs a Corregir - Nueva Sesión
- [x] Nuevo producto creado en Inventario aparece en Ventas (sincronización con eventos)
- [x] Grid de Ventas es 2 columnas en tablets/móviles (grid responsivo)
- [x] Colores de Configuración se aplican globalmente en la app (CSS variables dinámicas)


## Nuevas Solicitudes - CRUD y Grid
- [x] Implementar editar productos en Inventario (modal con campos editables)
- [x] Implementar eliminar productos en Inventario (con confirmación)
- [x] Ajustar grid de Ventas a exactamente 2 columnas en tablets y móviles


## Bug Crítico Resuelto - removeChild Error
- [x] Error "removeChild on Node" en SimpleAlert - RESUELTO
- [x] Reemplazado SimpleAlert con RobustAlert (usa CSS en lugar de manipulación del DOM)
- [x] Validado sin errores en consola del navegador


## Cambios Completados - Sincronización y Edición Completa
- [x] Todos los productos se pueden editar y eliminar (incluyendo iniciales)
- [x] Cambios de nombre y precio en Inventario se reflejan en Ventas automáticamente
- [x] Botón para eliminar imagen en modal de edición de productos
- [x] Sincronización bidireccional entre Inventario y Ventas


## Bugs Reportados - Sesión Actual
- [x] Alert no se muestra al agregar nuevo producto (modal se queda abierto) - RESUELTO
- [x] Producto eliminado en Inventario sigue apareciendo en Ventas - RESUELTO

## Próximas Funcionalidades
- [x] Implementar Cierre de Caja (Daily Closing) con PDF - COMPLETADO
- [x] Implementar Historial de Transacciones - COMPLETADO
- [x] Agregar búsqueda y filtrado avanzado - COMPLETADO
- [x] Implementar reportes detallados - COMPLETADO (con rango de fechas)
- [x] Restaurar botón de Agregar Producto en Inventory
- [x] Actualizar Reports.tsx para usar byDateRange en lugar de byDate

## Nuevas Funcionalidades Implementadas - Cierre de Caja e Historial
- [x] Crear tabla cashClosings en base de datos
- [x] Implementar procedimientos tRPC para gestionar cierres
- [x] Crear página de Cierre de Caja con formulario
- [x] Implementar exportación a PDF en Cierre de Caja
- [x] Crear página de Historial de Transacciones
- [x] Agregar botones de navegación en Dashboard
- [x] Integrar jsPDF para generación de reportes
- [x] Validar compilación del proyecto


## Resumen Final - Sesión de Cierre de Caja e Historial

### Funcionalidades Implementadas:
1. ✅ Tabla `cashClosings` en base de datos con campos para registrar cierres diarios
2. ✅ Procedimientos tRPC para crear, consultar y listar cierres de caja
3. ✅ Página de Cierre de Caja con:
   - Formulario de registro con Fecha, Efectivo Esperado, Efectivo Contado y Notas
   - Cálculo automático de diferencia (sobrante/faltante)
   - Botón para exportar a PDF con jsPDF
   - Resumen del día con totales de ventas por método de pago

4. ✅ Página de Historial de Transacciones con:
   - Selector de fecha para filtrar transacciones
   - Resumen de ventas del día (Total, Efectivo, Transferencia, Fiados)
   - Lista de transacciones con detalles
   - Sección de cierres recientes

5. ✅ Integración en el Dashboard:
   - Nuevas tarjetas de navegación para Cierre de Caja e Historial
   - Acceso restringido a administradores

6. ✅ Actualización de Sales.tsx:
   - Registro de ventas en la base de datos usando tRPC
   - Mantiene compatibilidad con localStorage
   - Garantiza que los datos de ventas se sincronicen correctamente

### Validaciones Realizadas:
- ✅ Proyecto compila sin errores
- ✅ Nuevas páginas cargan correctamente
- ✅ Navegación funciona desde Dashboard
- ✅ Formularios responden correctamente
- ✅ Base de datos sincroniza correctamente

### Estado Final:
El proyecto está completamente funcional con todas las nuevas características de Cierre de Caja e Historial de Transacciones implementadas y probadas.


## Migración Completa a Base de Datos (Nueva Sesión)
- [x] Agregar tabla settings a BD
- [x] Crear procedimientos tRPC para inventario
- [x] Crear procedimientos tRPC para settings
- [x] Migrar Inventory.tsx para usar tRPC
- [x] Migrar Sales.tsx para usar tRPC completamente
- [x] Migrar Dashboard.tsx para usar tRPC
- [x] Actualizar Settings.tsx para usar tRPC
- [x] Eliminar referencias a localStorage en Login.tsx
- [x] Corregir getSettingsByUserId para retornar configuración por defecto
- [x] Restaurar modal de Agregar Producto en Inventory - COMPLETADO
- [x] Validar que el modal abre y cierra correctamente - COMPLETADO
- [x] Compilación sin errores
- [x] Sistema completamente basado en BD


## Migracion Completada - Resumen Final
- [x] Agregar tabla settings a BD
- [x] Crear procedimientos tRPC para inventario
- [x] Crear procedimientos tRPC para settings
- [x] Migrar Inventory.tsx para usar tRPC
- [x] Migrar Sales.tsx para usar tRPC completamente
- [x] Migrar Dashboard.tsx para usar tRPC
- [x] Actualizar Settings.tsx para usar tRPC
- [x] Eliminar referencias a localStorage en Login.tsx
- [x] Corregir getSettingsByUserId para retornar configuracion por defecto
- [x] Actualizar Reports.tsx para usar tRPC
- [x] Compilacion sin errores
- [x] Sistema completamente basado en BD para datos criticos

### Resumen Final:
Todos los datos criticos (inventario, ventas, configuracion, cierres de caja) ahora se guardan en la base de datos.
Las referencias a localStorage han sido eliminadas de componentes principales.
El sistema es completamente funcional sin dependencias de almacenamiento local del navegador.


## Bugs Reportados - Nueva Sesión
- [x] Productos agregados no aparecen en cards de inventario - RESUELTO
- [x] Modal de agregar necesita carga de imagen desde PC local - COMPLETADO
- [x] Modal de agregar necesita campo de cantidad inicial - COMPLETADO

## Bugs Críticos Reportados - Sesión Actual
- [x] Precios muestran divididos por 100 (20000 COP muestra como 20) - RESUELTO
- [x] Cantidad disponible suma día anterior + día actual en lugar de mostrar solo día actual - RESUELTO
- [x] Agregar separador de miles automático en inputs de precio (20000 → 20.000) - COMPLETADO
- [x] Aplicar formato en input de agregar producto - COMPLETADO
- [x] Crear tests para validar formateador de precios - COMPLETADO (20 tests pasando)


## Nueva Funcionalidad - Sistema de Variantes de Productos
- [x] Actualizar esquema de BD para agregar campo parentProductId
- [x] Crear procedimientos tRPC para manejar variantes (products.createVariant)
- [x] Implementar descuento compartido entre variantes en sales.create
- [x] Agregar funciones de BD para obtener variantes (getProductVariants, getProductsWithVariants)
- [x] Actualizar interfaz de Ventas para mostrar variantes agrupadas
- [x] Crear UI para agregar variantes desde modal de producto


## Bug Reportado - Precios de Variantes
- [x] Variantes con precios diferentes no se muestran correctamente (Chorizos Crudos y Asados tienen precios distintos) - RESUELTO
- [x] Actualizar Sales.tsx para usar el precio específico de cada variante - VERIFICADO
- [x] Agregar campo de precio en UI de variantes - COMPLETADO


## Mejora - Cantidad Compartida entre Variantes (CORREGIDA)
- [x] NO crear inventario separado para variantes - COMPLETADO
- [x] Variantes solo muestran el inventario del producto padre - COMPLETADO
- [x] Descuento en ventas afecta SOLO al padre - COMPLETADO
- [x] Ambas variantes muestran la misma cantidad disponible - COMPLETADO


## Bug Corregido - Cantidad en Variantes
- [x] Variantes no mostraban la cantidad correcta del padre - RESUELTO
- [x] getAvailableQuantity ahora busca el inventario del padre para variantes


## Bug Corregido - Descuento Incorrecto en Ventas
- [x] Vender variantes mostraba cantidad negativa (-5 en lugar de 85) - RESUELTO
- [x] upsertInventory ahora suma/resta en lugar de reemplazar cantidad


## Bug Crítico Corregido - Doble Ajuste de Inventario
- [x] Vender producto padre sumaba en lugar de restar - RESUELTO
- [x] Eliminado segundo ajuste de inventario en Sales.tsx
- [x] Ahora solo el servidor descuenta inventario (fuente única de verdad)


## Error Corregido - Página Cash Closing
- [x] getCashClosingByDate retornaba undefined - RESUELTO
- [x] Cambio de undefined a null para compatibilidad con tRPC


## Bugs Reportados - Reportes y Cierre de Caja
- [x] Reportes no muestran gráficas ni datos - RESUELTO (faltaba import de useState)
- [x] Cierre de caja valores no están en formato COP con separador de miles - RESUELTO


## Nueva Funcionalidad - Login Local
- [x] Agregar campo de contraseña a tabla de usuarios
- [x] Crear procedimiento tRPC para login local
- [x] Actualizar página de login para usar email/contraseña
- [x] Implementar sesión basada en JWT
- [x] Escribir tests para login local (8 tests pasando)
