<?php
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
$data = json_decode(file_get_contents('php://input'), true);

// กำหนดการทำงานตาม action
switch ($action) {
    case 'save_inspection':
        if ($requestMethod === 'POST') {
            // บันทึกข้อมูลการตรวจสอบ
            saveInspection($data);
        }
        break;
        
    case 'get_inspections':
        if ($requestMethod === 'GET') {
            // ดึงรายการการตรวจสอบทั้งหมด
            getInspections();
        }
        break;
        
    case 'get_inspection':
        if ($requestMethod === 'GET' && isset($_GET['id'])) {
            // ดึงข้อมูลการตรวจสอบตาม ID
            getInspection($_GET['id']);
        }
        break;
        
    default:
        // ถ้าไม่มี action ที่ตรงกัน ส่งข้อความ error กลับ
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}

// ฟังก์ชันบันทึกข้อมูลการตรวจสอบ
function saveInspection($data) {
    $conn = getConnection();
    
    try {
        // เริ่ม transaction
        $conn->begin_transaction();
        
        // เพิ่มบรรทัดนี้ตรงนี้ ก่อนใช้งาน $lotIds
        $lotIds = [];
        
        // 1. บันทึกข้อมูลหลักของการตรวจสอบ
        $stmt = $conn->prepare("INSERT INTO inspections (doc_pt, production_date, shift, item_number, gauge_mark, 
                                production_type, is_rework, is_destroy, use_jig, no_jig, machine_no, 
                                total_product, sampling_date, work_order, operation, inspector, supervisor, remarks, created_at) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        
        $stmt->bind_param("sssssiiiiiisssssss", 
            $data['docPT'], 
            $data['productionDate'], 
            $data['shift'], 
            $data['itemNumber'], 
            $data['gaugeMark'], 
            $data['productionType'], 
            $data['rework'] ? 1 : 0, 
            $data['destroy'] ? 1 : 0, 
            $data['useJig'] ? 1 : 0, 
            $data['noJig'] ? 1 : 0, 
            $data['machineNo'], 
            $data['totalProduct'], 
            $data['samplingDate'], 
            $data['workOrder'], 
            $data['operation'], 
            $data['inspector'], 
            $data['supervisor'], 
            $data['remarks']
        );
        
        $stmt->execute();
        
        // รับค่า ID ที่เพิ่งบันทึก
        $inspectionId = $conn->insert_id;
        
        // 2. บันทึกข้อมูลล็อต
        if (!empty($data['lots'])) {
            foreach ($data['lots'] as $lot) {
                $stmt = $conn->prepare("INSERT INTO inspection_lots (inspection_id, lot_number, pieces_per_lot, 
                                        description, pallet_no, strain_std, first_sample_size, first_sample_ac_re, 
                                        second_sample_size, second_sample_ac_re, result, qp, strain_result) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                $stmt->bind_param("isissdisissss", 
                    $inspectionId, 
                    $lot['lotNumber'], 
                    $lot['piecesPerLot'], 
                    $lot['description'], 
                    $lot['palletNo'], 
                    $lot['strainStd'], 
                    $lot['firstSampleSize'], 
                    $lot['firstSampleAcRe'], 
                    $lot['secondSampleSize'], 
                    $lot['secondSampleAcRe'], 
                    $lot['result'], 
                    $lot['qp'], 
                    $lot['strainResult']
                );
                
                $stmt->execute();
                
                // รับค่า ID ของล็อตที่เพิ่งบันทึก
                $lotId = $conn->insert_id;
                
                // บันทึกล็อตเพื่อใช้ในการบันทึกข้อมูลอื่นๆ ที่เกี่ยวข้อง
                $lotIds[$lot['lotNumber']] = $lotId;
            }
        }
        
        // 3. บันทึกข้อมูลข้อบกพร่อง
        if (!empty($data['defects'])) {
            foreach ($data['defects'] as $defect) {
                // ใช้ $lotIds ที่จัดเก็บไว้
                $lotId = $lotIds['lot' . $defect['lot']];
                
                $stmt = $conn->prepare("INSERT INTO lot_defects (lot_id, defect_code, defect_count) 
                                        VALUES (?, ?, ?)");
                
                $stmt->bind_param("isi", 
                    $lotId, 
                    $defect['defectCode'], 
                    $defect['count']
                );
                
                $stmt->execute();
            }
        }
        
        // 4. บันทึกข้อมูลการวัดความเครียด
        if (!empty($data['strainMeasurements'])) {
            foreach ($data['strainMeasurements'] as $measurement) {
                // ใช้ $lotIds ที่จัดเก็บไว้
                $lotId = $lotIds['lot' . $measurement['lot']];
                
                $stmt = $conn->prepare("INSERT INTO strain_measurements (lot_id, position, value) 
                                        VALUES (?, ?, ?)");
                
                $stmt->bind_param("iid", 
                    $lotId, 
                    $measurement['position'], 
                    $measurement['value']
                );
                
                $stmt->execute();
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        // ส่งข้อมูลกลับ
        echo json_encode(['status' => 'success', 'message' => 'บันทึกข้อมูลเรียบร้อย', 'id' => $inspectionId]);
        
    } catch (Exception $e) {
        // ถ้าเกิดข้อผิดพลาดให้ Rollback transaction
        $conn->rollback();
        
        // ส่งข้อความ error กลับ
        echo json_encode(['status' => 'error', 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
    
    // ปิดการเชื่อมต่อ
    $conn->close();
}

// ฟังก์ชันดึงรายการการตรวจสอบทั้งหมด
function getInspections() {
    $conn = getConnection();
    
    // คำสั่ง SQL สำหรับดึงข้อมูล
    $sql = "SELECT id, doc_pt, production_date, shift, item_number, machine_no, total_product, created_at 
            FROM inspections ORDER BY created_at DESC";
    
    $result = $conn->query($sql);
    
    $inspections = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $inspections[] = $row;
        }
    }
    
    // ส่งข้อมูลกลับในรูปแบบ JSON
    echo json_encode(['status' => 'success', 'data' => $inspections]);
    
    // ปิดการเชื่อมต่อ
    $conn->close();
}

// ฟังก์ชันดึงข้อมูลการตรวจสอบตาม ID
function getInspection($id) {
    $conn = getConnection();
    
    // แปลง $id เป็นตัวเลข
    $id = intval($id);
    
    // 1. ดึงข้อมูลหลักของการตรวจสอบ
    $stmt = $conn->prepare("SELECT * FROM inspections WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['status' => 'error', 'message' => 'ไม่พบข้อมูลการตรวจสอบ']);
        $conn->close();
        return;
    }
    
    $inspection = $result->fetch_assoc();
    
    // 2. ดึงข้อมูลล็อต
    $stmt = $conn->prepare("SELECT * FROM inspection_lots WHERE inspection_id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $lots = [];
    while ($row = $result->fetch_assoc()) {
        $lotId = $row['id'];
        
        // 3. ดึงข้อมูลข้อบกพร่องของแต่ละล็อต
        $defectStmt = $conn->prepare("SELECT * FROM lot_defects WHERE lot_id = ?");
        $defectStmt->bind_param("i", $lotId);
        $defectStmt->execute();
        $defectResult = $defectStmt->get_result();
        
        $defects = [];
        while ($defectRow = $defectResult->fetch_assoc()) {
            $defects[] = $defectRow;
        }
        
        // 4. ดึงข้อมูลการวัดความเครียดของแต่ละล็อต
        $strainStmt = $conn->prepare("SELECT * FROM strain_measurements WHERE lot_id = ?");
        $strainStmt->bind_param("i", $lotId);
        $strainStmt->execute();
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
    
    // ปิดการเชื่อมต่อ
    $conn->close();
}
?>