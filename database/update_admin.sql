USE summariq_db;
-- Update admin email/password to requested values (password: Amitlove@143)
UPDATE admins SET email='araj821897@gmail.com', password_hash = '$2a$12$vGZeRH96J.SNBgbJE6x/2.ZV9Puftf/1cXaHNK7JxXHscdz00J8be' WHERE email = 'admin@roottolearn.app';