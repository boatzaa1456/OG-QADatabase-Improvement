<?php
/**
 * Autoloader
 * โหลดคลาสอัตโนมัติ
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

/**
 * ฟังก์ชัน autoload สำหรับโหลดคลาสอัตโนมัติ
 */
function autoload($className) {
    // แปลงชื่อคลาสเป็นชื่อไฟล์
    $fileName = str_replace('\\', DIRECTORY_SEPARATOR, $className) . '.php';
    
    // เส้นทางที่เป็นไปได้สำหรับค้นหาไฟล์
    $paths = [
        __DIR__ . '/',
        __DIR__ . '/models/',
        __DIR__ . '/controllers/',
        __DIR__ . '/helpers/'
    ];
    
    // ค้นหาไฟล์ในเส้นทางทั้งหมด
    foreach ($paths as $path) {
        $file = $path . $fileName;
        
        if (file_exists($file)) {
            require_once $file;
            return true;
        }
    }
    
    // ถ้าเป็น Controller class, ให้ลองใส่ "Controller" ต่อท้าย
    if (substr($className, -10) !== 'Controller') {
        $controllerFile = __DIR__ . '/controllers/' . $className . 'Controller.php';
        
        if (file_exists($controllerFile)) {
            require_once $controllerFile;
            return true;
        }
    }
    
    return false;
}

// ลงทะเบียนฟังก์ชัน autoload
spl_autoload_register('autoload');
?>