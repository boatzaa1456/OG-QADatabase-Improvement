<?php
/**
 * Inspection Controller
 * ตัวควบคุมสำหรับจัดการข้อมูลการตรวจสอบ
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

require_once 'controllers/BaseController.php';
require_once 'models/Inspection.php';

class InspectionController extends BaseController {
    private $inspectionModel;
    
    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct();
        $this->inspectionModel = new Inspection();
    }
    
    /**
     * ดึงข้อมูลการตรวจสอบทั้งหมด (GET /inspection)
     */
    public function index($id = null, $data = []) {
        // รับพารามิเตอร์การกรอง
        $filters = [
            'start_date' => isset($_GET['start_date']) ? $_GET['start_date'] : null,
            'end_date' => isset($_GET['end_date']) ? $_GET['end_date'] : null,
            'shift' => isset($_GET['shift']) ? $_GET['shift'] : null,
            'machine' => isset($_GET['machine']) ? $_GET['machine'] : null,
            'item' => isset($_GET['item']) ? $_GET['item'] : null,
            'inspector' => isset($_GET['inspector']) ? $_GET['inspector'] : null,
            'created_date' => isset($_GET['created_date']) ? $_GET['created_date'] : null
        ];
        
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 1000;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
        
        // ดึงข้อมูลการตรวจสอบ
        $inspections = $this->inspectionModel->getAll($filters, $limit, $offset);
        
        return $inspections;
    }
    
    /**
     * ดึงข้อมูลการตรวจสอบตาม ID (GET /inspection/id)
     */
    public function get($id = null, $data = []) {
        if (!$id) {
            throw new Exception("ID is required", 400);
        }
        
        // ดึงข้อมูลการตรวจสอบพร้อมข้อมูลที่เกี่ยวข้อง
        $inspection = $this->inspectionModel->getWithRelated($id);
        
        if (!$inspection) {
            throw new Exception("Inspection not found", 404);
        }
        
        return $inspection;
    }
    
    /**
     * สร้างการตรวจสอบใหม่ (POST /inspection)
     */
    public function post($id = null, $data = []) {
        // ตรวจสอบข้อมูลที่จำเป็น
        $requiredFields = ['docPT', 'productionDate', 'shift', 'itemNumber', 'machineNo', 'totalProduct', 'samplingDate', 'workOrder', 'inspector', 'supervisor'];
        $missingFields = [];
        
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $missingFields[] = $field;
            }
        }
        
        if (!empty($missingFields)) {
            throw new Exception("Missing required fields: " . implode(', ', $missingFields), 400);
        }
        
        // ตรวจสอบว่ามีข้อมูลล็อตหรือไม่
        if (empty($data['lots']) || !is_array($data['lots'])) {
            throw new Exception("No lot data provided", 400);
        }
        
        // ตรวจสอบว่ามีล็อตที่มีข้อมูลหรือไม่
        $hasValidLot = false;
        foreach ($data['lots'] as $lot) {
            if (!empty($lot['lotNumber'])) {
                $hasValidLot = true;
                break;
            }
        }
        
        if (!$hasValidLot) {
            throw new Exception("At least one lot is required", 400);
        }
        
        // สร้างการตรวจสอบใหม่
        $id = $this->inspectionModel->createWithRelated($data);
        
        // บันทึกประวัติการสร้างการตรวจสอบ
        Logger::info("Created inspection #{$id}", [
            'user_id' => $_SESSION['user_id'] ?? null,
            'doc_pt' => $data['docPT'],
            'item_number' => $data['itemNumber']
        ]);
        
        return [
            'message' => 'Inspection created successfully',
            'id' => $id
        ];
    }
    
    /**
     * อัพเดทข้อมูลการตรวจสอบ (PUT /inspection/id)
     */
    public function put($id = null, $data = []) {
        if (!$id) {
            throw new Exception("ID is required", 400);
        }
        
        // ตรวจสอบว่าการตรวจสอบมีอยู่จริงหรือไม่
        $inspection = $this->inspectionModel->getById($id);
        
        if (!$inspection) {
            throw new Exception("Inspection not found", 404);
        }
        
        // ตรวจสอบสิทธิ์ในการแก้ไข (ถ้ามีการใช้งานระบบยืนยันตัวตน)
        $currentUser = Auth::getCurrentUser();
        if ($currentUser) {
            // ถ้าเป็น viewer ไม่สามารถแก้ไขได้
            if ($currentUser['role'] === 'viewer') {
                throw new Exception("You do not have permission to update inspection", 403);
            }
            
            // ถ้าเป็น inspector สามารถแก้ไขได้เฉพาะของตัวเอง
            if ($currentUser['role'] === 'inspector' && isset($inspection['inspector']) && $inspection['inspector'] !== $currentUser['username']) {
                throw new Exception("You can only update your own inspections", 403);
            }
        }
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (empty($data)) {
            throw new Exception("No data provided", 400);
        }
        
        // อัพเดทข้อมูลการตรวจสอบ
        $this->inspectionModel->updateWithRelated($id, $data);
        
        // บันทึกประวัติการอัพเดทการตรวจสอบ
        Logger::info("Updated inspection #{$id}", [
            'user_id' => $_SESSION['user_id'] ?? null,
            'fields_updated' => array_keys($data)
        ]);
        
        return [
            'message' => 'Inspection updated successfully',
            'id' => $id
        ];
    }
    
    /**
     * ลบการตรวจสอบ (DELETE /inspection/id)
     */
    public function delete($id = null, $data = []) {
        if (!$id) {
            throw new Exception("ID is required", 400);
        }
        
        // ตรวจสอบว่าการตรวจสอบมีอยู่จริงหรือไม่
        $inspection = $this->inspectionModel->getById($id);
        
        if (!$inspection) {
            throw new Exception("Inspection not found", 404);
        }
        
        // ตรวจสอบสิทธิ์ในการลบ (ถ้ามีการใช้งานระบบยืนยันตัวตน)
        $currentUser = Auth::getCurrentUser();
        if ($currentUser) {
            // ถ้าไม่ใช่ admin ไม่สามารถลบได้
            if ($currentUser['role'] !== 'admin') {
                throw new Exception("You do not have permission to delete inspection", 403);
            }
        }
        
        // ลบการตรวจสอบ
        $this->inspectionModel->delete($id);
        
        // บันทึกประวัติการลบการตรวจสอบ
        Logger::warning("Deleted inspection #{$id}", [
            'user_id' => $_SESSION['user_id'] ?? null
        ]);
        
        return [
            'message' => 'Inspection deleted successfully',
            'id' => $id
        ];
    }
    
    /**
     * ดึงข้อมูลสรุป (GET /inspection/summary)
     */
    public function getSummary($id = null, $data = []) {
        try {
            $db = getPDO();
            
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
            $result = $db->query($sql);
            if ($result) {
                $row = $result->fetch();
                $summary['total'] = intval($row['total']);
            }
            
            // 2. จำนวนที่ผ่าน/ไม่ผ่านการตรวจสอบ
            $sql = "SELECT il.result, COUNT(DISTINCT i.id) as count 
                    FROM inspections i
                    JOIN inspection_lots il ON i.id = il.inspection_id
                    WHERE il.result IN ('Accept', 'Reject')
                    GROUP BY il.result";
            
            $result = $db->query($sql);
            if ($result) {
                while ($row = $result->fetch()) {
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
            
            $result = $db->query($sql);
            if ($result) {
                $row = $result->fetch();
                $summary['today'] = intval($row['today']);
            }
            
            // 4. จำนวนตามเครื่องจักร
            $sql = "SELECT machine_no, COUNT(*) as count 
                    FROM inspections 
                    GROUP BY machine_no 
                    ORDER BY count DESC 
                    LIMIT 10";
            
            $result = $db->query($sql);
            if ($result) {
                while ($row = $result->fetch()) {
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
            
            $result = $db->query($sql);
            if ($result) {
                while ($row = $result->fetch()) {
                    $summary['by_shift'][] = [
                        'shift' => $row['shift'],
                        'count' => intval($row['count'])
                    ];
                }
            }
            
            // 6. จำนวนข้อบกพร่องที่พบมากที่สุด
            $sql = "SELECT ld.defect_code, SUM(ld.defect_count) as count 
                    FROM lot_defects ld
                    JOIN inspection_lots il ON ld.lot_id = il.id
                    JOIN defect_types dt ON ld.defect_code = dt.id
                    GROUP BY ld.defect_code 
                    ORDER BY count DESC 
                    LIMIT 10";
            
            $result = $db->query($sql);
            if ($result) {
                while ($row = $result->fetch()) {
                    $summary['by_defect'][] = [
                        'defect_code' => $row['defect_code'],
                        'count' => intval($row['count'])
                    ];
                }
            }
            
            return $summary;
        } catch (Exception $e) {
            throw new Exception("Error fetching summary data: " . $e->getMessage());
        }
    }
}
?>