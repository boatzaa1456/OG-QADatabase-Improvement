<?php
/**
 * Error Handler
 * ระบบจัดการข้อผิดพลาด
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

class ErrorHandler {
    /**
     * จัดการข้อผิดพลาด (error)
     */
    public static function handleError($errno, $errstr, $errfile, $errline) {
        // ไม่ต้องรายงานข้อผิดพลาดเล็กน้อยถ้าอยู่ในโหมด production
        if (APP_ENV === 'production' && ($errno === E_NOTICE || $errno === E_USER_NOTICE || $errno === E_DEPRECATED)) {
            return true;
        }
        
        $errorType = self::getErrorType($errno);
        
        // บันทึกข้อผิดพลาด
        Logger::log(Logger::ERROR, "PHP {$errorType}: {$errstr}", [
            'file' => $errfile,
            'line' => $errline,
            'type' => $errorType
        ]);
        
        // ถ้าเป็นข้อผิดพลาดร้ายแรง ให้หยุดการทำงาน
        if ($errno === E_ERROR || $errno === E_CORE_ERROR || $errno === E_COMPILE_ERROR || $errno === E_USER_ERROR) {
            self::displayError("A system error occurred", 500);
            exit(1);
        }
        
        // ให้ PHP จัดการข้อผิดพลาดต่อไป
        return true;
    }
    
    /**
     * จัดการข้อยกเว้น (exception)
     */
    public static function handleException($exception) {
        // บันทึกข้อยกเว้น
        Logger::logError($exception->getMessage(), [
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString()
        ]);
        
        // กำหนดรหัสสถานะ HTTP
        $statusCode = $exception->getCode();
        if ($statusCode < 100 || $statusCode > 599) {
            $statusCode = 500;
        }
        
        // แสดงข้อความข้อผิดพลาด
        self::displayError($exception->getMessage(), $statusCode);
        exit(1);
    }
    
    /**
     * แสดงข้อความข้อผิดพลาด
     */
    private static function displayError($message, $statusCode = 500) {
        http_response_code($statusCode);
        
        // ซ่อนรายละเอียดในโหมด production
        if (APP_ENV === 'production') {
            $response = [
                'status' => 'error',
                'message' => 'An error occurred. Please try again later.'
            ];
        } else {
            $response = [
                'status' => 'error',
                'message' => $message,
                'code' => $statusCode
            ];
        }
        
        echo json_encode($response);
    }
    
    /**
     * แปลงรหัสข้อผิดพลาดเป็นข้อความ
     */
    private static function getErrorType($errno) {
        switch ($errno) {
            case E_ERROR:
                return 'Fatal Error';
            case E_WARNING:
                return 'Warning';
            case E_PARSE:
                return 'Parse Error';
            case E_NOTICE:
                return 'Notice';
            case E_CORE_ERROR:
                return 'Core Error';
            case E_CORE_WARNING:
                return 'Core Warning';
            case E_COMPILE_ERROR:
                return 'Compile Error';
            case E_COMPILE_WARNING:
                return 'Compile Warning';
            case E_USER_ERROR:
                return 'User Error';
            case E_USER_WARNING:
                return 'User Warning';
            case E_USER_NOTICE:
                return 'User Notice';
            case E_STRICT:
                return 'Strict Standards';
            case E_RECOVERABLE_ERROR:
                return 'Recoverable Error';
            case E_DEPRECATED:
                return 'Deprecated';
            case E_USER_DEPRECATED:
                return 'User Deprecated';
            default:
                return 'Unknown Error';
        }
    }
}
?>