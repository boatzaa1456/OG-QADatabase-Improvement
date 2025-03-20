<?php
// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    // ส่งคืนเป็น JSON แทนการแสดงข้อความ
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

// กำหนดค่าการเชื่อมต่อฐานข้อมูล
define('DB_HOST', 'localhost');
define('DB_USER', 'root');     // เปลี่ยนเป็นชื่อผู้ใช้ MySQL ของคุณ
define('DB_PASS', '');         // เปลี่ยนเป็นรหัสผ่าน MySQL ของคุณ
define('DB_NAME', 'ocean_glass_qa'); // เปลี่ยนเป็นชื่อฐานข้อมูลที่ต้องการใช้

// ฟังก์ชันเชื่อมต่อฐานข้อมูล
function getConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        // ตรวจสอบการเชื่อมต่อ
        if ($conn->connect_error) {
            // ส่งคืนเป็น JSON แทนการแสดงข้อความ
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
            exit;
        }
        
        // ตั้งค่า character set เป็น utf8 สำหรับรองรับภาษาไทย
        $conn->set_charset("utf8mb4");
        
        return $conn;
    } catch (Exception $e) {
        // ส่งคืนเป็น JSON แทนการแสดงข้อความ
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
}
?>