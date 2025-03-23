<?php
// เพิ่มเวลาในการประมวลผล PHP
ini_set('max_execution_time', 300); // 5 นาที

// ป้องกันการแสดง PHP errors ไปยัง output
ini_set('display_errors', 0);
error_reporting(E_ALL);

// บันทึก errors แทนการแสดงผล
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// ตั้งค่า CORS ที่ปลอดภัยกว่า
$allowedOrigins = [
    'http://localhost',
    'http://localhost:8080',
    'http://127.0.0.1',
    // เพิ่ม domain ที่ใช้จริงของคุณที่นี่
    // 'https://yourdomain.com'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
} else {
    // ถ้าเป็น OPTIONS request (preflight) ก็ให้ผ่าน
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        exit(0);
    }
}

header('Content-Type: application/json');

// กำหนดค่าสำหรับการนำเข้าไฟล์อื่น
define('INCLUDE_API', true);

// นำเข้าไฟล์ config
require_once 'config.php';

// รับค่า action จาก request
$action = isset($_GET['action']) ? $_GET['action'] : '';

// ตรวจสอบประเภทของ request (GET, POST, PUT, DELETE)
$requestMethod = $_SERVER['REQUEST_METHOD'];

// อ่านข้อมูล JSON จาก input และจัดการกับ errors
$jsonInput = file_get_contents('php://input');
$data = [];

if (!empty($jsonInput)) {
    // บันทึกข้อมูล input เพื่อตรวจสอบในภายหลัง (เฉพาะ development)
    $appEnv = getenv('APP_ENV') ?: 'development';
    if ($appEnv === 'development') {
        error_log("API Input for action '$action': " . $jsonInput);
    }
    
    $data = json_decode($jsonInput, true);
    
    // ตรวจสอบว่าการแปลง JSON สำเร็จหรือไม่
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode([
            'status' => 'error', 
            'message' => 'Invalid JSON: ' . json_last_error_msg(),
            'input' => substr($jsonInput, 0, 100) . (strlen($jsonInput) > 100 ? '...' : '')
        ]);
        exit;
    }
}

// ฟังก์ชันทำความสะอาดข้อมูลก่อนส่งกลับเพื่อป้องกัน XSS
function sanitizeOutput($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = sanitizeOutput($value);
        }
        return $data;
    }
    
    // ถ้าเป็น string ให้ทำการ escape เพื่อป้องกัน XSS
    if (is_string($data)) {
        return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    }
    
    return $data;
}

try {
    // กำหนดการทำงานตาม action
    switch ($action) {
        case 'save_inspection':
            if ($requestMethod === 'POST') {
                // บันทึกข้อมูลการตรวจสอบ
                saveInspection($data);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed. Use POST.']);
            }
            break;
            
        case 'get_inspections':
            if ($requestMethod === 'GET') {
                // ดึงรายการการตรวจสอบทั้งหมด
                getInspections();
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed. Use GET.']);
            }
            break;
            
        case 'get_inspection':
            if ($requestMethod === 'GET' && isset($_GET['id'])) {
                // ดึงข้อมูลการตรวจสอบตาม ID
                getInspection(intval($_GET['id'])); // แปลงเป็น integer เพื่อป้องกัน SQL injection
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Invalid request. ID is required.']);
            }
            break;
            
        case 'get_summary':
            if ($requestMethod === 'GET') {
                // ดึงข้อมูลสรุปการตรวจสอบ
                getSummaryData();
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Method not allowed. Use GET.']);
            }
            break;
            
        default:
            // ถ้าไม่มี action ที่ตรงกัน ส่งข้อความ error กลับ
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}

// ฟังก์ชันบันทึกข้อมูลการตรวจสอบ
function saveInspection($data) {
    try {
        // บันทึก raw input data เพื่อการ debug (เฉพาะ development)
        $appEnv = getenv('APP_ENV') ?: 'development';
        if ($appEnv === 'development') {
            error_log("Raw input data: " . json_encode($data));
        }
        
        $conn = getConnection();
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (empty($data)) {
            echo json_encode(['status' => 'error', 'message' => 'No data provided']);
            return;
        }
        
        // ตรวจสอบฟิลด์ที่จำเป็น
        $requiredFields = ['docPT', 'productionDate', 'shift', 'itemNumber', 'machineNo', 'totalProduct', 'samplingDate', 'workOrder', 'inspector', 'supervisor'];
        $missingFields = [];
        
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $missingFields[] = $field;
            }
        }
        
        if (!empty($missingFields)) {
            echo json_encode(['status' => 'error', 'message' => "Missing required fields: " . implode(', ', $missingFields)]);
            return;
        }
        
        // ตรวจสอบว่ามีข้อมูลล็อตหรือไม่
        if (empty($data['lots']) || !is_array($data['lots'])) {
            echo json_encode(['status' => 'error', 'message' => 'No lot data provided']);
            return;
        }
        
        // เริ่ม transaction
        $conn->begin_transaction();
        
        // เตรียมข้อมูล $lotIds
        $lotIds = [];
        
        // 1. บันทึกข้อมูลหลักของการตรวจสอบ
        $stmt = $conn->prepare("INSERT INTO inspections (doc_pt, production_date, shift, item_number, gauge_mark, 
                                production_type, is_rework, is_destroy, use_jig, no_jig, machine_no, 
                                total_product, sampling_date, work_order, operation, inspector, supervisor, remarks, created_at) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        // ตั้งค่าค่าเริ่มต้นสำหรับข้อมูลที่อาจเป็น null
        $gaugeMark = isset($data['gaugeMark']) ? $data['gaugeMark'] : null;
        $productionType = isset($data['productionType']) ? intval($data['productionType']) : 1;
        $rework = isset($data['rework']) ? ($data['rework'] ? 1 : 0) : 0;
        $destroy = isset($data['destroy']) ? ($data['destroy'] ? 1 : 0) : 0;
        $useJig = isset($data['useJig']) ? ($data['useJig'] ? 1 : 0) : 0;
        $noJig = isset($data['noJig']) ? ($data['noJig'] ? 1 : 0) : 0;
        $operation = isset($data['operation']) ? $data['operation'] : '';
        $remarks = isset($data['remarks']) ? $data['remarks'] : '';
        
        // ทำความสะอาดข้อมูลก่อนบันทึก
        $docPT = trim($data['docPT']);
        $productionDate = trim($data['productionDate']);
        $shift = trim($data['shift']);
        $itemNumber = trim($data['itemNumber']);
        $machineNo = trim($data['machineNo']);
        $totalProduct = intval($data['totalProduct']);
        $samplingDate = trim($data['samplingDate']);
        $workOrder = trim($data['workOrder']);
        $inspector = trim($data['inspector']);
        $supervisor = trim($data['supervisor']);
        
        // ใช้ดักจับความผิดพลาดที่อาจเกิดขึ้น
        try {
            $stmt->bind_param("sssssiiiiiisssssss", 
                $docPT, 
                $productionDate, 
                $shift, 
                $itemNumber, 
                $gaugeMark, 
                $productionType, 
                $rework, 
                $destroy, 
                $useJig, 
                $noJig, 
                $machineNo, 
                $totalProduct, 
                $samplingDate, 
                $workOrder, 
                $operation, 
                $inspector, 
                $supervisor, 
                $remarks
            );
        } catch (Exception $e) {
            throw new Exception("Parameter binding error: " . $e->getMessage() . 
                                "\nParameters: " . json_encode([
                                    'docPT' => $docPT,
                                    'productionDate' => $productionDate,
                                    'shift' => $shift,
                                    'itemNumber' => $itemNumber,
                                    'gaugeMark' => $gaugeMark,
                                    'productionType' => $productionType,
                                    'rework' => $rework,
                                    'destroy' => $destroy,
                                    'useJig' => $useJig,
                                    'noJig' => $noJig,
                                    'machineNo' => $machineNo,
                                    'totalProduct' => $totalProduct,
                                    'samplingDate' => $samplingDate,
                                    'workOrder' => $workOrder,
                                    'operation' => $operation,
                                    'inspector' => $inspector,
                                    'supervisor' => $supervisor,
                                    'remarks' => $remarks
                                ]));
        }
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        // รับค่า ID ที่เพิ่งบันทึก
        $inspectionId = $conn->insert_id;
        
        // 2. บันทึกข้อมูลล็อต
        if (!empty($data['lots'])) {
            foreach ($data['lots'] as $lot) {
                if (empty($lot['lotNumber'])) {
                    continue; // ข้ามล็อตที่ไม่มีข้อมูล
                }
                
                $stmt = $conn->prepare("INSERT INTO inspection_lots (inspection_id, lot_number, pieces_per_lot, 
                                        description, pallet_no, strain_std, first_sample_size, first_sample_ac_re, 
                                        second_sample_size, second_sample_ac_re, result, qp, strain_result) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                if (!$stmt) {
                    throw new Exception("Prepare lot statement failed: " . $conn->error);
                }
                
                // ตั้งค่าค่าเริ่มต้นสำหรับข้อมูลที่อาจเป็น null
                $lotNumber = trim($lot['lotNumber']);
                $piecesPerLot = isset($lot['piecesPerLot']) ? intval($lot['piecesPerLot']) : 0;
                $description = isset($lot['description']) ? trim($lot['description']) : '';
                $palletNo = isset($lot['palletNo']) ? trim($lot['palletNo']) : '';
                $strainStd = isset($lot['strainStd']) ? $lot['strainStd'] : null;
                $firstSampleSize = isset($lot['firstSampleSize']) ? intval($lot['firstSampleSize']) : null;
                $firstSampleAcRe = isset($lot['firstSampleAcRe']) ? trim($lot['firstSampleAcRe']) : '';
                $secondSampleSize = isset($lot['secondSampleSize']) ? intval($lot['secondSampleSize']) : null;
                $secondSampleAcRe = isset($lot['secondSampleAcRe']) ? trim($lot['secondSampleAcRe']) : '';
                $result = isset($lot['result']) ? trim($lot['result']) : '';
                $qp = isset($lot['qp']) ? trim($lot['qp']) : '';
                $strainResult = isset($lot['strainResult']) ? trim($lot['strainResult']) : '';
                
                try {
                    $stmt->bind_param("isissdisissss", 
                        $inspectionId, 
                        $lotNumber, 
                        $piecesPerLot, 
                        $description, 
                        $palletNo, 
                        $strainStd, 
                        $firstSampleSize, 
                        $firstSampleAcRe, 
                        $secondSampleSize, 
                        $secondSampleAcRe, 
                        $result, 
                        $qp, 
                        $strainResult
                    );
                } catch (Exception $e) {
                    throw new Exception("Lot parameter binding error: " . $e->getMessage() . 
                                       "\nLot data: " . json_encode($lot));
                }
                
                if (!$stmt->execute()) {
                    throw new Exception("Execute lot statement failed: " . $stmt->error);
                }
                
                // รับค่า ID ของล็อตที่เพิ่งบันทึก
                $lotId = $conn->insert_id;
                
                // บันทึกล็อตเพื่อใช้ในการบันทึกข้อมูลอื่นๆ ที่เกี่ยวข้อง
                $lotIds[$lot['lotNumber']] = $lotId;
            }
        }
        
        // 3. บันทึกข้อมูลข้อบกพร่อง
        if (!empty($data['defects'])) {
            foreach ($data['defects'] as $defect) {
                // ตรวจสอบว่ามีล็อตที่เกี่ยวข้องหรือไม่
                $lotKey = 'lot' . $defect['lot'];
                if (!isset($lotIds[$lotKey])) {
                    error_log("Missing lot for defect: " . json_encode($defect));
                    continue; // ข้ามถ้าไม่พบล็อต
                }
                
                $lotId = $lotIds[$lotKey];
                $count = isset($defect['count']) ? intval($defect['count']) : 0;
                
                // ข้ามถ้าไม่มีข้อบกพร่อง
                if ($count <= 0) {
                    continue;
                }
                
                $stmt = $conn->prepare("INSERT INTO lot_defects (lot_id, defect_code, defect_count) 
                                        VALUES (?, ?, ?)");
                
                if (!$stmt) {
                    throw new Exception("Prepare defect statement failed: " . $conn->error);
                }
                
                // ทำความสะอาดข้อมูล
                $defectCode = trim($defect['defectCode']);
                
                try {
                    $stmt->bind_param("isi", 
                        $lotId, 
                        $defectCode, 
                        $count
                    );
                } catch (Exception $e) {
                    throw new Exception("Defect parameter binding error: " . $e->getMessage() . 
                                       "\nDefect data: " . json_encode($defect));
                }
                
                if (!$stmt->execute()) {
                    throw new Exception("Execute defect statement failed: " . $stmt->error);
                }
            }
        }
        
        // 4. บันทึกข้อมูลการวัดความเครียด
        if (!empty($data['strainMeasurements'])) {
            foreach ($data['strainMeasurements'] as $measurement) {
                // ตรวจสอบว่ามีล็อตที่เกี่ยวข้องหรือไม่
                $lotKey = 'lot' . $measurement['lot'];
                if (!isset($lotIds[$lotKey])) {
                    error_log("Missing lot for strain measurement: " . json_encode($measurement));
                    continue; // ข้ามถ้าไม่พบล็อต
                }
                
                // ข้ามถ้าไม่มีค่า
                if (!isset($measurement['value']) || $measurement['value'] === '') {
                    continue;
                }
                
                $lotId = $lotIds[$lotKey];
                $position = intval($measurement['position']);
                $value = floatval($measurement['value']);
                
                $stmt = $conn->prepare("INSERT INTO strain_measurements (lot_id, position, value) 
                                        VALUES (?, ?, ?)");
                
                if (!$stmt) {
                    throw new Exception("Prepare strain statement failed: " . $conn->error);
                }
                
                try {
                    $stmt->bind_param("iid", 
                        $lotId, 
                        $position, 
                        $value
                    );
                } catch (Exception $e) {
                    throw new Exception("Strain measurement parameter binding error: " . $e->getMessage() . 
                                       "\nMeasurement data: " . json_encode($measurement));
                }
                
                if (!$stmt->execute()) {
                    throw new Exception("Execute strain statement failed: " . $stmt->error);
                }
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // ส่งข้อมูลกลับ
        echo json_encode(['status' => 'success', 'message' => 'บันทึกข้อมูลเรียบร้อย', 'id' => $inspectionId]);
        
    } catch (Exception $e) {
        // ถ้าเกิดข้อผิดพลาดให้ Rollback transaction
        if (isset($conn) && $conn->ping()) {
            $conn->rollback();
        }
        
        // บันทึกข้อผิดพลาดไว้ในล็อก
        error_log("Save inspection error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        
        // ส่งข้อความ error กลับ
        echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    } finally {
        // ปิดการเชื่อมต่อ
        if (isset($conn) && $conn->ping()) {
            $conn->close();
        }
    }
}

// ฟังก์ชันดึงรายการการตรวจสอบทั้งหมด
function getInspections() {
    try {
        $conn = getConnection();
        
        // รับพารามิเตอร์จากคำขอ GET
        $startDate = isset($_GET['startDate']) ? $_GET['startDate'] : null;
        $endDate = isset($_GET['endDate']) ? $_GET['endDate'] : null;
        $shift = isset($_GET['shift']) ? $_GET['shift'] : null;
        $machine = isset($_GET['machine']) ? $_GET['machine'] : null;
        $item = isset($_GET['item']) ? $_GET['item'] : null;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 1000; // จำกัดจำนวนรายการที่ดึง
        
        // สร้างคำสั่ง SQL พื้นฐาน - ใช้ join แทน subquery เพื่อประสิทธิภาพ
        $sql = "SELECT i.*, il.result
                FROM inspections i
                LEFT JOIN (
                    SELECT DISTINCT inspection_id, result
                    FROM inspection_lots
                ) il ON i.id = il.inspection_id
                WHERE 1=1";
        
        // เพิ่มเงื่อนไขการกรอง
        $params = [];
        $types = "";
        
        if ($startDate && $endDate) {
            $sql .= " AND i.production_date BETWEEN ? AND ?";
            $types .= "ss";
            $params[] = $startDate;
            $params[] = $endDate;
        }
        
        if ($shift) {
            $sql .= " AND i.shift = ?";
            $types .= "s";
            $params[] = $shift;
        }
        
        if ($machine) {
            $sql .= " AND i.machine_no = ?";
            $types .= "s";
            $params[] = $machine;
        }
        
        if ($item) {
            $sql .= " AND i.item_number LIKE ?";
            $types .= "s";
            $params[] = "%$item%";
        }
        
        // เพิ่มการเรียงลำดับและจำกัดจำนวน
        $sql .= " ORDER BY i.created_at DESC LIMIT ?";
        $types .= "i";
        $params[] = $limit;
        
        // เตรียมคำสั่ง SQL
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        // ผูกพารามิเตอร์
        if (!empty($params)) {
            $bindParams = [];
            $bindParams[] = &$types;
            
            foreach ($params as $key => $value) {
                $bindParams[] = &$params[$key];
            }
            
            call_user_func_array([$stmt, 'bind_param'], $bindParams);
        }
        
        // ดำเนินการคำสั่ง
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        
        $inspections = [];
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $inspections[] = $row;
            }
        }
        
        // ส่งข้อมูลกลับในรูปแบบ JSON พร้อมทำความสะอาดข้อมูล
        echo json_encode(['status' => 'success', 'data' => sanitizeOutput($inspections)]);
        
    } catch (Exception $e) {
        error_log("Get inspections error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    } finally {
        // ปิดการเชื่อมต่อ
        if (isset($conn) && $conn->ping()) {
            $conn->close();
        }
    }
}

// ฟังก์ชันดึงข้อมูลการตรวจสอบตาม ID
function getInspection($id) {
    try {
        $conn = getConnection();
        
        // แปลง $id เป็นตัวเลข (ต้องแปลงแล้วจากตัวเรียกฟังก์ชัน)
        $id = intval($id);
        
        // 1. ดึงข้อมูลหลักของการตรวจสอบ
        $stmt = $conn->prepare("SELECT * FROM inspections WHERE id = ?");
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute statement failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            echo json_encode(['status' => 'error', 'message' => 'ไม่พบข้อมูลการตรวจสอบ']);
            return;
        }
        
        $inspection = $result->fetch_assoc();
        
        // 2. ดึงข้อมูลล็อต
        $stmt = $conn->prepare("SELECT * FROM inspection_lots WHERE inspection_id = ?");
        if (!$stmt) {
            throw new Exception("Prepare lots statement failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute lots statement failed: " . $stmt->error);
        }
        
        $result = $stmt->get_result();
        
        $lots = [];
        while ($row = $result->fetch_assoc()) {
            $lotId = $row['id'];
            
            // 3. ดึงข้อมูลข้อบกพร่องของแต่ละล็อต
            $defectStmt = $conn->prepare("SELECT * FROM lot_defects WHERE lot_id = ?");
            if (!$defectStmt) {
                throw new Exception("Prepare defects statement failed: " . $conn->error);
            }
            
            $defectStmt->bind_param("i", $lotId);
            
            if (!$defectStmt->execute()) {
                throw new Exception("Execute defects statement failed: " . $defectStmt->error);
            }
            
            $defectResult = $defectStmt->get_result();
            
            $defects = [];
            while ($defectRow = $defectResult->fetch_assoc()) {
                $defects[] = $defectRow;
            }
            
            // 4. ดึงข้อมูลการวัดความเครียดของแต่ละล็อต
            $strainStmt = $conn->prepare("SELECT * FROM strain_measurements WHERE lot_id = ?");
            if (!$strainStmt) {
                throw new Exception("Prepare strain statement failed: " . $conn->error);
            }
            
            $strainStmt->bind_param("i", $lotId);
            
            if (!$strainStmt->execute()) {
                throw new Exception("Execute strain statement failed: " . $strainStmt->error);
            }
            
            $strainResult = $strainStmt->get_result();
            
            $strainMeasurements = [];
            while ($strainRow = $strainResult->fetch_assoc()) {
                $strainMeasurements[] = $strainRow;
            }
            
            $row['defects'] = $defects;
            $row['strainMeasurements'] = $strainMeasurements;
            $lots[] = $row;
        }
        
        // เพิ่มข้อมูลล็อตเข้าไปในข้อมูลการตรวจสอบ
        $inspection['lots'] = $lots;
        
        // ส่งข้อมูลกลับในรูปแบบ JSON พร้อมทำความสะอาดข้อมูล
        echo json_encode(['status' => 'success', 'data' => sanitizeOutput($inspection)]);
        
    } catch (Exception $e) {
        error_log("Get inspection error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    } finally {
        // ปิดการเชื่อมต่อ
        if (isset($conn) && $conn->ping()) {
            $conn->close();
        }
    }
}

// ฟังก์ชันดึงสรุปข้อมูลการตรวจสอบ
function getSummaryData() {
    try {
        $conn = getConnection();
        
        // สร้าง array สำหรับเก็บข้อมูลสรุป
        $summary = [
            'total' => 0,
            'accept' => 0,
            'reject' => 0,
            'today' => 0,
            'by_machine' => [],
            'by_shift' => [],
            'by_defect' => []
        ];
        
        // 1. จำนวนการตรวจสอบทั้งหมด
        $sql = "SELECT COUNT(*) as total FROM inspections";
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $summary['total'] = intval($row['total']);
        }
        
        // 2. จำนวนที่ผ่าน/ไม่ผ่านการตรวจสอบ
        $sql = "SELECT il.result, COUNT(DISTINCT i.id) as count 
                FROM inspections i
                JOIN inspection_lots il ON i.id = il.inspection_id
                WHERE il.result IN ('Accept', 'Reject')
                GROUP BY il.result";
        
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                if ($row['result'] === 'Accept') {
                    $summary['accept'] = intval($row['count']);
                } else if ($row['result'] === 'Reject') {
                    $summary['reject'] = intval($row['count']);
                }
            }
        }
        
        // 3. จำนวนการตรวจสอบวันนี้
        $sql = "SELECT COUNT(*) as today FROM inspections 
                WHERE DATE(created_at) = CURDATE()";
        
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $summary['today'] = intval($row['today']);
        }
        
        // 4. จำนวนตามเครื่องจักร
        $sql = "SELECT machine_no, COUNT(*) as count 
                FROM inspections 
                GROUP BY machine_no 
                ORDER BY count DESC 
                LIMIT 10";
        
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $summary['by_machine'][] = [
                    'machine' => $row['machine_no'],
                    'count' => intval($row['count'])
                ];
            }
        }
        
        // 5. จำนวนตามกะ
        $sql = "SELECT shift, COUNT(*) as count 
                FROM inspections 
                GROUP BY shift";
        
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $summary['by_shift'][] = [
                    'shift' => $row['shift'],
                    'count' => intval($row['count'])
                ];
            }
        }
        
        // 6. จำนวนข้อบกพร่องที่พบมากที่สุด
        $sql = "SELECT ld.defect_code, COUNT(*) as count 
                FROM lot_defects ld
                JOIN inspection_lots il ON ld.lot_id = il.id
                GROUP BY ld.defect_code 
                ORDER BY count DESC 
                LIMIT 10";
        
        $result = $conn->query($sql);
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $summary['by_defect'][] = [
                    'defect_code' => $row['defect_code'],
                    'count' => intval($row['count'])
                ];
            }
        }
        
        // ส่งข้อมูลกลับในรูปแบบ JSON พร้อมทำความสะอาดข้อมูล
        echo json_encode(['status' => 'success', 'data' => sanitizeOutput($summary)]);
        
    } catch (Exception $e) {
        error_log("Get summary error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
        echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    } finally {
        // ปิดการเชื่อมต่อ
        if (isset($conn) && $conn->ping()) {
            $conn->close();
        }
    }
}
?>