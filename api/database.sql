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
    last_password_change DATETIME, -- เพิ่มคอลัมน์ติดตามการเปลี่ยนรหัสผ่าน
    failed_login_attempts INT DEFAULT 0, -- เพิ่มคอลัมน์นับความพยายามล็อกอินที่ล้มเหลว
    account_locked_until DATETIME NULL, -- เพิ่มคอลัมน์เวลาที่บัญชีถูกล็อค
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL, -- เพิ่มการติดตามผู้สร้างและผู้แก้ไข
    updated_by INT NULL,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- ตารางสำหรับเก็บโทเค็น
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NULL, -- เพิ่ม refresh token
    client_info VARCHAR(255) NULL,  -- เพิ่มข้อมูลเกี่ยวกับ client
    last_used_at DATETIME NULL,     -- เพิ่มการติดตามการใช้งานล่าสุด
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_refresh_token (refresh_token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ตารางสำหรับเก็บประวัติการเข้าใช้งาน
CREATE TABLE IF NOT EXISTS access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(255) NULL, -- เพิ่ม user agent
    action VARCHAR(100) NOT NULL,
    request_data TEXT,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status),
    INDEX idx_action (action),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ตารางเก็บข้อมูลการรีเซ็ตรหัสผ่าน
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_used TINYINT(1) DEFAULT 0,
    INDEX idx_email (email),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- ตารางเก็บข้อผิดพลาดของระบบ
CREATE TABLE IF NOT EXISTS error_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    context TEXT,
    ip_address VARCHAR(45),
    request_uri VARCHAR(255),
    severity VARCHAR(20) DEFAULT 'ERROR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved TINYINT(1) DEFAULT 0,
    INDEX idx_created_at (created_at),
    INDEX idx_severity (severity),
    INDEX idx_resolved (resolved)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- ตารางระบบ QA
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
    version INT DEFAULT 1, -- เพิ่มฟิลด์ version สำหรับ optimistic locking
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft', -- เพิ่มฟิลด์สถานะ
    approval_date DATETIME NULL, -- เพิ่มวันที่อนุมัติ
    approved_by INT NULL, -- เพิ่มผู้อนุมัติ
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_production_date (production_date),
    INDEX idx_item_number (item_number),
    INDEX idx_machine_no (machine_no),
    INDEX idx_shift (shift),
    INDEX idx_created_at (created_at),
    INDEX idx_work_order (work_order),
    INDEX idx_status (status),
    INDEX idx_inspector_created_at (inspector, created_at), -- เพิ่ม compound index
    INDEX idx_doc_pt (doc_pt),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
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
    version INT DEFAULT 1, -- เพิ่มฟิลด์ version สำหรับ optimistic locking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inspection_id (inspection_id),
    INDEX idx_lot_number (lot_number),
    INDEX idx_result (result),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- สร้างตารางข้อบกพร่องของล็อต (lot_defects)
CREATE TABLE IF NOT EXISTS lot_defects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    defect_code VARCHAR(20) NOT NULL,
    defect_count INT NOT NULL DEFAULT 0,
    defect_notes TEXT, -- เพิ่มฟิลด์สำหรับบันทึกรายละเอียดข้อบกพร่อง
    photo_path VARCHAR(255), -- เพิ่มฟิลด์เก็บเส้นทางรูปภาพ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL, -- เพิ่มผู้สร้างและผู้แก้ไข
    updated_by INT NULL,
    INDEX idx_lot_id (lot_id),
    INDEX idx_defect_code (defect_code),
    INDEX idx_defect_code_count (defect_code, defect_count), -- เพิ่ม compound index
    FOREIGN KEY (lot_id) REFERENCES inspection_lots(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- สร้างตารางการวัดความเครียด (strain_measurements)
CREATE TABLE IF NOT EXISTS strain_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    position INT NOT NULL,
    value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL, -- เพิ่มผู้สร้างและผู้แก้ไข
    updated_by INT NULL,
    INDEX idx_lot_id (lot_id),
    INDEX idx_position (position),
    INDEX idx_value (value),
    FOREIGN KEY (lot_id) REFERENCES inspection_lots(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- สร้างตารางเก็บประเภทข้อบกพร่อง (defect_types)
CREATE TABLE IF NOT EXISTS defect_types (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    description TEXT,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium', -- เพิ่มระดับความรุนแรง
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL, -- เพิ่มผู้สร้างและผู้แก้ไข
    updated_by INT NULL,
    INDEX idx_category_id (category_id),
    INDEX idx_is_active (is_active),
    INDEX idx_severity (severity),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- สร้างตารางเก็บหมวดหมู่ข้อบกพร่อง (defect_categories)
CREATE TABLE IF NOT EXISTS defect_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL, -- เพิ่มผู้สร้างและผู้แก้ไข
    updated_by INT NULL,
    INDEX idx_is_active (is_active),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ตารางประวัติการเปลี่ยนแปลงข้อมูล
CREATE TABLE IF NOT EXISTS change_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- ประเภทของข้อมูลที่เปลี่ยน (inspections, lots, etc.)
    entity_id INT NOT NULL, -- ID ของข้อมูลที่เปลี่ยน
    field_name VARCHAR(50) NOT NULL, -- ชื่อฟิลด์ที่เปลี่ยน
    old_value TEXT, -- ค่าเดิม
    new_value TEXT, -- ค่าใหม่
    change_type ENUM('insert', 'update', 'delete') NOT NULL, -- ประเภทการเปลี่ยนแปลง
    user_id INT, -- ผู้ใช้ที่ทำการเปลี่ยนแปลง
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_change_type (change_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- สร้างข้อมูลหมวดหมู่ข้อบกพร่องเริ่มต้น
INSERT INTO defect_categories (id, name, description) VALUES
(1, 'ข้อบกพร่องที่ผิว (Surface Defects)', 'ข้อบกพร่องที่เกิดที่ผิวของผลิตภัณฑ์แก้ว'),
(2, 'ข้อบกพร่องรูปทรง (Shape Defects)', 'ข้อบกพร่องเกี่ยวกับรูปทรงของผลิตภัณฑ์แก้ว'),
(3, 'ข้อบกพร่องจากการผลิต (Manufacturing)', 'ข้อบกพร่องที่เกิดจากกระบวนการผลิต'),
(4, 'ข้อบกพร่องอื่นๆ (Others)', 'ข้อบกพร่องประเภทอื่นๆ');

-- สร้างข้อมูลประเภทข้อบกพร่องเริ่มต้น
INSERT INTO defect_types (id, name, category_id, description, severity) VALUES
-- กลุ่มข้อบกพร่องที่ผิว (Surface Defects)
('D1019', 'Dirty body', 1, 'สิ่งสกปรกที่ติดบนผิวแก้ว', 'low'),
('D1052', 'Scratch', 1, 'รอยขีดข่วนบนผิวแก้ว', 'medium'),
('D1001', 'Blister on surface', 1, 'ฟองอากาศที่ผิว', 'medium'),
('D1002', 'Stone', 1, 'เศษหินหรือวัสดุแข็งในเนื้อแก้ว', 'high'),
('D1003', 'Check', 1, 'รอยร้าวเล็กๆ ที่ผิว', 'high'),
('D1004', 'Crack', 1, 'รอยแตกบนผิวแก้ว', 'critical'),

-- กลุ่มข้อบกพร่องรูปทรง (Shape Defects)
('D2047', 'Rocker bottom', 2, 'ฐานไม่สมดุล', 'high'),
('D2012', 'Distorted', 2, 'รูปทรงผิดรูป', 'medium'),
('D2015', 'Thin bottom', 2, 'ฐานบางเกินไป', 'high'),
('D2001', 'Uneven rim', 2, 'ขอบไม่เรียบ', 'medium'),
('D2002', 'Warped', 2, 'บิดเบี้ยว', 'medium'),

-- กลุ่มข้อบกพร่องจากการผลิต (Manufacturing Defects)
('D3106', 'Wrong Joint', 3, 'การเชื่อมต่อผิดพลาด', 'high'),
('D3024', 'Blister', 3, 'ฟองอากาศ', 'medium'),
('D3001', 'Cold Mark', 3, 'รอยเย็น', 'low'),
('D3002', 'Cold Glass', 3, 'แก้วเย็นเกินไป', 'medium'),
('D3003', 'Fold', 3, 'รอยพับ', 'medium'),
('D3004', 'Glass Blob', 3, 'ก้อนแก้ว', 'high'),

-- กลุ่มข้อบกพร่องอื่นๆ (Others)
('D4099', 'Others', 4, 'ข้อบกพร่องอื่นๆ ที่ไม่ได้ระบุไว้', 'medium');

-- สร้างผู้ใช้งานเริ่มต้น (รหัสผ่าน 'admin123')
INSERT INTO users (username, password, email, display_name, role, last_password_change) VALUES
('admin', '$2y$12$QL3ZdLfTrYoVMhWFcmyEOe3AqjKh2Qdm4VJWd1N5wNFHwBXfcLr0.', 'admin@oceanglass.com', 'ผู้ดูแลระบบ', 'admin', NOW());

-- สร้าง triggers สำหรับการบันทึกประวัติการเปลี่ยนแปลง

-- Trigger สำหรับการแก้ไขการตรวจสอบ
DELIMITER //
CREATE TRIGGER inspections_update_trigger
AFTER UPDATE ON inspections
FOR EACH ROW
BEGIN
    INSERT INTO change_logs (entity_type, entity_id, field_name, old_value, new_value, change_type, user_id)
    VALUES ('inspections', NEW.id, 'updated', 'Record updated', 'Record updated', 'update', NEW.updated_by);
END //
DELIMITER ;

-- Trigger สำหรับการลบการตรวจสอบ
DELIMITER //
CREATE TRIGGER inspections_delete_trigger
BEFORE DELETE ON inspections
FOR EACH ROW
BEGIN
    INSERT INTO change_logs (entity_type, entity_id, field_name, old_value, new_value, change_type, user_id)
    VALUES ('inspections', OLD.id, 'deleted', 'Record deleted', NULL, 'delete', @current_user_id);
END //
DELIMITER ;

-- สร้าง PROCEDURE สำหรับการล้างข้อมูลเก่า
DELIMITER //
CREATE PROCEDURE CleanupOldData()
BEGIN
    -- ลบ tokens ที่หมดอายุ
    DELETE FROM auth_tokens WHERE expires_at < NOW();
    
    -- ลบ password reset tokens ที่หมดอายุ
    DELETE FROM password_resets WHERE expires_at < NOW() OR is_used = 1;
    
    -- ทำความสะอาด logs ที่เก่ากว่า 1 ปี
    DELETE FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    
    -- ทำความสะอาด error logs ที่แก้ไขแล้วและเก่ากว่า 6 เดือน
    DELETE FROM error_logs 
    WHERE resolved = 1 
    AND created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
END //
DELIMITER ;

-- สร้าง EVENT สำหรับรันงานทำความสะอาดข้อมูลอัตโนมัติ
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_event
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    CALL CleanupOldData();
END //
DELIMITER ;