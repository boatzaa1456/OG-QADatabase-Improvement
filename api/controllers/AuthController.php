<?php
/**
 * Auth Controller
 * ตัวควบคุมสำหรับการยืนยันตัวตนและสิทธิ์การเข้าถึง
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

require_once 'controllers/BaseController.php';
require_once 'models/User.php';

class AuthController extends BaseController {
    private $userModel;
    
    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct();
        $this->userModel = new User();
    }
    
    /**
     * เข้าสู่ระบบ
     */
    public function login($id = null, $data = []) {
        // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
        if (!isset($data['username']) || !isset($data['password'])) {
            throw new Exception("Username and password are required", 400);
        }
        
        // เข้าสู่ระบบ
        return Auth::login($data['username'], $data['password']);
    }
    
    /**
     * ออกจากระบบ
     */
    public function logout($id = null, $data = []) {
        Auth::logout();
        return ['message' => 'Logged out successfully'];
    }
    
    /**
     * ตรวจสอบสถานะการล็อกอินปัจจุบัน
     */
    public function status($id = null, $data = []) {
        if (!Auth::isAuthenticated()) {
            return ['authenticated' => false];
        }
        
        $user = Auth::getCurrentUser();
        
        return [
            'authenticated' => true,
            'user' => $user
        ];
    }
    
    /**
     * ลงทะเบียนผู้ใช้ใหม่
     */
    public function register($id = null, $data = []) {
        // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
        if (!isset($data['username']) || !isset($data['password']) || !isset($data['email']) || !isset($data['display_name'])) {
            throw new Exception("Username, password, email and display name are required", 400);
        }
        
        // ตรวจสอบรูปแบบอีเมล
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Invalid email format", 400);
        }
        
        // ตรวจสอบความยาวรหัสผ่าน
        if (strlen($data['password']) < 8) {
            throw new Exception("Password must be at least 8 characters long", 400);
        }
        
        // ตรวจสอบความแข็งแรงของรหัสผ่าน
        if (!preg_match('/[A-Z]/', $data['password']) || 
            !preg_match('/[a-z]/', $data['password']) || 
            !preg_match('/[0-9]/', $data['password'])) {
            throw new Exception("Password must contain at least one uppercase letter, one lowercase letter, and one number", 400);
        }
        
        // กำหนดบทบาทเริ่มต้นเป็น viewer
        $data['role'] = 'viewer';
        
        // สร้างผู้ใช้ใหม่
        $userId = $this->userModel->create($data);
        
        // ล็อกอินอัตโนมัติ
        $result = Auth::login($data['username'], $data['password']);
        
        return array_merge(['message' => 'Registration successful', 'user_id' => $userId], $result);
    }
    
    /**
     * เปลี่ยนรหัสผ่าน
     */
    public function changePassword($id = null, $data = []) {
        // ตรวจสอบว่าได้ล็อกอินแล้วหรือไม่
        if (!Auth::isAuthenticated()) {
            throw new Exception("You must be logged in to change password", 401);
        }
        
        $user = Auth::getCurrentUser();
        $userId = $user['id'];
        
        // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
        if (!isset($data['current_password']) || !isset($data['new_password']) || !isset($data['confirm_password'])) {
            throw new Exception("Current password, new password and confirm password are required", 400);
        }
        
        // ตรวจสอบว่ารหัสผ่านใหม่และยืนยันรหัสผ่านตรงกันหรือไม่
        if ($data['new_password'] !== $data['confirm_password']) {
            throw new Exception("New password and confirm password do not match", 400);
        }
        
        // ตรวจสอบความยาวรหัสผ่าน
        if (strlen($data['new_password']) < 8) {
            throw new Exception("Password must be at least 8 characters long", 400);
        }
        
        // ตรวจสอบความแข็งแรงของรหัสผ่าน
        if (!preg_match('/[A-Z]/', $data['new_password']) || 
            !preg_match('/[a-z]/', $data['new_password']) || 
            !preg_match('/[0-9]/', $data['new_password'])) {
            throw new Exception("Password must contain at least one uppercase letter, one lowercase letter, and one number", 400);
        }
        
        // เปลี่ยนรหัสผ่าน
        $this->userModel->changePassword($userId, $data['current_password'], $data['new_password']);
        
        return ['message' => 'Password changed successfully'];
    }
    
    /**
     * ขอรีเซ็ตรหัสผ่าน
     */
    public function resetPassword($id = null, $data = []) {
        // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
        if (!isset($data['email'])) {
            throw new Exception("Email is required", 400);
        }
        
        // ตรวจสอบรูปแบบอีเมล
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Invalid email format", 400);
        }
        
        // ตรวจสอบว่ามีผู้ใช้กับอีเมลนี้หรือไม่
        $user = $this->userModel->getByField('email', $data['email']);
        
        if (!$user) {
            // คืนค่าเดียวกันกับกรณีที่พบผู้ใช้ เพื่อไม่ให้หลุดข้อมูลว่ามีอีเมลนี้ในระบบหรือไม่
            return ['message' => 'If your email is in our system, you will receive a password reset link shortly'];
        }
        
        // TODO: ส่งอีเมลรีเซ็ตรหัสผ่าน
        // ในที่นี้จะยังไม่ทำฟังก์ชันนี้ แต่จะเตรียมโครงสร้างไว้
        
        return ['message' => 'If your email is in our system, you will receive a password reset link shortly'];
    }
}
?>