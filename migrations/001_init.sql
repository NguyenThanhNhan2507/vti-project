-- Cấu trúc CSDL cho hệ thống CRM VTI

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin','manager','sales')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100),
  company VARCHAR(100),
  owner_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('call','email','meeting')),
  note TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Không xóa theo khách hàng: khách đang có cơ hội bán hàng thì không xóa được.
CREATE TABLE deals (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),
  title VARCHAR(150) NOT NULL,
  value NUMERIC(14,2) NOT NULL CHECK (value >= 0),
  stage VARCHAR(12) NOT NULL DEFAULT 'NEW' CHECK (stage IN ('NEW','CONSULTING','WON','LOST')),
  owner_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(50),
  target_id INT,
  created_at TIMESTAMP DEFAULT NOW()
);
