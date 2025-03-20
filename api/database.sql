-- สร้างฐานข้อมูล
CREATE DATABASE IF NOT EXISTS ocean_glass_qa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- เลือกฐานข้อมูล
USE ocean_glass_qa;

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- สร้างตารางข้อบกพร่องของล็อต (lot_defects)
CREATE TABLE IF NOT EXISTS lot_defects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    defect_code VARCHAR(20) NOT NULL,
    defect_count INT NOT NULL DEFAULT 0,
    FOREIGN KEY (lot_id) REFERENCES inspection_lots(id) ON DELETE CASCADE
);

-- สร้างตารางการวัดความเครียด (strain_measurements)
CREATE TABLE IF NOT EXISTS strain_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    position INT NOT NULL,
    value DECIMAL(10,2),
    FOREIGN KEY (lot_id) REFERENCES inspection_lots(id) ON DELETE CASCADE
);