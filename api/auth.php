<?php
/**
 * Authentication and Authorization System
 * ระบบยืนยันตัวตนและตรวจสอบสิทธิ์
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

require_once 'models/User.php';

class Auth {
    /**
     * ตรวจสอบว่าผู้ใช้ได้เข้าสู่ระบบแล้วหรือยัง
     */
    public static function isAuthenticated() {
        // ตรวจสอบจาก session (สำหรับ web)
        if (isset($_SESSION['user_id']) && $_SESSION['user_id'] > 0) {
            return true;
        }
        
        // ตรวจสอบจาก token (สำหรับ API)
        $token = self::getBearerToken();
        if ($token) {
            return self::validateToken($token);
        }
        
        return false;
    }
    
    /**
     * ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึง controller และ action นี้หรือไม่
     */
    public static function checkAuthorization($controller, $action) {
        // ถ้าระบบยังไม่พร้อมใช้งาน ให้อนุญาตทุกอย่างก่อน
        if (APP_ENV === 'development') {
            return true; // อนุญาตทุกอย่างในโหมด development
        }
        
        // ถ้าไม่ได้เข้าสู่ระบบ จะไม่มีสิทธิ์เข้าถึง (ยกเว้น endpoint ที่ไม่ต้องยืนยันตัวตน)
        if (!self::isAuthenticated()) {
            $publicEndpoints = ['auth/login', 'auth/register', 'auth/reset'];
            $currentEndpoint = $controller . '/' . $action;
            
            return in_array($currentEndpoint, $publicEndpoints);
        }
        
        // ดึงข้อมูลผู้ใช้
        $user = self::getCurrentUser();
        if (!$user) {
            return false;
        }
        
        // ตรวจสอบสิทธิ์ตามบทบาท
        switch ($user['role']) {
            case 'admin':
                // Admin สามารถทำได้ทุกอย่าง
                return true;
            
            case 'supervisor':
                // Supervisor สามารถเข้าถึงทุกอย่างยกเว้นการจัดการผู้ใช้
                return $controller !== 'users' || $action !== 'delete';
            
            case 'inspector':
                // Inspector สามารถสร้างและดูการตรวจสอบ แต่แก้ไขได้เฉพาะของตัวเอง
                $allowedControllers = ['inspections', 'defects', 'profile'];
                return in_array($controller, $allowedControllers);
            
            case 'viewer':
                // Viewer สามารถดูข้อมูลได้เท่านั้น
                return $action === 'index' || $action === 'view' || $action === 'get';
            
            default:
                return false;
        }
    }
    
    /**
     * เข้าสู่ระบบ
     */
    public static function login($username, $password) {
        try {
            $db = getPDO();
            
            // ค้นหาผู้ใช้จาก username
            $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch();
            
            // ตรวจสอบว่าพบผู้ใช้หรือไม่
            if (!$user) {
                throw new Exception("Invalid username or password", 401);
            }
            
            // ตรวจสอบรหัสผ่าน
            if (!password_verify($password, $user['password'])) {
                // บันทึกการล็อกอินที่ล้มเหลว
                self::logAccess($user['id'], 'login', ['username' => $username], 'failed');
                throw new Exception("Invalid username or password", 401);
            }
            
            // สร้าง session สำหรับ web
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            
            // สร้าง token สำหรับ API
            $token = self::generateToken($user['id']);
            
            // บันทึกการล็อกอินที่สำเร็จ
            self::logAccess($user['id'], 'login', ['username' => $username], 'success');
            
            // อัพเดทเวลาล็อกอินล่าสุด
            $stmtUpdate = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $stmtUpdate->execute([$user['id']]);
            
            return [
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'display_name' => $user['display_name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ],
                'token' => $token
            ];
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    /**
     * ออกจากระบบ
     */
    public static function logout() {
        // ตรวจสอบว่ามีการล็อกอินหรือไม่
        if (isset($_SESSION['user_id'])) {
            $userId = $_SESSION['user_id'];
            
            // ลบ session
            session_destroy();
            
            // ลบ token
            $token = self::getBearerToken();
            if ($token) {
                self::revokeToken($token);
            }
            
            // บันทึกการออกจากระบบ
            self::logAccess($userId, 'logout', [], 'success');
            
            return true;
        }
        
        return false;
    }
    
    /**
     * สร้าง token สำหรับการยืนยันตัวตน
     */
    private static function generateToken($userId) {
        try {
            // สร้าง token
            $token = bin2hex(random_bytes(32));
            
            // กำหนดเวลาหมดอายุ
            $expiresAt = date('Y-m-d H:i:s', time() + TOKEN_EXPIRY);
            
            // บันทึก token ลงฐานข้อมูล
            $db = getPDO();
            $stmt = $db->prepare("INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $token, $expiresAt]);
            
            return $token;
        } catch (Exception $e) {
            throw new Exception("Cannot generate token: " . $e->getMessage());
        }
    }
    
    /**
     * ตรวจสอบความถูกต้องของ token
     */
    private static function validateToken($token) {
        try {
            $db = getPDO();
            
            // ค้นหา token ในฐานข้อมูล
            $stmt = $db->prepare("
                SELECT t.*, u.username, u.display_name, u.role 
                FROM auth_tokens t
                JOIN users u ON t.user_id = u.id
                WHERE t.token = ? AND t.expires_at > NOW() AND u.is_active = 1
            ");
            $stmt->execute([$token]);
            $tokenData = $stmt->fetch();
            
            // ถ้าไม่พบ token หรือหมดอายุแล้ว
            if (!$tokenData) {
                return false;
            }
            
            // ตั้งค่า session จาก token
            $_SESSION['user_id'] = $tokenData['user_id'];
            $_SESSION['username'] = $tokenData['username'];
            $_SESSION['role'] = $tokenData['role'];
            
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * เพิกถอน token
     */
    private static function revokeToken($token) {
        try {
            $db = getPDO();
            $stmt = $db->prepare("DELETE FROM auth_tokens WHERE token = ?");
            $stmt->execute([$token]);
            
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * ดึง Bearer Token จาก Header
     */
    private static function getBearerToken() {
        $headers = null;
        
        // ดึงจาก Authorization header
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER['Authorization']);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
        } else if (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(
                array_map('ucwords', array_keys($requestHeaders)),
                array_values($requestHeaders)
            );
            
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }
        
        // ถ้าไม่พบ Authorization header
        if (!$headers) {
            return null;
        }
        
        // แยก Bearer Token
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    /**
     * ดึงข้อมูลผู้ใช้ปัจจุบัน
     */
    public static function getCurrentUser() {
        // ถ้าไม่ได้ล็อกอิน
        if (!isset($_SESSION['user_id'])) {
            return null;
        }
        
        try {
            $userId = $_SESSION['user_id'];
            
            $db = getPDO();
            $stmt = $db->prepare("SELECT id, username, email, display_name, role FROM users WHERE id = ? AND is_active = 1");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            return $user ?: null;
        } catch (Exception $e) {
            return null;
        }
    }
    
    /**
     * บันทึกประวัติการเข้าใช้งาน
     */
    public static function logAccess($userId, $action, $data = [], $status = 'success') {
        try {
            $db = getPDO();
            
            // รับ IP ของผู้ใช้
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            
            // บันทึกข้อมูล
            $stmt = $db->prepare("
                INSERT INTO access_logs (user_id, ip_address, action, request_data, status)
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $requestData = json_encode($data);
            $stmt->execute([$userId, $ipAddress, $action, $requestData, $status]);
            
            return true;
        } catch (Exception $e) {
            // เพียงแค่บันทึกข้อผิดพลาด ไม่ต้องหยุดการทำงาน
            error_log("Cannot log access: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * สร้างรหัสผ่านแบบแฮช
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => HASH_COST]);
    }
}
?>