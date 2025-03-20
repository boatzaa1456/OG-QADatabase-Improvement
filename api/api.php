<?php
// ป้องกันการแสดง PHP errors ไปยัง output
ini_set('display_errors', 0);
error_reporting(E_ALL);

// บันทึก errors แทนการแสดงผล
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// กำหนดให้สามารถรับข้อมูลได้จากทุกแหล่ง (สำหรับการทดสอบเท่านั้น ไม่แนะนำสำหรับการใช้งานจริง)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');
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
if (!empty($jsonInput)) {
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
} else {
    $data = [];
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
                getInspection($_GET['id']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Invalid request. ID is required.']);
            }
            break;
            
        default:
            // ถ้าไม่มี action ที่ตรงกัน ส่งข้อความ error กลับ
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
            break;
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}

// ฟังก์ชันบันทึกข้อมูลการตรวจสอบ
function saveInspection($data) {
    try {
        $conn = getConnection();
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (empty($data)) {
            echo json_encode(['status' => 'error', 'message' => 'No data provided']);
            return;
        }
        
        // ตรวจสอบฟิลด์ที่จำเป็น
        $requiredFields = ['docPT', 'productionDate', 'shift', 'itemNumber', 'machineNo', 'totalProduct', 'samplingDate', 'workOrder', 'inspector', 'supervisor'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                echo json_encode(['status' => 'error', 'message' => "Missing required field: $field"]);
                return;
            }
        }
        
        // เริ่ม transaction
        $conn->begin_transaction();
        
        // เพิ่มบรรทัดนี้ตรงนี้ ก่อนใช้งาน $lotIds
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
        $productionType = isset($data['productionType']) ? $data['productionType'] : 1;
        $rework = isset($data['rework']) ? ($data['rework'] ? 1 : 0) : 0;
        $destroy = isset($data['destroy']) ? ($data['destroy'] ? 1 : 0) : 0;
        $useJig = isset($data['useJig']) ? ($data['useJig'] ? 1 : 0) : 0;
        $noJig = isset($data['noJig']) ? ($data['noJig'] ? 1 : 0) : 0;
        $operation = isset($data['operation']) ? $data['operation'] : '';
        $remarks = isset($data['remarks']) ? $data['remarks'] : '';
        
        $stmt->bind_param("sssssiiiiiisssssss", 
            $data['docPT'], 
            $data['productionDate'], 
            $data['shift'], 
            $data['itemNumber'], 
            $gaugeMark, 
            $productionType, 
            $rework, 
            $destroy, 
            $useJig, 
            $noJig, 
            $data['machineNo'], 
            $data['totalProduct'], 
            $data['samplingDate'], 
            $data['workOrder'], 
            $operation, 
            $data['inspector'], 
            $data['supervisor'], 
            $remarks
        );
        
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
                $piecesPerLot = isset($lot['piecesPerLot']) ? $lot['piecesPerLot'] : 0;
                $description = isset($lot['description']) ? $lot['description'] : '';
                $palletNo = isset($lot['palletNo']) ? $lot['palletNo'] : '';
                $strainStd = isset($lot['strainStd']) ? $lot['strainStd'] : null;
                $firstSampleSize = isset($lot['firstSampleSize']) ? $lot['firstSampleSize'] : null;
                $firstSampleAcRe = isset($lot['firstSampleAcRe']) ? $lot['firstSampleAcRe'] : '';
                $secondSampleSize = isset($lot['secondSampleSize']) ? $lot['secondSampleSize'] : null;
                $secondSampleAcRe = isset($lot['secondSampleAcRe']) ? $lot['secondSampleAcRe'] : '';
                $result = isset($lot['result']) ? $lot['result'] : '';
                $qp = isset($lot['qp']) ? $lot['qp'] : '';
                $strainResult = isset($lot['strainResult']) ? $lot['strainResult'] : '';
                
                $stmt->bind_param("isissdisissss", 
                    $inspectionId, 
                    $lot['lotNumber'], 
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
                    continue; // ข้ามถ้าไม่พบล็อต
                }
                
                $lotId = $lotIds[$lotKey];
                $count = isset($defect['count']) ? $defect['count'] : 0;
                
                // ข้ามถ้าไม่มีข้อบกพร่อง
                if ($count <= 0) {
                    continue;
                }
                
                $stmt = $conn->prepare("INSERT INTO lot_defects (lot_id, defect_code, defect_count) 
                                        VALUES (?, ?, ?)");
                
                if (!$stmt) {
                    throw new Exception("Prepare defect statement failed: " . $conn->error);
                }
                
                $stmt->bind_param("isi", 
                    $lotId, 
                    $defect['defectCode'], 
                    $count
                );
                
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
                    continue; // ข้ามถ้าไม่พบล็อต
                }
                
                // ข้ามถ้าไม่มีค่า
                if (!isset($measurement['value']) || $measurement['value'] === '') {
                    continue;
                }
                
                $lotId = $lotIds[$lotKey];
                
                $stmt = $conn->prepare("INSERT INTO strain_measurements (lot_id, position, value) 
                                        VALUES (?, ?, ?)");
                
                if (!$stmt) {
                    throw new Exception("Prepare strain statement failed: " . $conn->error);
                }
                
                $stmt->bind_param("iid", 
                    $lotId, 
                    $measurement['position'], 
                    $measurement['value']
                );
                
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
        
        // คำสั่ง SQL สำหรับดึงข้อมูล
        $sql = "SELECT id, doc_pt, production_date, shift, item_number, machine_no, total_product, created_at 
                FROM inspections ORDER BY created_at DESC";
        
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Query error: " . $conn->error);
        }
        
        $inspections = [];
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $inspections[] = $row;
            }
        }
        
        // ส่งข้อมูลกลับในรูปแบบ JSON
        echo json_encode(['status' => 'success', 'data' => $inspections]);
        
    } catch (Exception $e) {
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
        
        // แปลง $id เป็นตัวเลข
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
        
        // ส่งข้อมูลกลับในรูปแบบ JSON
        echo json_encode(['status' => 'success', 'data' => $inspection]);
        
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    } finally {
        // ปิดการเชื่อมต่อ
        if (isset($conn) && $conn->ping()) {
            $conn->close();
        }
    }
}
?>