# Asados Ventas e Inventario - Documentación Completa

## 📋 Descripción General

**Asados Ventas e Inventario** es una aplicación web moderna y elegante diseñada para gestionar las ventas, inventario y reportes financieros de un negocio de chorizos y asados. La aplicación está completamente optimizada para dispositivos móviles y tablets, con una interfaz táctil intuitiva y controles grandes para un manejo rápido y eficiente.

---

## 🚀 Características Principales

### 1. **Autenticación Segura**
- Login con credenciales fijas (admin@gmail.com / admin2026*)
- Sesión persistente en localStorage
- Protección de rutas privadas

### 2. **Dashboard Principal**
- Interfaz elegante con tarjetas de navegación
- Acceso rápido a tres secciones principales: Ventas, Inventario y Reportes
- Estadísticas en tiempo real (ventas del día, efectivo, fiado)
- Logout seguro

### 3. **Módulo de Ventas**
- Catálogo visual de 5 productos con emojis
- Popup táctil para registrar ventas
- Selector de cantidad con botones + y -
- Métodos de pago: Efectivo, Transferencia, Fiado
- Cálculo automático de totales
- Registro de transacciones con timestamp

### 4. **Gestión de Inventario**
- Acumulación automática de productos del día anterior
- Gestión de stock por producto
- Visualización de cantidad disponible
- Seguimiento de productos vendidos
- Guardar cambios en la BD

### 5. **Sistema de Reportes**
- Filtrado por rango de fechas
- Gráficos de tendencia de ventas (línea)
- Análisis de métodos de pago (pastel)
- Comparación diaria de métodos de pago (barras)
- Tabla detallada de transacciones
- Estadísticas: totales, promedios, porcentajes

### 6. **Base de Datos Completa**
- Tablas para usuarios, productos, inventario, ventas y balances
- Vistas para reportes automáticos
- Procedimientos almacenados para consultas comunes
- Índices optimizados para rendimiento

---

## 💰 Catálogo de Productos

| Producto | Precio | Categoría |
|----------|--------|-----------|
| Chorizos Asados | $6.000 | asado |
| Chorizos Crudos | $3.500 | crudo |
| Picadas | $25.000 | picada |
| Choriperros | $7.000 | choriperro |
| Chuzos | $6.000 | chuzo |

---

## 🔐 Credenciales de Acceso

```
Email: admin@gmail.com
Contraseña: admin2026*
```

---

## 📱 Optimización para Dispositivos Táctiles

La aplicación está completamente optimizada para tablets y móviles:

- **Controles grandes**: Botones y campos de entrada con altura mínima de 44px
- **Espaciado generoso**: Márgenes y padding amplios para evitar toques accidentales
- **Interfaz responsiva**: Se adapta automáticamente a cualquier tamaño de pantalla
- **Navegación fluida**: Transiciones suaves y animaciones elegantes
- **Toque amigable**: Todos los elementos interactivos son fáciles de tocar

---

## 🎨 Diseño y Estilo

### Paleta de Colores
- **Color Principal**: Naranja (#EA580C) - Representa energía y vitalidad
- **Fondo**: Blanco y gradientes suaves
- **Texto**: Gris oscuro para legibilidad
- **Acentos**: Naranja para botones y elementos destacados

### Tipografía
- **Títulos**: Playfair Display (serif elegante)
- **Cuerpo**: Inter (sans-serif moderna)

### Tema Visual
- Diseño minimalista y elegante
- Tarjetas con sombras sutiles
- Gradientes suaves en encabezados
- Iconos de Lucide React para claridad

---

## 🗄️ Estructura de Base de Datos

### Tabla: `users`
Almacena información de usuarios del sistema.

```sql
id (PK)
openId (UNIQUE)
name
email
loginMethod
role (admin/user)
createdAt, updatedAt, lastSignedIn
```

### Tabla: `products`
Catálogo de productos disponibles.

```sql
id (PK)
name
description
price (en centavos)
image (URL)
category
active (1/0)
createdAt, updatedAt
```

### Tabla: `inventory`
Gestión diaria de inventario con acumulación automática.

```sql
id (PK)
productId (FK)
date
quantity (cantidad hoy)
previousDayQuantity (acumulado día anterior)
sold (cantidad vendida)
remaining (disponible)
notes
createdAt, updatedAt
```

### Tabla: `sales`
Registro de todas las transacciones de venta.

```sql
id (PK)
productId (FK)
quantity
unitPrice
totalPrice
paymentMethod (efectivo/transferencia/fiado)
date
notes
createdAt, updatedAt
```

### Tabla: `dailyBalance`
Balances consolidados por día.

```sql
id (PK)
date
totalSales
cashSales
transferSales
creditSales
notes
createdAt, updatedAt
```

---

## 📊 Vistas SQL para Reportes

### `vw_daily_sales_summary`
Resumen de ventas por día con desglose por método de pago.

### `vw_product_sales_summary`
Resumen de productos vendidos con ingresos totales.

### `vw_sales_detail`
Detalles completos de ventas con información de productos.

---

## 🔧 Procedimientos Almacenados

### `sp_get_daily_balance(p_date)`
Obtiene el balance completo de un día específico.

```sql
CALL sp_get_daily_balance('2025-01-25');
```

### `sp_get_sales_by_range(p_start_date, p_end_date)`
Obtiene ventas consolidadas entre dos fechas.

```sql
CALL sp_get_sales_by_range('2025-01-20', '2025-01-25');
```

---

## 🌐 Rutas de la Aplicación

| Ruta | Descripción | Autenticación |
|------|-------------|----------------|
| `/` | Página de login | No requerida |
| `/dashboard` | Dashboard principal | Requerida |
| `/sales` | Módulo de ventas | Requerida |
| `/inventory` | Gestión de inventario | Requerida |
| `/reports` | Sistema de reportes | Requerida |

---

## 💾 Instalación en XAMPP

### Paso 1: Crear la Base de Datos

1. Abrir phpMyAdmin: `http://localhost/phpmyadmin`
2. Crear nueva base de datos: `asados_ventas`
3. Seleccionar la BD y ir a "Importar"
4. Seleccionar el archivo `DATABASE_XAMPP.sql`
5. Ejecutar

### Paso 2: Verificar Datos Iniciales

```sql
-- Ver usuario admin
SELECT * FROM users WHERE email = 'admin@gmail.com';

-- Ver productos
SELECT * FROM products;
```

### Paso 3: Configurar Conexión

Si usa XAMPP local, la conexión debería ser:
```
Host: localhost
Usuario: root
Contraseña: (vacío)
Base de datos: asados_ventas
```

---

## 📈 Consultas SQL Útiles

### Ventas del día actual
```sql
SELECT * FROM vw_daily_sales_summary WHERE fecha = CURDATE();
```

### Resumen de productos
```sql
SELECT * FROM vw_product_sales_summary ORDER BY ingresos_totales DESC;
```

### Detalles de ventas recientes
```sql
SELECT * FROM vw_sales_detail LIMIT 20;
```

### Totales por método de pago (hoy)
```sql
SELECT 
  paymentMethod,
  COUNT(*) as transacciones,
  SUM(totalPrice) as total
FROM sales
WHERE DATE(date) = CURDATE()
GROUP BY paymentMethod;
```

### Comparación de ventas entre días
```sql
SELECT 
  DATE(date) as fecha,
  COUNT(*) as transacciones,
  SUM(totalPrice) as total
FROM sales
WHERE DATE(date) BETWEEN '2025-01-20' AND '2025-01-25'
GROUP BY DATE(date)
ORDER BY fecha DESC;
```

### Producto más vendido
```sql
SELECT 
  p.name,
  COUNT(s.id) as veces_vendido,
  SUM(s.quantity) as cantidad_total,
  SUM(s.totalPrice) as ingresos
FROM products p
LEFT JOIN sales s ON p.id = s.productId
WHERE DATE(s.date) = CURDATE()
GROUP BY p.id
ORDER BY ingresos DESC
LIMIT 1;
```

---

## 🔄 Flujo de Uso

### 1. **Inicio de Sesión**
- Ingresar con admin@gmail.com / admin2026*
- Se guarda la sesión en localStorage

### 2. **Dashboard**
- Ver estadísticas rápidas
- Acceder a Ventas, Inventario o Reportes

### 3. **Registrar Venta**
- Ir a Ventas
- Tocar la tarjeta del producto
- Seleccionar cantidad
- Elegir método de pago
- Registrar venta

### 4. **Gestionar Inventario**
- Ir a Inventario
- Actualizar cantidades del día
- Agregar productos del día anterior
- Guardar cambios

### 5. **Ver Reportes**
- Ir a Reportes
- Seleccionar rango de fechas
- Analizar gráficos y estadísticas
- Exportar datos si es necesario

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 19**: Framework de UI
- **TypeScript**: Tipado estático
- **Tailwind CSS 4**: Estilos responsive
- **Shadcn/ui**: Componentes UI reutilizables
- **Recharts**: Gráficos interactivos
- **Wouter**: Enrutamiento ligero
- **Sonner**: Notificaciones toast

### Backend
- **Express.js**: Servidor web
- **tRPC**: API type-safe
- **Drizzle ORM**: Acceso a BD
- **MySQL 2**: Driver de BD

### Base de Datos
- **MySQL/MariaDB**: RDBMS
- **Vistas SQL**: Reportes automáticos
- **Procedimientos**: Lógica de negocio

---

## 📝 Notas Importantes

1. **Precios en Centavos**: Todos los precios se almacenan en centavos en la BD para evitar problemas de precisión decimal.

2. **Acumulación Automática**: El sistema permite agregar chorizos del día anterior al inventario actual, facilitando el seguimiento de productos no vendidos.

3. **Métodos de Pago**: El sistema registra cada venta con su método de pago para análisis financiero detallado.

4. **Reportes en Tiempo Real**: Los gráficos y estadísticas se actualizan automáticamente con cada nueva venta.

5. **Respaldo de Datos**: Se recomienda hacer backup de la BD regularmente.

---

## 🐛 Solución de Problemas

### La aplicación no carga
- Verificar que el servidor está corriendo: `pnpm dev`
- Limpiar caché del navegador (Ctrl+Shift+Del)
- Verificar conexión a internet

### No puedo iniciar sesión
- Verificar credenciales exactas: admin@gmail.com / admin2026*
- Limpiar localStorage: Abrir DevTools > Application > Clear All
- Reintentar

### Los datos no se guardan
- Verificar conexión a la BD en XAMPP
- Revisar que la BD `asados_ventas` existe
- Verificar permisos de usuario en MySQL

### Gráficos no se muestran
- Actualizar la página (F5)
- Verificar que hay datos en la BD
- Revisar consola del navegador para errores

---

## 📞 Soporte

Para más información o reportar problemas:
- Revisar logs en la consola del navegador (F12)
- Verificar estado del servidor en terminal
- Consultar la documentación de las tecnologías utilizadas

---

## 📄 Licencia

Esta aplicación es de uso privado para gestión de negocio.

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2025  
**Desarrollado con ❤️ para tu negocio de asados**
