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
    // กฎสำหรับตรวจสอบความถูกต้องของข้อมูล
    protected static $validationRules = [
        'docPT' => ['required', 'max:20'],
        'productionDate' => ['required', 'date'],
        'shift' => ['required', 'in:M,A,N'],
        'itemNumber' => ['required', 'max:20'],
        'machineNo' => ['required', 'max:20'],
        'totalProduct' => ['required', 'numeric'],
        'samplingDate' => ['required', 'date'],
        'workOrder' => ['required', 'max:50'],
        'inspector' => ['required', 'max:50'],
        'supervisor' => ['required', 'max:50'],
        'email' => ['email'],
        'password' => ['min:8'],
        'username' => ['required', 'max:50']
    ];
    
    /**
     * Constructor
     */
    public function __construct() {
        // ตรวจสอบ CSRF token สำหรับ POST, PUT, DELETE requests
        $this->checkCsrfToken();
    }
    
    /**
     * ตรวจสอบ CSRF token
     */
    protected function checkCsrfToken() {
        // ไม่ตรวจสอบ CSRF สำหรับ GET requests
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            return true;
        }
        
        // ไม่ตรวจสอบ CSRF สำหรับการเรียกใช้ API ที่ใช้ Bearer token
        if (self::getBearerToken()) {
            return true;
        }
        
        // ตรวจสอบ CSRF token สำหรับ form submissions
        $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        
        if (!$token || !Auth::validateCsrfToken($token)) {
            throw new Exception("CSRF token is invalid or missing", 403);
        }
        
        return true;
    }
    
    /**
     * ดึง Bearer Token จาก Header
     */
    protected static function getBearerToken() {
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
     * สร้าง CSRF token และให้ค่าเพื่อใช้ในฟอร์ม
     */
    public function generateCsrfToken() {
        return Auth::generateCsrfToken();
    }
    
    /**
     * ตรวจสอบความถูกต้องของข้อมูล
     */
    protected function validate($data, $rules = []) {
        $errors = [];
        
        // ถ้าไม่ได้กำหนดกฎเฉพาะ ใช้กฎตามชื่อฟิลด์
        if (empty($rules)) {
            foreach ($data as $field => $value) {
                if (isset(self::$validationRules[$field])) {
                    $rules[$field] = self::$validationRules[$field];
                }
            }
        }
        
        foreach ($rules as $field => $fieldRules) {
            // ถ้า rules เป็น string ให้แปลงเป็น array
            if (is_string($fieldRules)) {
                $fieldRules = explode('|', $fieldRules);
            }
            
            // ถ้า field ไม่มีในข้อมูล
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                // ถ้าจำเป็นต้องมี
                if (in_array('required', $fieldRules)) {
                    $errors[$field] = "The $field field is required";
                }
                // ถ้าไม่จำเป็นและไม่มีข้อมูล ให้ข้ามการตรวจสอบอื่นๆ
                continue;
            }
            
            // ตรวจสอบตามกฎ
            foreach ($fieldRules as $rule) {
                // แยกกฎที่มีพารามิเตอร์ เช่น max:255
                $parameters = [];
                
                if (strpos($rule, ':') !== false) {
                    list($ruleName, $paramStr) = explode(':', $rule, 2);
                    $parameters = explode(',', $paramStr);
                } else {
                    $ruleName = $rule;
                }
                
                // ตรวจสอบตามกฎ
                switch ($ruleName) {
                    case 'required':
                        // ตรวจสอบแล้วข้างบน
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
                        
                    case 'integer':
                        if (!filter_var($data[$field], FILTER_VALIDATE_INT)) {
                            $errors[$field] = "The $field must be an integer";
                        }
                        break;
                        
                    case 'min':
                        if (isset($parameters[0])) {
                            if (is_string($data[$field]) && mb_strlen($data[$field]) < $parameters[0]) {
                                $errors[$field] = "The $field must be at least {$parameters[0]} characters";
                            } else if (is_numeric($data[$field]) && $data[$field] < $parameters[0]) {
                                $errors[$field] = "The $field must be at least {$parameters[0]}";
                            }
                        }
                        break;
                        
                    case 'max':
                        if (isset($parameters[0])) {
                            if (is_string($data[$field]) && mb_strlen($data[$field]) > $parameters[0]) {
                                $errors[$field] = "The $field may not be greater than {$parameters[0]} characters";
                            } else if (is_numeric($data[$field]) && $data[$field] > $parameters[0]) {
                                $errors[$field] = "The $field may not be greater than {$parameters[0]}";
                            }
                        }
                        break;
                        
                    case 'date':
                        if (!strtotime($data[$field])) {
                            $errors[$field] = "The $field is not a valid date";
                        }
                        break;
                        
                    case 'in':
                        if (isset($parameters[0])) {
                            $allowedValues = explode(',', $parameters[0]);
                            if (!in_array($data[$field], $allowedValues)) {
                                $errors[$field] = "The selected $field is invalid. Allowed values: " . implode(', ', $allowedValues);
                            }
                        }
                        break;
                        
                    case 'regex':
                        if (isset($parameters[0])) {
                            if (!preg_match($parameters[0], $data[$field])) {
                                $errors[$field] = "The $field format is invalid";
                            }
                        }
                        break;
                        
                    case 'array':
                        if (!is_array($data[$field])) {
                            $errors[$field] = "The $field must be an array";
                        }
                        break;
                        
                    case 'boolean':
                        $validValues = [true, false, 0, 1, '0', '1'];
                        if (!in_array($data[$field], $validValues, true)) {
                            $errors[$field] = "The $field field must be true or false";
                        }
                        break;
                }
            }
        }
        
        return $errors;
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
        // ตรวจสอบความถูกต้องของข้อมูล
        $errors = $this->validate($data);
        if (!empty($errors)) {
            throw new ValidationException("Validation failed", 400, null, $errors);
        }
        
        throw new Exception("Method not implemented", 405);
    }
    
    /**
     * อัพเดทข้อมูล (PUT /controller/id)
     */
    public function put($id = null, $data = []) {
        if (!$id) {
            throw new Exception("ID is required", 400);
        }
        
        // ตรวจสอบความถูกต้องของข้อมูล
        $errors = $this->validate($data);
        if (!empty($errors)) {
            throw new ValidationException("Validation failed", 400, null, $errors);
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
     * ผสานกฎการตรวจสอบความถูกต้องสำหรับข้อมูล
     */
    protected function mergeValidationRules($customRules) {
        return array_merge(self::$validationRules, $customRules);
    }
    
    /**
     * แปลงข้อมูลก่อนส่งออก
     */
    protected function transformOutput($data) {
        // ล้างข้อมูลที่อาจมีผลต่อความปลอดภัย
        return $this->sanitizeOutput($data);
    }
    
    /**
     * ทำความสะอาดข้อมูลก่อนส่งออก
     */
    protected function sanitizeOutput($data) {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->sanitizeOutput($value);
            }
            return $data;
        }
        
        // ทำความสะอาดข้อความเพื่อป้องกัน XSS
        if (is_string($data)) {
            return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
        }
        
        return $data;
    }
    
    /**
     * จัดการการเข้าถึงทรัพยากร (resource locking)
     */
    protected function acquireResourceLock($resourceType, $resourceId, $timeout = 10) {
        $db = getPDO();
        
        // สร้าง lock key ที่ไม่ซ้ำกัน
        $lockName = "{$resourceType}_{$resourceId}_lock";
        
        // พยายามล็อค
        $stmt = $db->prepare("SELECT GET_LOCK(?, ?)");
        $stmt->execute([$lockName, $timeout]);
        $result = $stmt->fetch(PDO::FETCH_COLUMN);
        
        return $result == 1;
    }
    
    /**
     * ปล่อยการล็อคทรัพยากร
     */
    protected function releaseResourceLock($resourceType, $resourceId) {
        $db = getPDO();
        
        // สร้าง lock key ที่ไม่ซ้ำกัน
        $lockName = "{$resourceType}_{$resourceId}_lock";
        
        // ปล่อยล็อค
        $stmt = $db->prepare("SELECT RELEASE_LOCK(?)");
        $stmt->execute([$lockName]);
        
        return true;
    }
}

/**
 * ValidationException
 * ข้อยกเว้นสำหรับการตรวจสอบความถูกต้องของข้อมูล
 */
class ValidationException extends Exception {
    protected $errors;
    
    public function __construct($message = "Validation failed", $code = 400, $previous = null, $errors = []) {
        parent::__construct($message, $code, $previous);
        $this->errors = $errors;
    }
    
    public function getErrors() {
        return $this->errors;
    }
}
?>