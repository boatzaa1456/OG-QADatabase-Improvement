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
    // รหัสข้อผิดพลาด HTTP ตามประเภท
    const ERROR_CODES = [
        'validation' => 400,
        'authorization' => 403,
        'not_found' => 404,
        'concurrency' => 409,
        'database' => 500,
        'server' => 500,
        'timeout' => 504
    ];
    
    // ข้อความข้อผิดพลาดเริ่มต้นสำหรับโหมด production
    const FRIENDLY_MESSAGES = [
        'validation' => 'ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง',
        'authorization' => 'คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้',
        'not_found' => 'ไม่พบข้อมูลที่ต้องการ',
        'concurrency' => 'ข้อมูลถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณารีเฟรชและลองใหม่อีกครั้ง',
        'database' => 'เกิดข้อผิดพลาดในการเข้าถึงฐานข้อมูล กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ',
        'server' => 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ',
        'timeout' => 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'
    ];
    
    /**
     * จัดการข้อผิดพลาด (error)
     * @param int $errno รหัสข้อผิดพลาด
     * @param string $errstr ข้อความข้อผิดพลาด
     * @param string $errfile ไฟล์ที่เกิดข้อผิดพลาด
     * @param int $errline บรรทัดที่เกิดข้อผิดพลาด
     * @return bool 
     */
    public static function handleError($errno, $errstr, $errfile, $errline) {
        // ไม่ต้องรายงานข้อผิดพลาดเล็กน้อยถ้าอยู่ในโหมด production
        if (APP_ENV === 'production' && in_array($errno, [E_NOTICE, E_USER_NOTICE, E_DEPRECATED, E_USER_DEPRECATED, E_STRICT])) {
            return true;
        }
        
        $errorType = self::getErrorType($errno);
        $severity = self::getErrorSeverity($errno);
        
        // บันทึกข้อผิดพลาด
        Logger::log($severity, "PHP {$errorType}: {$errstr}", [
            'file' => $errfile,
            'line' => $errline,
            'type' => $errorType,
            'code' => $errno
        ]);
        
        // บันทึกข้อผิดพลาดลงฐานข้อมูลถ้าเป็นข้อผิดพลาดร้ายแรง
        if (in_array($errno, [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR])) {
            self::logErrorToDatabase($errstr, $errorType, $errfile, $errline);
        }
        
        // ถ้าเป็นข้อผิดพลาดร้ายแรง ให้หยุดการทำงาน
        if (in_array($errno, [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
            self::displayError("เกิดข้อผิดพลาดในระบบ", 500, $errstr, $errno);
            exit(1);
        }
        
        // ให้ PHP จัดการข้อผิดพลาดต่อไป
        return true;
    }
    
    /**
     * จัดการข้อยกเว้น (exception)
     * @param Throwable $exception ข้อยกเว้น
     */
    public static function handleException($exception) {
        // ระบุประเภทของข้อยกเว้น
        $exceptionType = get_class($exception);
        $statusCode = self::determineStatusCode($exception);
        $errorType = self::determineErrorType($exception);
        
        // บันทึกข้อยกเว้นลงไฟล์ล็อก
        Logger::logError($exception->getMessage(), [
            'type' => $exceptionType,
            'error_type' => $errorType,
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'code' => $exception->getCode()
        ]);
        
        // บันทึกลงฐานข้อมูลเฉพาะข้อยกเว้นที่ร้ายแรง
        if ($statusCode >= 500 || $errorType === 'server' || $errorType === 'database') {
            self::logExceptionToDatabase($exception, $errorType);
        }
        
        // แสดงข้อความข้อผิดพลาด
        self::displayError(
            self::getFriendlyMessage($exception, $errorType),
            $statusCode,
            $exception->getMessage(),
            $exception->getCode(),
            $errorType,
            $exception
        );
        
        exit(1);
    }
    
    /**
     * รับรหัสสถานะ HTTP จากข้อยกเว้น
     * @param Throwable $exception ข้อยกเว้น
     * @return int รหัสสถานะ HTTP
     */
    private static function determineStatusCode($exception) {
        $code = $exception->getCode();
        
        // ถ้ารหัสเป็นเลขที่ถูกต้องสำหรับ HTTP status
        if ($code >= 100 && $code < 600) {
            return $code;
        }
        
        // ตรวจสอบประเภทข้อยกเว้น
        if ($exception instanceof ValidationException) {
            return 400;
        } else if ($exception instanceof ConcurrencyException) {
            return 409;
        } else if ($exception instanceof PDOException) {
            return 500;
        } else if (strpos($exception->getMessage(), 'not found') !== false || 
                   strpos($exception->getMessage(), 'Not Found') !== false) {
            return 404;
        } else if (strpos($exception->getMessage(), 'permission') !== false ||
                   strpos($exception->getMessage(), 'unauthorized') !== false ||
                   strpos($exception->getMessage(), 'Unauthorized') !== false) {
            return 403;
        }
        
        // ค่าเริ่มต้น
        return 500;
    }
    
    /**
     * รับประเภทข้อผิดพลาดจากข้อยกเว้น
     * @param Throwable $exception ข้อยกเว้น
     * @return string ประเภทข้อผิดพลาด
     */
    private static function determineErrorType($exception) {
        if ($exception instanceof ValidationException) {
            return 'validation';
        } else if ($exception instanceof ConcurrencyException) {
            return 'concurrency';
        } else if ($exception instanceof PDOException || 
                   strpos(get_class($exception), 'Database') !== false) {
            return 'database';
        } else if (strpos($exception->getMessage(), 'not found') !== false ||
                   strpos($exception->getMessage(), 'Not Found') !== false) {
            return 'not_found';
        } else if (strpos($exception->getMessage(), 'permission') !== false ||
                   strpos($exception->getMessage(), 'unauthorized') !== false ||
                   strpos($exception->getMessage(), 'Unauthorized') !== false) {
            return 'authorization';
        } else if (strpos($exception->getMessage(), 'timeout') !== false ||
                   strpos($exception->getMessage(), 'timed out') !== false) {
            return 'timeout';
        }
        
        return 'server';
    }
    
    /**
     * รับข้อความที่เป็นมิตรกับผู้ใช้
     * @param Throwable $exception ข้อยกเว้น
     * @param string $errorType ประเภทข้อผิดพลาด
     * @return string ข้อความที่เป็นมิตรกับผู้ใช้
     */
    private static function getFriendlyMessage($exception, $errorType) {
        // ในโหมด production ให้ใช้ข้อความมาตรฐาน
        if (APP_ENV === 'production') {
            if (isset(self::FRIENDLY_MESSAGES[$errorType])) {
                return self::FRIENDLY_MESSAGES[$errorType];
            }
            return self::FRIENDLY_MESSAGES['server'];
        }
        
        // ในโหมด development แสดงข้อความที่เฉพาะเจาะจงมากขึ้น
        // ValidationException จะมีข้อมูลข้อผิดพลาดโดยเฉพาะ
        if ($exception instanceof ValidationException) {
            $errors = $exception->getErrors();
            if (!empty($errors)) {
                return $exception->getMessage() . ': ' . implode(', ', array_values($errors));
            }
        }
        
        return $exception->getMessage();
    }
    
    /**
     * แสดงข้อความข้อผิดพลาด
     * @param string $message ข้อความข้อผิดพลาด
     * @param int $statusCode รหัสสถานะ HTTP
     * @param string $originalMessage ข้อความข้อผิดพลาดดั้งเดิม
     * @param int $errorCode รหัสข้อผิดพลาด
     * @param string $errorType ประเภทข้อผิดพลาด
     * @param Throwable $exception ข้อยกเว้น (optional)
     */
    private static function displayError($message, $statusCode = 500, $originalMessage = '', $errorCode = 0, $errorType = 'server', $exception = null) {
        // ตั้งค่า HTTP status code
        http_response_code($statusCode);
        
        // สร้างการตอบสนอง
        $response = [
            'status' => 'error',
            'message' => $message,
            'error_type' => $errorType
        ];
        
        // เพิ่มรายละเอียดเฉพาะถ้าอยู่ในโหมด development
        if (APP_ENV === 'development') {
            $response['dev_message'] = $originalMessage;
            $response['error_code'] = $errorCode;
            
            // เพิ่มข้อมูลเพิ่มเติมสำหรับ ValidationException
            if ($exception instanceof ValidationException) {
                $response['validation_errors'] = $exception->getErrors();
            }
            
            // เพิ่ม stack trace ในโหมด debug
            if ($exception && defined('DEBUG_MODE') && DEBUG_MODE === true) {
                $response['stack_trace'] = explode("\n", $exception->getTraceAsString());
                $response['file'] = $exception->getFile();
                $response['line'] = $exception->getLine();
            }
        }
        
        // ส่งการตอบสนองเป็น JSON
        echo json_encode($response);
    }
    
    /**
     * บันทึกข้อผิดพลาดลงฐานข้อมูล
     * @param string $message ข้อความข้อผิดพลาด
     * @param string $type ประเภทข้อผิดพลาด
     * @param string $file ไฟล์ที่เกิดข้อผิดพลาด
     * @param int $line บรรทัดที่เกิดข้อผิดพลาด
     * @return bool ผลลัพธ์การบันทึก
     */
    private static function logErrorToDatabase($message, $type, $file, $line) {
        try {
            $db = getPDO();
            
            $context = json_encode([
                'file' => $file,
                'line' => $line,
                'type' => $type,
                'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
                'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
            
            $stmt = $db->prepare("
                INSERT INTO error_logs (message, context, ip_address, request_uri, severity, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $message,
                $context,
                $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                $_SERVER['REQUEST_URI'] ?? 'unknown',
                self::getErrorSeverity(E_ERROR)
            ]);
            
            return true;
        } catch (Exception $e) {
            // ถ้าไม่สามารถบันทึกลงฐานข้อมูลได้ ก็แค่บันทึกลงไฟล์
            error_log("Could not log error to database: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * บันทึกข้อยกเว้นลงฐานข้อมูล
     * @param Throwable $exception ข้อยกเว้น
     * @param string $errorType ประเภทข้อผิดพลาด
     * @return bool ผลลัพธ์การบันทึก
     */
    private static function logExceptionToDatabase($exception, $errorType) {
        try {
            $db = getPDO();
            
            $context = json_encode([
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'type' => get_class($exception),
                'error_type' => $errorType,
                'code' => $exception->getCode(),
                'trace' => $exception->getTraceAsString(),
                'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
                'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
            
            $severity = ($errorType == 'server' || $errorType == 'database') ? 'ERROR' : 'WARNING';
            
            $stmt = $db->prepare("
                INSERT INTO error_logs (message, context, ip_address, request_uri, severity, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $exception->getMessage(),
                $context,
                $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                $_SERVER['REQUEST_URI'] ?? 'unknown',
                $severity
            ]);
            
            return true;
        } catch (Exception $e) {
            // ถ้าไม่สามารถบันทึกลงฐานข้อมูลได้ ก็แค่บันทึกลงไฟล์
            error_log("Could not log exception to database: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * แปลงรหัสข้อผิดพลาดเป็นข้อความ
     * @param int $errno รหัสข้อผิดพลาด
     * @return string ข้อความประเภทข้อผิดพลาด
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
    
    /**
     * แปลงรหัสข้อผิดพลาดเป็นระดับความรุนแรง
     * @param int $errno รหัสข้อผิดพลาด
     * @return string ระดับความรุนแรง
     */
    private static function getErrorSeverity($errno) {
        switch ($errno) {
            case E_ERROR:
            case E_CORE_ERROR:
            case E_COMPILE_ERROR:
            case E_USER_ERROR:
            case E_RECOVERABLE_ERROR:
                return Logger::ERROR;
            
            case E_WARNING:
            case E_CORE_WARNING:
            case E_COMPILE_WARNING:
            case E_USER_WARNING:
                return Logger::WARNING;
            
            case E_DEPRECATED:
            case E_USER_DEPRECATED:
                return Logger::INFO;
                
            case E_NOTICE:
            case E_USER_NOTICE:
            case E_STRICT:
                return Logger::DEBUG;
                
            default:
                return Logger::WARNING;
        }
    }
    
    /**
     * ส่งข้อความข้อผิดพลาดไปยังผู้ดูแลระบบ
     * @param Throwable $exception ข้อยกเว้น
     * @param string $errorType ประเภทข้อผิดพลาด
     * @return bool ผลลัพธ์การส่ง
     */
    public static function notifyAdministrator($exception, $errorType) {
        // ถ้ามีแค่ข้อผิดพลาดเล็กน้อย ไม่ต้องแจ้งผู้ดูแล
        if (in_array($errorType, ['validation', 'not_found']) || 
            $exception->getCode() < 500) {
            return false;
        }
        
        // ต้องการการตั้งค่าระบบอีเมลหรือการแจ้งเตือนอื่นๆ
        // เช่น SMTP, Line Notify, หรือแพลตฟอร์มติดตามข้อผิดพลาดอื่นๆ
        
        // ตัวอย่างโค้ดส่งการแจ้งเตือนไปยัง Line Notify
        $lineNotifyToken = getenv('LINE_NOTIFY_TOKEN');
        if ($lineNotifyToken) {
            $message = sprintf(
                "⚠️ Error in %s\n📝 %s\n🔢 %s\n📁 %s:%d\n⏰ %s",
                APP_NAME,
                $exception->getMessage(),
                $errorType,
                basename($exception->getFile()),
                $exception->getLine(),
                date('Y-m-d H:i:s')
            );
            
            // self::sendLineNotify($lineNotifyToken, $message);
            // ฟังก์ชัน sendLineNotify ต้องเขียนเพิ่มหรือใช้ไลบรารีสำหรับส่ง Line Notify
        }
        
        return true;
    }
    
    /**
     * ล้างแคชเมื่อเกิดข้อผิดพลาด (ถ้าจำเป็น)
     * @param Throwable $exception ข้อยกเว้น
     * @param string $errorType ประเภทข้อผิดพลาด
     */
    public static function clearCacheIfNeeded($exception, $errorType) {
        // ถ้าเป็นข้อผิดพลาดที่เกี่ยวกับฐานข้อมูลหรือ concurrency
        if ($errorType === 'database' || $errorType === 'concurrency') {
            // ถ้ามีการใช้แคช
            if (function_exists('apcu_clear_cache')) {
                apcu_clear_cache();
            }
        }
    }
}
?>