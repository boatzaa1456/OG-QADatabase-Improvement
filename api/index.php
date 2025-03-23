<?php
/**
 * Entry point for the Ocean Glass QA System API
 * จุดเริ่มต้นของ API สำหรับระบบ QA ของ Ocean Glass
 */

// ตั้งค่า error reporting
ini_set('display_errors', 0);
error_reporting(E_ALL);

// กำหนด INCLUDE_API เพื่อป้องกันการเข้าถึงไฟล์โดยตรง
define('INCLUDE_API', true);

// ตั้งค่า timezone
date_default_timezone_set('Asia/Bangkok');

// โหลดไฟล์กำหนดค่า
require_once 'config.php';

// โหลดไฟล์ autoloader
require_once 'autoload.php';

// โหลดฟังก์ชันช่วยเหลือ
require_once 'helpers/ErrorHandler.php';
require_once 'helpers/Logger.php';

// ตั้งค่า error handler
set_error_handler('ErrorHandler::handleError');
set_exception_handler('ErrorHandler::handleException');

// กำหนดตัวแปร API version
$apiVersion = '1';

// ดึง URI ที่เข้ามา
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = dirname($_SERVER['SCRIPT_NAME']);

// ตัด base path ออกเพื่อให้เหลือเฉพาะ endpoint
$endpoint = trim(str_replace($scriptName, '', $requestUri), '/');

// แยกส่วน endpoint และพารามิเตอร์
$parts = explode('/', $endpoint);

// ดึง controller และ action จาก URL
$controller = isset($parts[0]) && $parts[0] !== '' ? $parts[0] : 'index';
$action = isset($parts[1]) && $parts[1] !== '' ? $parts[1] : 'index';
$id = isset($parts[2]) && $parts[2] !== '' ? $parts[2] : null;

// ตรวจสอบว่าเป็น OPTIONS request (CORS preflight) หรือไม่
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // ตั้งค่า CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400'); // 24 ชั่วโมง
    exit;
}

// ตรวจสอบ request method
$method = $_SERVER['REQUEST_METHOD'];

// สำหรับ PUT หรือ DELETE ใน HTML Form ที่ไม่รองรับโดยตรง
if (isset($_POST['_method'])) {
    $method = strtoupper($_POST['_method']);
}

// ดึงข้อมูลที่ส่งมา
$requestData = [];

// ถ้าเป็น GET หรือ DELETE
if ($method === 'GET' || $method === 'DELETE') {
    $requestData = $_GET;
}
// ถ้าเป็น POST หรือ PUT
else if ($method === 'POST' || $method === 'PUT') {
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    
    // ถ้าเป็น JSON
    if (strpos($contentType, 'application/json') !== false) {
        $json = file_get_contents('php://input');
        $requestData = json_decode($json, true) ?: [];
    }
    // ถ้าเป็น form data ปกติ
    else {
        $requestData = $_POST;
    }
}

// เก็บข้อมูล URL parameters ไว้ใน $_REQUEST
$_REQUEST = array_merge($_REQUEST, $requestData);

// กำหนด header ให้เป็น JSON response
header('Content-Type: application/json; charset=UTF-8');

// เช็ค path และเรียก Controller ที่เหมาะสม
try {
    // เช็คการยืนยันตัวตน (ยกเว้น auth controller)
    $requiresAuth = ($controller !== 'auth');
    
    if ($requiresAuth) {
        require_once 'auth.php';
        
        // ถ้ากำลังใช้งานระบบยืนยันตัวตน และไม่ได้รับอนุญาต
        if (!Auth::checkAuthorization($controller, $action)) {
            // กรณีไม่ได้ล็อกอิน
            if (!Auth::isAuthenticated()) {
                throw new Exception('Unauthorized access. Please login.', 401);
            }
            // กรณีล็อกอินแล้วแต่ไม่มีสิทธิ์
            else {
                throw new Exception('You do not have permission to access this resource.', 403);
            }
        }
    }
    
    // เตรียม controller path
    $controllerName = ucfirst($controller) . 'Controller';
    $controllerFile = 'controllers/' . $controllerName . '.php';
    
    // ตรวจสอบว่า controller มีอยู่จริงหรือไม่
    if (!file_exists(__DIR__ . '/' . $controllerFile)) {
        throw new Exception('Controller not found: ' . $controller, 404);
    }
    
    // โหลด controller
    require_once $controllerFile;
    
    // สร้าง instance ของ controller
    $controllerInstance = new $controllerName();
    
    // กำหนดชื่อ method จาก action และ method
    $methodName = strtolower($method) . ucfirst($action);
    
    // ถ้า method ไม่มีอยู่ ให้ใช้ method อื่นที่เข้ากับ action แทน
    if (!method_exists($controllerInstance, $methodName)) {
        // ลองใช้ HTTP method แบบไม่ระบุ
        $methodName = $action;
        
        // ถ้ายังไม่มี action นี้อีก
        if (!method_exists($controllerInstance, $methodName)) {
            throw new Exception('Action not found: ' . $action . ' [Method: ' . $method . ']', 404);
        }
    }
    
    // ทำการเรียก method ของ controller
    $result = $controllerInstance->$methodName($id, $requestData);
    
    // แสดงผลลัพธ์
    echo json_encode([
        'status' => 'success',
        'data' => $result
    ]);
    
} catch (Exception $e) {
    // บันทึก error
    Logger::logError($e->getMessage(), [
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'controller' => $controller,
        'action' => $action,
        'method' => $method,
        'request' => $requestData
    ]);
    
    // ส่ง error response
    $statusCode = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($statusCode);
    
    // สร้าง error message ที่เหมาะสม
    $errorMessage = APP_ENV === 'development' ? 
        $e->getMessage() : 
        'An error occurred. Please try again or contact administrator.';
    
    // แสดงข้อความผิดพลาด
    echo json_encode([
        'status' => 'error',
        'message' => $errorMessage,
        'code' => $statusCode
    ]);
}
?>