<?php
/**
 * Logger
 * ระบบบันทึกเหตุการณ์
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

class Logger {
    // ระดับการบันทึก
    const DEBUG = 'DEBUG';
    const INFO = 'INFO';
    const WARNING = 'WARNING';
    const ERROR = 'ERROR';
    
    /**
     * บันทึกข้อความ
     */
    public static function log($level, $message, $context = []) {
        // ตรวจสอบว่าเป็นระดับที่ถูกต้องหรือไม่
        if (!in_array($level, [self::DEBUG, self::INFO, self::WARNING, self::ERROR])) {
            $level = self::INFO;
        }
        
        // รับเวลาปัจจุบัน
        $datetime = date('Y-m-d H:i:s');
        
        // รับ IP ของผู้ใช้
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        // รับ URI ที่เข้ามา
        $requestUri = $_SERVER['REQUEST_URI'] ?? 'unknown';
        
        // แปลง context เป็น JSON
        $contextJson = json_encode($context);
        
        // สร้างข้อความที่จะบันทึก
        $logMessage = "[{$datetime}] [{$level}] [{$ipAddress}] [{$requestUri}] {$message} {$contextJson}\n";
        
        // สร้างชื่อไฟล์ตามวันที่
        $logFile = __DIR__ . '/../logs/' . date('Y-m-d') . '.log';
        
        // บันทึกลงไฟล์
        file_put_contents($logFile, $logMessage, FILE_APPEND);
    }
    
    /**
     * บันทึกข้อความระดับ DEBUG
     */
    public static function debug($message, $context = []) {
        self::log(self::DEBUG, $message, $context);
    }
    
    /**
     * บันทึกข้อความระดับ INFO
     */
    public static function info($message, $context = []) {
        self::log(self::INFO, $message, $context);
    }
    
    /**
     * บันทึกข้อความระดับ WARNING
     */
    public static function warning($message, $context = []) {
        self::log(self::WARNING, $message, $context);
    }
    
    /**
     * บันทึกข้อความระดับ ERROR
     */
    public static function error($message, $context = []) {
        self::log(self::ERROR, $message, $context);
    }
    
/**
     * บันทึกข้อความระดับ ERROR สำหรับข้อผิดพลาด
     */
    public static function logError($message, $context = []) {
        // บันทึกลงฐานข้อมูล (ถ้าทำได้)
        try {
            $db = getPDO();
            
            // รับ IP ของผู้ใช้
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            
            // รับ URI ที่เข้ามา
            $requestUri = $_SERVER['REQUEST_URI'] ?? 'unknown';
            
            // แปลง context เป็น JSON
            $contextJson = json_encode($context);
            
            // บันทึก
            $sql = "INSERT INTO error_logs (message, context, ip_address, request_uri, created_at) VALUES (?, ?, ?, ?, NOW())";
            $stmt = $db->prepare($sql);
            $stmt->execute([$message, $contextJson, $ipAddress, $requestUri]);
        } catch (Exception $e) {
            // ถ้าบันทึกลงฐานข้อมูลไม่ได้ก็ไม่เป็นไร ให้บันทึกลงไฟล์แทน
        }
        
        // บันทึกลงไฟล์
        self::log(self::ERROR, $message, $context);
    }
    
    /**
     * บันทึกการเข้าถึง API
     */
    public static function logAccess($controller, $action, $method, $data = [], $status = 'success') {
        $message = "Access {$method} {$controller}/{$action}";
        $context = [
            'data' => $data,
            'status' => $status
        ];
        
        self::log(self::INFO, $message, $context);
    }
}
?>