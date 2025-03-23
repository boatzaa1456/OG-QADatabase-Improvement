-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS ocean_glass_qa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- เลือกฐานข้อมูล
USE ocean_glass_qa;

-- -----------------------------------------------------
-- ตารางระบบยืนยันตัวตนและการอนุญาต
-- -----------------------------------------------------

-- ตารางผู้ใช้งาน
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'supervisor', 'inspector', 'viewer') NOT NULL DEFAULT 'viewer',
    last_login DATETIME,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- ตารางสำหรับเก็บโทเค็น
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตารางสำหรับเก็บประวัติการเข้าใช้งาน
CREATE TABLE IF NOT EXISTS access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(100) NOT NULL,
    request_data TEXT,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- ตารางระบบ QA ที่มีอยู่แล้วแต่ปรับปรุงเพิ่มเติม
-- -----------------------------------------------------

-- สร้างตารางการตรวจสอบ (inspections)
CREATE TABLE IF NOT EXISTS inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_pt VARCHAR(20) NOT NULL,
    production_date DATE NOT NULL,
    shift CHAR(1) NOT NULL,
    item_number VARCHAR(20) NOT NULL,
    gauge_mark DECIMAL(10,2),
    production_type TINYINT NOT NULL,
    is_rework BOOLEAN DEFAULT FALSE,
    is_destroy BOOLEAN DEFAULT FALSE,
    use_jig BOOLEAN DEFAULT FALSE,
    no_jig BOOLEAN DEFAULT FALSE,
    machine_no VARCHAR(20) NOT NULL,
    total_product INT NOT NULL,
    sampling_date DATE NOT NULL,
    work_order VARCHAR(50) NOT NULL,
    operation VARCHAR(20),
    inspector VARCHAR(50) NOT NULL,
    supervisor VARCHAR(50) NOT NULL,
    remarks TEXT,
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_production_date (production_date),
    INDEX idx_item_number (item_number),
    INDEX idx_machine_no (machine_no),
    INDEX idx_shift (shift),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- สร้างตารางล็อตการตรวจสอบ (inspection_lots)
CREATE TABLE IF NOT EXISTS inspection_lots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_id INT NOT NULL,
    lot_number VARCHAR(20) NOT NULL,
    pieces_per_lot INT NOT NULL,
    description VARCHAR(100),
    pallet_no VARCHAR(20),
    strain_std DECIMAL(10,2),
    first_sample_size INT,
    first_sample_ac_re VARCHAR(20),
    second_sample_size INT,
    second_sample_ac_re VARCHAR(20),
    result VARCHAR(10),
    qp VARCHAR(20),
    strain_result VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_inspection_id (inspection_id),
    INDEX idx_lot_number (lot_number),
    INDEX idx_result (result),
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- สร้างตารางข้อบกพร่องของล็อต (lot_defects)
CREATE TABLE IF NOT EXISTS lot_defects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    defect_code VARCHAR(20) NOT NULL,
    defect_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lot_id (lot_id),
    INDEX idx_defect_code (defect_code),
    FOREIGN KEY (lot_id) REFERENCES inspection_lots(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- สร้างตารางการวัดความเครียด (strain_measurements)
CREATE TABLE IF NOT EXISTS strain_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    position INT NOT NULL,
    value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lot_id (lot_id),
    FOREIGN KEY (lot_id) REFERENCES inspection_lots(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- สร้างตารางเก็บประเภทข้อบกพร่อง (defect_types)
CREATE TABLE IF NOT EXISTS defect_types (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_id (category_id)
) ENGINE=InnoDB;

-- สร้างตารางเก็บหมวดหมู่ข้อบกพร่อง (defect_categories)
CREATE TABLE IF NOT EXISTS defect_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- สร้างข้อมูลหมวดหมู่ข้อบกพร่องเริ่มต้น
INSERT INTO defect_categories (id, name, description) VALUES
(1, 'ข้อบกพร่องที่ผิว (Surface Defects)', 'ข้อบกพร่องที่เกิดที่ผิวของผลิตภัณฑ์แก้ว'),
(2, 'ข้อบกพร่องรูปทรง (Shape Defects)', 'ข้อบกพร่องเกี่ยวกับรูปทรงของผลิตภัณฑ์แก้ว'),
(3, 'ข้อบกพร่องจากการผลิต (Manufacturing)', 'ข้อบกพร่องที่เกิดจากกระบวนการผลิต'),
(4, 'ข้อบกพร่องอื่นๆ (Others)', 'ข้อบกพร่องประเภทอื่นๆ');

-- สร้างข้อมูลประเภทข้อบกพร่องเริ่มต้น
INSERT INTO defect_types (id, name, category_id, description) VALUES
-- กลุ่มข้อบกพร่องที่ผิว (Surface Defects)
('D1019', 'Dirty body', 1, 'สิ่งสกปรกที่ติดบนผิวแก้ว'),
('D1052', 'Scratch', 1, 'รอยขีดข่วนบนผิวแก้ว'),
('D1001', 'Blister on surface', 1, 'ฟองอากาศที่ผิว'),
('D1002', 'Stone', 1, 'เศษหินหรือวัสดุแข็งในเนื้อแก้ว'),
('D1003', 'Check', 1, 'รอยร้าวเล็กๆ ที่ผิว'),
('D1004', 'Crack', 1, 'รอยแตกบนผิวแก้ว'),

-- กลุ่มข้อบกพร่องรูปทรง (Shape Defects)
('D2047', 'Rocker bottom', 2, 'ฐานไม่สมดุล'),
('D2012', 'Distorted', 2, 'รูปทรงผิดรูป'),
('D2015', 'Thin bottom', 2, 'ฐานบางเกินไป'),
('D2001', 'Uneven rim', 2, 'ขอบไม่เรียบ'),
('D2002', 'Warped', 2, 'บิดเบี้ยว'),

-- กลุ่มข้อบกพร่องจากการผลิต (Manufacturing Defects)
('D3106', 'Wrong Joint', 3, 'การเชื่อมต่อผิดพลาด'),
('D3024', 'Blister', 3, 'ฟองอากาศ'),
('D3001', 'Cold Mark', 3, 'รอยเย็น'),
('D3002', 'Cold Glass', 3, 'แก้วเย็นเกินไป'),
('D3003', 'Fold', 3, 'รอยพับ'),
('D3004', 'Glass Blob', 3, 'ก้อนแก้ว'),

-- กลุ่มข้อบกพร่องอื่นๆ (Others)
('D4099', 'Others', 4, 'ข้อบกพร่องอื่นๆ ที่ไม่ได้ระบุไว้');

-- สร้างผู้ใช้งานเริ่มต้น (รหัสผ่าน 'admin123')
INSERT INTO users (username, password, email, display_name, role) VALUES
('admin', '$2y$12$QL3ZdLfTrYoVMhWFcmyEOe3AqjKh2Qdm4VJWd1N5wNFHwBXfcLr0.', 'admin@oceanglass.com', 'ผู้ดูแลระบบ', 'admin');