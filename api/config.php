<?php
// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    // ส่งคืนเป็น JSON แทนการแสดงข้อความ
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

// กำหนดค่าการเชื่อมต่อฐานข้อมูลจาก environment variables
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'ocean_glass_qa');

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
        
        // ตั้งค่า character set เป็น utf8mb4 สำหรับรองรับภาษาไทย
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