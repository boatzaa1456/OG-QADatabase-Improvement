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
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_CHARSET', 'utf8mb4');

// กำหนดค่าคงที่สำหรับการเข้ารหัส
define('HASH_COST', 12); // สำหรับ password_hash()
define('AUTH_SECRET', getenv('AUTH_SECRET') ?: 'changeThisToASecureRandomStringInProduction');
define('TOKEN_EXPIRY', 3600); // 1 ชั่วโมง (หน่วยเป็นวินาที)

// เพิ่มค่า timeout สำหรับการเชื่อมต่อฐานข้อมูล
define('DB_CONNECT_TIMEOUT', 5); // 5 วินาที
define('DB_MAX_CONNECTIONS', 100); // จำนวนการเชื่อมต่อสูงสุด
define('DB_PERSISTENT', true); // ใช้การเชื่อมต่อแบบถาวร

// กำหนดค่า session
define('SESSION_LIFETIME', 7200); // 2 ชั่วโมง
ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
ini_set('session.cookie_httponly', 1); // ป้องกัน JavaScript เข้าถึง cookie
ini_set('session.use_only_cookies', 1); // ใช้เฉพาะ cookies ไม่ใช้ URL

// ตั้งค่า session ให้ปลอดภัยขึ้นใน production
if (APP_ENV === 'production') {
    ini_set('session.cookie_secure', 1); // ส่ง cookie เฉพาะผ่าน HTTPS
}

/**
 * เชื่อมต่อฐานข้อมูลด้วย PDO - ใช้ singleton pattern
 * @return PDO
 */
function getPDO() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = sprintf(
                "mysql:host=%s;port=%s;dbname=%s;charset=%s",
                DB_HOST,
                DB_PORT,
                DB_NAME,
                DB_CHARSET
            );
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => DB_PERSISTENT,
                PDO::ATTR_TIMEOUT => DB_CONNECT_TIMEOUT,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET,
                PDO::MYSQL_ATTR_FOUND_ROWS => true,
                // เพิ่มตัวเลือกเพื่อประสิทธิภาพ
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
                // ใช้ option cache เพื่อเพิ่มประสิทธิภาพ
                PDO::ATTR_STATEMENT_CLASS => ['PDOStatement']
            ];
            
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
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
    
    return $pdo;
}

/**
 * เชื่อมต่อฐานข้อมูลด้วย mysqli (สำหรับรองรับโค้ดเดิม)
 * @return mysqli
 */
function getConnection() {
    static $mysqli = null;
    
    if ($mysqli === null) {
        try {
            $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
            
            // ตรวจสอบการเชื่อมต่อ
            if ($mysqli->connect_error) {
                throw new Exception("Database connection failed: " . $mysqli->connect_error);
            }
            
            // ตั้งค่า character set เป็น utf8mb4 สำหรับรองรับภาษาไทย
            $mysqli->set_charset(DB_CHARSET);
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
    
    return $mysqli;
}

/**
 * ฟังก์ชันช่วยเหลือสำหรับป้องกัน XSS
 * @param mixed $data
 * @return mixed
 */
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

/**
 * ตรวจสอบสิทธิ์การเข้าถึง API
 * @return bool
 */
function checkApiAccess() {
    // เช็ค token และสิทธิ์การเข้าถึงที่นี่
    // ปัจจุบันยังใช้ระบบ auth.php แทน
    return true;
}

/**
 * สร้าง UUID เวอร์ชั่น 4
 * @return string
 */
function generateUuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        // 32 bits for "time_low"
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        
        // 16 bits for "time_mid"
        mt_rand(0, 0xffff),
        
        // 16 bits for "time_hi_and_version",
        // four most significant bits holds version number 4
        mt_rand(0, 0x0fff) | 0x4000,
        
        // 16 bits, 8 bits for "clk_seq_hi_res",
        // 8 bits for "clk_seq_low",
        // two most significant bits holds zero and one for variant DCE1.1
        mt_rand(0, 0x3fff) | 0x8000,
        
        // 48 bits for "node"
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * ฟังก์ชันเข้ารหัสข้อมูลอ่อนไหว
 * @param string $data
 * @return string
 */
function encryptSensitiveData($data) {
    $key = AUTH_SECRET;
    $method = 'aes-256-cbc';
    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length($method));
    $encrypted = openssl_encrypt($data, $method, $key, 0, $iv);
    return base64_encode($encrypted . '::' . $iv);
}

/**
 * ฟังก์ชันถอดรหัสข้อมูลอ่อนไหว
 * @param string $data
 * @return string
 */
function decryptSensitiveData($data) {
    $key = AUTH_SECRET;
    $method = 'aes-256-cbc';
    list($encrypted_data, $iv) = explode('::', base64_decode($data), 2);
    return openssl_decrypt($encrypted_data, $method, $key, 0, $iv);
}

/**
 * ล้างข้อมูลอินพุตเพื่อความปลอดภัย
 * @param mixed $data
 * @return mixed
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    
    if (is_string($data)) {
        $data = trim($data);
        $data = stripslashes($data);
        return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    }
    
    return $data;
}

// ตั้งค่า timezone
date_default_timezone_set('Asia/Bangkok');

// เริ่ม session ถ้ายังไม่เริ่ม
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>