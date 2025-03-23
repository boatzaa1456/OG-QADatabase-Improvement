<?php
/**
 * Base Controller
 * คลาสพื้นฐานสำหรับทุก Controller
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

abstract class BaseController {
    /**
     * Constructor
     */
    public function __construct() {
        // ตรวจสอบสิทธิ์ในการเข้าถึง API จะทำในอนาคต
    }
    
    /**
     * ดึงข้อมูลทั้งหมด (GET /controller)
     */
    public function index($id = null, $data = []) {
        throw new Exception("Method not implemented", 405);
    }
    
    /**
     * ดึงข้อมูลตาม ID (GET /controller/id)
     */
    public function get($id = null, $data = []) {
        if (!$id) {
            throw new Exception("ID is required", 400);
        }
        
        throw new Exception("Method not implemented", 405);
    }
    
    /**
     * สร้างข้อมูลใหม่ (POST /controller)
     */
    public function post($id = null, $data = []) {
        throw new Exception("Method not implemented", 405);
    }
    
    /**
     * อัพเดทข้อมูล (PUT /controller/id)
     */
    public function put($id = null, $data = []) {
        if (!$id) {
            throw new Exception("ID is required", 400);
        }
        
        throw new Exception("Method not implemented", 405);
    }
    
    /**
     * ลบข้อมูล (DELETE /controller/id)
     */
    public function delete($id = null, $data = []) {
        if (!$id) {
            throw new Exception("ID is required", 400);
        }
        
        throw new Exception("Method not implemented", 405);
    }
    
    /**
     * ตรวจสอบความถูกต้องของข้อมูล
     */
    protected function validate($data, $rules) {
        $errors = [];
        
        foreach ($rules as $field => $rule) {
            // ถ้าฟิลด์ไม่จำเป็น และไม่มีค่า
            if (!isset($data[$field]) || $data[$field] === '') {
                if (strpos($rule, 'required') !== false) {
                    $errors[$field] = "The $field field is required";
                }
                continue;
            }
            
            // ตรวจสอบกฎแต่ละข้อ
            $fieldRules = explode('|', $rule);
            
            foreach ($fieldRules as $fieldRule) {
                $params = [];
                
                // แยกพารามิเตอร์ (ถ้ามี)
                if (strpos($fieldRule, ':') !== false) {
                    list($fieldRule, $paramStr) = explode(':', $fieldRule);
                    $params = explode(',', $paramStr);
                }
                
                // ตรวจสอบตามกฎแต่ละข้อ
                switch ($fieldRule) {
                    case 'required':
                        if (!isset($data[$field]) || $data[$field] === '') {
                            $errors[$field] = "The $field field is required";
                        }
                        break;
                        
                    case 'email':
                        if (!filter_var($data[$field], FILTER_VALIDATE_EMAIL)) {
                            $errors[$field] = "The $field must be a valid email address";
                        }
                        break;
                        
                    case 'numeric':
                        if (!is_numeric($data[$field])) {
                            $errors[$field] = "The $field must be a number";
                        }
                        break;
                        
                    case 'min':
                        if (isset($params[0]) && strlen($data[$field]) < $params[0]) {
                            $errors[$field] = "The $field must be at least {$params[0]} characters";
                        }
                        break;
                        
                    case 'max':
                        if (isset($params[0]) && strlen($data[$field]) > $params[0]) {
                            $errors[$field] = "The $field may not be greater than {$params[0]} characters";
                        }
                        break;
                        
                    case 'date':
                        if (!strtotime($data[$field])) {
                            $errors[$field] = "The $field is not a valid date";
                        }
                        break;
                        
                    // เพิ่มกฎตรวจสอบอื่นๆ ตามต้องการ
                }
            }
        }
        
        return $errors;
    }
}
?>