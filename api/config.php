<?php
// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    die('Direct access not permitted');
}

// กำหนดค่าการเชื่อมต่อฐานข้อมูล
define('DB_HOST', 'localhost');
define('DB_USER', 'root');     // เปลี่ยนเป็นชื่อผู้ใช้ MySQL ของคุณ
define('DB_PASS', '');         // เปลี่ยนเป็นรหัสผ่าน MySQL ของคุณ
define('DB_NAME', 'ocean_glass_qa'); // เปลี่ยนเป็นชื่อฐานข้อมูลที่ต้องการใช้

// ฟังก์ชันเชื่อมต่อฐานข้อมูล
function getConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    // ตรวจสอบการเชื่อมต่อ
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    
    // ตั้งค่า character set เป็น utf8 สำหรับรองรับภาษาไทย
    $conn->set_charset("utf8mb4");
    
    return $conn;
}
?>