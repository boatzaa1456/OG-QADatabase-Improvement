<?php
// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

// กำหนดค่าคงที่สำหรับการตั้งค่าระบบ
define('APP_VERSION', '2.0');
define('APP_NAME', 'Ocean Glass QA System');

// กำหนดค่าสภาพแวดล้อม (development, production)
$appEnv = getenv('APP_ENV') ?: 'development';
define('APP_ENV', $appEnv);

// กำหนดการแสดงข้อผิดพลาด
if (APP_ENV === 'development') {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    ini_set('display_startup_errors', 0);
    error_reporting(E_ERROR | E_PARSE);
}

// ตั้งค่าการบันทึกข้อผิดพลาด
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// สร้างโฟลเดอร์ logs ถ้ายังไม่มี
if (!file_exists(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}

// กำหนดค่าการเชื่อมต่อฐานข้อมูลจาก environment variables
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'ocean_glass_qa');

// กำหนดค่าคงที่สำหรับการเข้ารหัส
define('HASH_COST', 12); // สำหรับ password_hash()
define('AUTH_SECRET', getenv('AUTH_SECRET') ?: 'changeThisToASecureRandomStringInProduction');
define('TOKEN_EXPIRY', 3600); // 1 ชั่วโมง (หน่วยเป็นวินาที)

// เชื่อมต่อฐานข้อมูลโดยใช้ PDO แทน mysqli เพื่อความปลอดภัยและประสิทธิภาพที่ดีขึ้น
function getPDO() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ];
        
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        // บันทึกข้อผิดพลาดไว้ในไฟล์ log
        error_log("Database connection error: " . $e->getMessage());
        
        // ส่งคืนเป็น JSON แทนการแสดงข้อความ
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error', 
            'message' => APP_ENV === 'development' ? 
                'Database error: ' . $e->getMessage() : 
                'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาติดต่อผู้ดูแลระบบ'
        ]);
        exit;
    }
}

// คงฟังก์ชัน getConnection ไว้เพื่อความเข้ากันได้กับโค้ดเดิม แต่จะค่อยๆ ลดการใช้งาน
function getConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        // ตรวจสอบการเชื่อมต่อ
        if ($conn->connect_error) {
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        // ตั้งค่า character set เป็น utf8mb4 สำหรับรองรับภาษาไทย
        $conn->set_charset("utf8mb4");
        
        return $conn;
    } catch (Exception $e) {
        // บันทึกข้อผิดพลาดไว้ในไฟล์ log
        error_log("Database connection error: " . $e->getMessage());
        
        // ส่งคืนเป็น JSON แทนการแสดงข้อความ
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error', 
            'message' => APP_ENV === 'development' ? 
                'Database error: ' . $e->getMessage() : 
                'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาติดต่อผู้ดูแลระบบ'
        ]);
        exit;
    }
}

// ฟังก์ชันช่วยเหลือสำหรับป้องกัน XSS
function escapeHtml($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = escapeHtml($value);
        }
        return $data;
    }
    
    if (is_string($data)) {
        return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    }
    
    return $data;
}

// ฟังก์ชันตรวจสอบสิทธิ์การเข้าถึง API
function checkApiAccess() {
    // จะใช้ระบบ token หรือ API key ในอนาคต
    // ตอนนี้ return true เพื่อให้ทำงานได้โดยไม่มีการตรวจสอบ
    return true;
}
?>