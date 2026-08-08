-- Corregir el rol del usuario admin a 'admin'
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@gmail.com';

-- Verificar el cambio
SELECT id, openId, name, email, role FROM users WHERE email = 'admin@gmail.com';
