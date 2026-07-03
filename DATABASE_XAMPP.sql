-- ============================================================================
-- ASADOS VENTAS E INVENTARIO - ESTRUCTURA DE BASE DE DATOS PARA XAMPP
-- ============================================================================
-- Este archivo contiene la estructura completa de la base de datos
-- Compatible con MySQL/MariaDB en XAMPP
-- Importar en phpMyAdmin: Crear BD > Importar este archivo
-- ============================================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS asados_ventas;
USE asados_ventas;

-- ============================================================================
-- TABLA: users (Usuarios del sistema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_openId (openId),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: products (Catálogo de productos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INT NOT NULL COMMENT 'Precio en centavos para precisión',
  image TEXT COMMENT 'URL de imagen del producto',
  category VARCHAR(100) NOT NULL COMMENT 'asado, crudo, picada, choriperro, chuzo',
  active INT DEFAULT 1 COMMENT '1 = activo, 0 = inactivo',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: inventory (Gestión de inventario diario)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha del inventario',
  quantity INT NOT NULL COMMENT 'Cantidad disponible hoy',
  previousDayQuantity INT DEFAULT 0 COMMENT 'Acumulado del día anterior',
  sold INT DEFAULT 0 COMMENT 'Cantidad vendida',
  remaining INT NOT NULL COMMENT 'Cantidad restante',
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: sales (Registro de ventas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  quantity INT NOT NULL COMMENT 'Cantidad vendida',
  unitPrice INT NOT NULL COMMENT 'Precio unitario al momento de venta',
  totalPrice INT NOT NULL COMMENT 'Precio total de la venta',
  paymentMethod ENUM('efectivo', 'transferencia', 'fiado') NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_productId (productId),
  INDEX idx_date (date),
  INDEX idx_paymentMethod (paymentMethod)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: dailyBalance (Balances diarios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dailyBalance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  totalSales INT DEFAULT 0 COMMENT 'Total de ventas en pesos',
  cashSales INT DEFAULT 0 COMMENT 'Ventas en efectivo',
  transferSales INT DEFAULT 0 COMMENT 'Ventas por transferencia',
  creditSales INT DEFAULT 0 COMMENT 'Ventas fiadas',
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INSERTAR DATOS INICIALES
-- ============================================================================

-- Insertar usuario administrador
INSERT INTO users (openId, name, email, loginMethod, role) VALUES
('admin-001', 'Administrador', 'admin@gmail.com', 'local', 'admin');

-- Insertar productos con precios en centavos
INSERT INTO products (name, description, price, category, active) VALUES
('Chorizos Asados', 'Chorizos asados frescos', 600000, 'asado', 1),
('Chorizos Crudos', 'Chorizos crudos para cocinar', 350000, 'crudo', 1),
('Picadas', 'Tabla de picadas variadas', 2500000, 'picada', 1),
('Choriperros', 'Chorizos con pan tipo perro caliente', 700000, 'choriperro', 1),
('Chuzos', 'Chuzos de carne asada', 600000, 'chuzo', 1);

-- ============================================================================
-- VISTAS ÚTILES PARA REPORTES
-- ============================================================================

-- Vista: Resumen de ventas por día
CREATE OR REPLACE VIEW vw_daily_sales_summary AS
SELECT 
  DATE(s.date) as fecha,
  COUNT(*) as total_transacciones,
  SUM(s.totalPrice) as total_ventas,
  SUM(CASE WHEN s.paymentMethod = 'efectivo' THEN s.totalPrice ELSE 0 END) as ventas_efectivo,
  SUM(CASE WHEN s.paymentMethod = 'transferencia' THEN s.totalPrice ELSE 0 END) as ventas_transferencia,
  SUM(CASE WHEN s.paymentMethod = 'fiado' THEN s.totalPrice ELSE 0 END) as ventas_fiado
FROM sales s
GROUP BY DATE(s.date)
ORDER BY fecha DESC;

-- Vista: Resumen de productos vendidos
CREATE OR REPLACE VIEW vw_product_sales_summary AS
SELECT 
  p.id,
  p.name,
  p.price,
  COUNT(s.id) as veces_vendido,
  SUM(s.quantity) as cantidad_total,
  SUM(s.totalPrice) as ingresos_totales
FROM products p
LEFT JOIN sales s ON p.id = s.productId
WHERE p.active = 1
GROUP BY p.id, p.name, p.price
ORDER BY ingresos_totales DESC;

-- Vista: Detalles de ventas con información de productos
CREATE OR REPLACE VIEW vw_sales_detail AS
SELECT 
  s.id,
  s.date,
  p.name as producto,
  p.category,
  s.quantity,
  s.unitPrice,
  s.totalPrice,
  s.paymentMethod,
  DATE(s.date) as fecha
FROM sales s
JOIN products p ON s.productId = p.id
ORDER BY s.date DESC;

-- ============================================================================
-- PROCEDIMIENTOS ALMACENADOS ÚTILES
-- ============================================================================

-- Procedimiento: Obtener balance diario
DELIMITER //
CREATE PROCEDURE sp_get_daily_balance(IN p_date DATE)
BEGIN
  SELECT 
    p_date as fecha,
    COUNT(*) as total_transacciones,
    SUM(totalPrice) as total_ventas,
    SUM(CASE WHEN paymentMethod = 'efectivo' THEN totalPrice ELSE 0 END) as efectivo,
    SUM(CASE WHEN paymentMethod = 'transferencia' THEN totalPrice ELSE 0 END) as transferencia,
    SUM(CASE WHEN paymentMethod = 'fiado' THEN totalPrice ELSE 0 END) as fiado
  FROM sales
  WHERE DATE(date) = p_date;
END//
DELIMITER ;

-- Procedimiento: Obtener ventas por rango de fechas
DELIMITER //
CREATE PROCEDURE sp_get_sales_by_range(IN p_start_date DATE, IN p_end_date DATE)
BEGIN
  SELECT 
    DATE(s.date) as fecha,
    COUNT(*) as transacciones,
    SUM(s.totalPrice) as total_ventas,
    SUM(CASE WHEN s.paymentMethod = 'efectivo' THEN s.totalPrice ELSE 0 END) as efectivo,
    SUM(CASE WHEN s.paymentMethod = 'transferencia' THEN s.totalPrice ELSE 0 END) as transferencia,
    SUM(CASE WHEN s.paymentMethod = 'fiado' THEN s.totalPrice ELSE 0 END) as fiado
  FROM sales s
  WHERE DATE(s.date) BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(s.date)
  ORDER BY fecha DESC;
END//
DELIMITER ;

-- ============================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_sales_date_payment ON sales(date, paymentMethod);
CREATE INDEX idx_inventory_product_date ON inventory(productId, date);
CREATE INDEX idx_products_category_active ON products(category, active);

-- ============================================================================
-- COMENTARIOS Y NOTAS
-- ============================================================================
/*
INSTRUCCIONES DE USO EN XAMPP:

1. CREAR LA BASE DE DATOS:
   - Abrir phpMyAdmin (http://localhost/phpmyadmin)
   - Crear nueva base de datos: "asados_ventas"
   - Seleccionar la BD y ir a "Importar"
   - Seleccionar este archivo SQL y ejecutar

2. CREDENCIALES DE ACCESO:
   - Email: admin@gmail.com
   - Contraseña: admin2026*

3. ESTRUCTURA DE PRECIOS:
   - Los precios se almacenan en centavos (multiplicar por 100)
   - Ejemplo: $6000 = 600000 en la BD

4. MÉTODOS DE PAGO:
   - efectivo: Pago en efectivo
   - transferencia: Pago por transferencia bancaria
   - fiado: Venta a crédito

5. CONSULTAS ÚTILES:

   -- Ver todas las ventas del día
   SELECT * FROM vw_daily_sales_summary WHERE fecha = CURDATE();

   -- Ver resumen de productos
   SELECT * FROM vw_product_sales_summary;

   -- Obtener balance de un día específico
   CALL sp_get_daily_balance('2025-01-25');

   -- Obtener ventas entre fechas
   CALL sp_get_sales_by_range('2025-01-20', '2025-01-25');

   -- Ver detalles de ventas
   SELECT * FROM vw_sales_detail ORDER BY date DESC LIMIT 20;

   -- Totales por método de pago
   SELECT 
     paymentMethod,
     COUNT(*) as transacciones,
     SUM(totalPrice) as total
   FROM sales
   WHERE DATE(date) = CURDATE()
   GROUP BY paymentMethod;

6. MANTENIMIENTO:
   - Hacer backup regularmente
   - Limpiar datos antiguos mensualmente
   - Verificar integridad de datos semanalmente

*/
