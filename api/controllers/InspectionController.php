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
    
    // กฎการตรวจสอบความถูกต้อง
    protected $validationRules = [
        'docPT' => ['required', 'max:20'],
        'productionDate' => ['required', 'date'],
        'shift' => ['required', 'in:M,A,N'],
        'itemNumber' => ['required', 'max:20'],
        'machineNo' => ['required', 'max:20'],
        'totalProduct' => ['required', 'numeric', 'min:1'],
        'samplingDate' => ['required', 'date'],
        'workOrder' => ['required', 'max:50'],
        'inspector' => ['required', 'max:50'],
        'supervisor' => ['required', 'max:50'],
        'lots' => ['required', 'array', 'min:1']
    ];
    
    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct();
        $this->inspectionModel = new Inspection();
    }
    
    /**
     * ดึงข้อมูลการตรวจสอบทั้งหมด (GET /inspection)
     * @param int|null $id ไม่ใช้
     * @param array $data ข้อมูลเพิ่มเติม
     * @return array ข้อมูลการตรวจสอบ
     */
    public function index($id = null, $data = []) {
        try {
            // รับพารามิเตอร์การกรอง
            $filters = [
                'start_date' => isset($_GET['start_date']) ? sanitizeInput($_GET['start_date']) : null,
                'end_date' => isset($_GET['end_date']) ? sanitizeInput($_GET['end_date']) : null,
                'shift' => isset($_GET['shift']) ? sanitizeInput($_GET['shift']) : null,
                'machine' => isset($_GET['machine']) ? sanitizeInput($_GET['machine']) : null,
                'item' => isset($_GET['item']) ? sanitizeInput($_GET['item']) : null,
                'inspector' => isset($_GET['inspector']) ? sanitizeInput($_GET['inspector']) : null,
                'status' => isset($_GET['status']) ? sanitizeInput($_GET['status']) : null,
                'created_date' => isset($_GET['created_date']) ? sanitizeInput($_GET['created_date']) : null
            ];
            
            // ตรวจสอบและแปลงค่าวันที่
            if (!empty($filters['start_date']) && !strtotime($filters['start_date'])) {
                throw new ValidationException("Invalid start date format", 400);
            }
            
            if (!empty($filters['end_date']) && !strtotime($filters['end_date'])) {
                throw new ValidationException("Invalid end date format", 400);
            }
            
            // ตรวจสอบว่า shift ถูกต้อง
            if (!empty($filters['shift']) && !in_array($filters['shift'], ['M', 'A', 'N'])) {
                throw new ValidationException("Invalid shift value", 400);
            }
            
            // จำกัดจำนวนรายการที่ดึง
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
            $limit = min($limit, 1000); // ไม่เกิน 1000 รายการ
            
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            
            // ดึงข้อมูลการตรวจสอบ
            $inspections = $this->inspectionModel->getAll($filters, $limit, $offset);
            
            // บันทึกการเข้าถึง
            $currentUser = Auth::getCurrentUser();
            Logger::info("Viewed inspection list", [
                'user_id' => $currentUser ? $currentUser['id'] : null,
                'filters' => $filters,
                'count' => count($inspections)
            ]);
            
            // แปลงวันที่เป็นรูปแบบที่อ่านง่ายก่อนส่งกลับ
            foreach ($inspections as &$inspection) {
                if (isset($inspection['production_date'])) {
                    $inspection['production_date_formatted'] = date('d/m/Y', strtotime($inspection['production_date']));
                }
                if (isset($inspection['created_at'])) {
                    $inspection['created_at_formatted'] = date('d/m/Y H:i', strtotime($inspection['created_at']));
                }
            }
            
            return $this->transformOutput($inspections);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            Logger::error("Error fetching inspection list: " . $e->getMessage());
            throw new Exception("Error retrieving inspections: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * ดึงข้อมูลการตรวจสอบตาม ID (GET /inspection/id)
     * @param int|null $id ID ของการตรวจสอบ
     * @param array $data ข้อมูลเพิ่มเติม
     * @return array ข้อมูลการตรวจสอบ
     */
    public function get($id = null, $data = []) {
        if (!$id) {
            throw new ValidationException("ID is required", 400);
        }
        
        try {
            // ดึงข้อมูลการตรวจสอบพร้อมข้อมูลที่เกี่ยวข้อง
            $inspection = $this->inspectionModel->getWithRelated($id);
            
            if (!$inspection) {
                throw new Exception("Inspection not found", 404);
            }
            
            // บันทึกการเข้าถึง
            $currentUser = Auth::getCurrentUser();
            Logger::info("Viewed inspection #{$id}", [
                'user_id' => $currentUser ? $currentUser['id'] : null
            ]);
            
            // แปลงวันที่เป็นรูปแบบที่อ่านง่ายก่อนส่งกลับ
            if (isset($inspection['production_date'])) {
                $inspection['production_date_formatted'] = date('d/m/Y', strtotime($inspection['production_date']));
            }
            if (isset($inspection['sampling_date'])) {
                $inspection['sampling_date_formatted'] = date('d/m/Y', strtotime($inspection['sampling_date']));
            }
            if (isset($inspection['created_at'])) {
                $inspection['created_at_formatted'] = date('d/m/Y H:i', strtotime($inspection['created_at']));
            }
            
            return $this->transformOutput($inspection);
        } catch (Exception $e) {
            if ($e->getCode() === 404) {
                throw $e;
            }
            
            Logger::error("Error fetching inspection #{$id}: " . $e->getMessage());
            throw new Exception("Error retrieving inspection: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * สร้างการตรวจสอบใหม่ (POST /inspection)
     * @param int|null $id ไม่ใช้
     * @param array $data ข้อมูลการตรวจสอบ
     * @return array ผลลัพธ์การสร้าง
     */
    public function post($id = null, $data = []) {
        try {
            // ตรวจสอบความถูกต้องของข้อมูล
            $errors = $this->validate($data, $this->validationRules);
            
            if (!empty($errors)) {
                throw new ValidationException("Validation failed", 400, null, $errors);
            }
            
            // ตรวจสอบเพิ่มเติมสำหรับข้อมูลล็อต
            if (empty($data['lots']) || !is_array($data['lots'])) {
                throw new ValidationException("At least one lot is required", 400);
            }
            
            $hasValidLot = false;
            foreach ($data['lots'] as $lot) {
                if (!empty($lot['lotNumber'])) {
                    $hasValidLot = true;
                    break;
                }
            }
            
            if (!$hasValidLot) {
                throw new ValidationException("At least one lot with lotNumber is required", 400);
            }
            
            // ตรวจสอบสิทธิ์ในการสร้าง
            $currentUser = Auth::getCurrentUser();
            if ($currentUser && $currentUser['role'] === 'viewer') {
                throw new Exception("You do not have permission to create inspections", 403);
            }
            
            // เพิ่มข้อมูลสถานะเริ่มต้น
            $data['status'] = 'draft';
            
            // สร้างการตรวจสอบใหม่
            $id = $this->inspectionModel->createWithRelated($data);
            
            // บันทึกการสร้าง
            Logger::info("Created inspection #{$id}", [
                'user_id' => $currentUser ? $currentUser['id'] : null,
                'doc_pt' => $data['docPT'] ?? null,
                'item_number' => $data['itemNumber'] ?? null
            ]);
            
            return [
                'message' => 'Inspection created successfully',
                'id' => $id
            ];
        } catch (ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            Logger::error("Error creating inspection: " . $e->getMessage(), [
                'data' => $data,
                'user_id' => $currentUser['id'] ?? null
            ]);
            throw new Exception("Error creating inspection: " . $e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * อัพเดทข้อมูลการตรวจสอบ (PUT /inspection/id)
     * @param int|null $id ID ของการตรวจสอบ
     * @param array $data ข้อมูลการอัพเดท
     * @return array ผลลัพธ์การอัพเดท
     */
    public function put($id = null, $data = []) {
        if (!$id) {
            throw new ValidationException("ID is required", 400);
        }
        
        try {
            // ตรวจสอบว่าการตรวจสอบมีอยู่จริงหรือไม่
            $inspection = $this->inspectionModel->getById($id);
            
            if (!$inspection) {
                throw new Exception("Inspection not found", 404);
            }
            
            // ตรวจสอบความถูกต้องของข้อมูล
            $errors = $this->validate($data);
            
            if (!empty($errors)) {
                throw new ValidationException("Validation failed", 400, null, $errors);
            }
            
            // ตรวจสอบสิทธิ์ในการแก้ไข
            $currentUser = Auth::getCurrentUser();
            if ($currentUser) {
                // ถ้าเป็น viewer ไม่สามารถแก้ไขได้
                if ($currentUser['role'] === 'viewer') {
                    throw new Exception("You do not have permission to update inspections", 403);
                }
                
                // ถ้าเป็น inspector สามารถแก้ไขได้เฉพาะของตัวเอง
                if ($currentUser['role'] === 'inspector' && isset($inspection['inspector']) && $inspection['inspector'] !== $currentUser['username']) {
                    throw new Exception("You can only update your own inspections", 403);
                }
                
                // ถ้าการตรวจสอบถูกอนุมัติแล้ว ไม่สามารถแก้ไขได้ยกเว้น admin หรือ supervisor
                if (isset($inspection['status']) && $inspection['status'] === 'approved' && 
                    $currentUser['role'] !== 'admin' && $currentUser['role'] !== 'supervisor') {
                    throw new Exception("Cannot update approved inspection", 403);
                }
            }
            
            // อัพเดทข้อมูลการตรวจสอบ
            try {
                $this->inspectionModel->updateWithRelated($id, $data);
            } catch (ConcurrencyException $ce) {
                throw $ce; // ส่งต่อข้อยกเว้นแบบเฉพาะสำหรับ concurrency
            }
            
            // บันทึกการอัพเดท
            Logger::info("Updated inspection #{$id}", [
                'user_id' => $currentUser ? $currentUser['id'] : null,
                'fields_updated' => array_keys($data)
            ]);
            
            return [
                'message' => 'Inspection updated successfully',
                'id' => $id
            ];
        } catch (ValidationException $e) {
            throw $e;
        } catch (ConcurrencyException $e) {
            throw new Exception($e->getMessage(), 409);
        } catch (Exception $e) {
            if ($e->getCode() === 404 || $e->getCode() === 403) {
                throw $e;
            }
            
            Logger::error("Error updating inspection #{$id}: " . $e->getMessage(), [
                'data' => $data,
                'user_id' => $currentUser['id'] ?? null
            ]);
            
            throw new Exception("Error updating inspection: " . $e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * ลบการตรวจสอบ (DELETE /inspection/id)
     * @param int|null $id ID ของการตรวจสอบ
     * @param array $data ข้อมูลเพิ่มเติม
     * @return array ผลลัพธ์การลบ
     */
    public function delete($id = null, $data = []) {
        if (!$id) {
            throw new ValidationException("ID is required", 400);
        }
        
        try {
            // ตรวจสอบว่าการตรวจสอบมีอยู่จริงหรือไม่
            $inspection = $this->inspectionModel->getById($id);
            
            if (!$inspection) {
                throw new Exception("Inspection not found", 404);
            }
            
            // ตรวจสอบสิทธิ์ในการลบ
            $currentUser = Auth::getCurrentUser();
            if ($currentUser) {
                // ถ้าไม่ใช่ admin ไม่สามารถลบได้
                if ($currentUser['role'] !== 'admin') {
                    throw new Exception("You do not have permission to delete inspection", 403);
                }
            }
            
            // ล็อคทรัพยากรก่อนลบ
            if (!$this->acquireResourceLock('inspection', $id, 5)) {
                throw new Exception("Could not acquire lock. Another process might be accessing this resource.", 409);
            }
            
            // ลบการตรวจสอบ
            $this->inspectionModel->delete($id);
            
            // ปล่อยล็อค
            $this->releaseResourceLock('inspection', $id);
            
            // ล้างแคช
            if (function_exists('apcu_delete') && APP_ENV === 'production') {
                apcu_delete('inspection_' . $id);
            }
            
            // บันทึกการลบ
            Logger::warning("Deleted inspection #{$id}", [
                'user_id' => $currentUser ? $currentUser['id'] : null
            ]);
            
            return [
                'message' => 'Inspection deleted successfully',
                'id' => $id
            ];
        } catch (Exception $e) {
            if ($e->getCode() === 404 || $e->getCode() === 403 || $e->getCode() === 409) {
                throw $e;
            }
            
            Logger::error("Error deleting inspection #{$id}: " . $e->getMessage(), [
                'user_id' => $currentUser['id'] ?? null
            ]);
            
            throw new Exception("Error deleting inspection: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * เปลี่ยนสถานะการตรวจสอบ (PUT /inspection/status/id)
     * @param int|null $id ID ของการตรวจสอบ
     * @param array $data ข้อมูลสถานะ
     * @return array ผลลัพธ์การเปลี่ยนสถานะ
     */
    public function putStatus($id = null, $data = []) {
        if (!$id) {
            throw new ValidationException("ID is required", 400);
        }
        
        if (!isset($data['status'])) {
            throw new ValidationException("Status is required", 400);
        }
        
        $allowedStatuses = ['draft', 'submitted', 'approved', 'rejected'];
        if (!in_array($data['status'], $allowedStatuses)) {
            throw new ValidationException("Invalid status. Allowed values: " . implode(', ', $allowedStatuses), 400);
        }
        
        try {
            // ตรวจสอบว่าการตรวจสอบมีอยู่จริงหรือไม่
            $inspection = $this->inspectionModel->getById($id);
            
            if (!$inspection) {
                throw new Exception("Inspection not found", 404);
            }
            
            // ตรวจสอบสิทธิ์ในการเปลี่ยนสถานะ
            $currentUser = Auth::getCurrentUser();
            if ($currentUser) {
                // ถ้าเป็น viewer ไม่สามารถเปลี่ยนสถานะได้
                if ($currentUser['role'] === 'viewer') {
                    throw new Exception("You do not have permission to change inspection status", 403);
                }
                
                // ถ้าเป็น inspector
                if ($currentUser['role'] === 'inspector') {
                    // inspector สามารถเปลี่ยนสถานะเป็น submitted เท่านั้น
                    if ($data['status'] !== 'draft' && $data['status'] !== 'submitted') {
                        throw new Exception("Inspectors can only change status to draft or submitted", 403);
                    }
                    
                    // และเฉพาะการตรวจสอบของตัวเอง
                    if (isset($inspection['inspector']) && $inspection['inspector'] !== $currentUser['username']) {
                        throw new Exception("You can only update your own inspections", 403);
                    }
                }
                
                // ถ้าเป็น supervisor หรือ admin สามารถเปลี่ยนสถานะได้ทั้งหมด
            }
            
            // เตรียมข้อมูลสำหรับอัพเดท
            $updateData = [
                'status' => $data['status'],
                'version' => isset($data['version']) ? $data['version'] : null
            ];
            
            // เพิ่มข้อมูลการอนุมัติถ้าเปลี่ยนเป็น approved หรือ rejected
            if ($data['status'] === 'approved' || $data['status'] === 'rejected') {
                $updateData['approval_date'] = date('Y-m-d H:i:s');
                $updateData['approved_by'] = $currentUser ? $currentUser['id'] : null;
            }
            
            // อัพเดทสถานะ
            try {
                $this->inspectionModel->updateWithRelated($id, $updateData);
            } catch (ConcurrencyException $ce) {
                throw $ce; // ส่งต่อข้อยกเว้นแบบเฉพาะสำหรับ concurrency
            }
            
            // บันทึกการเปลี่ยนสถานะ
            Logger::info("Changed inspection #{$id} status to {$data['status']}", [
                'user_id' => $currentUser ? $currentUser['id'] : null,
                'previous_status' => $inspection['status'] ?? null
            ]);
            
            return [
                'message' => 'Inspection status updated successfully',
                'id' => $id,
                'status' => $data['status']
            ];
        } catch (ValidationException $e) {
            throw $e;
        } catch (ConcurrencyException $e) {
            throw new Exception($e->getMessage(), 409);
        } catch (Exception $e) {
            if ($e->getCode() === 404 || $e->getCode() === 403) {
                throw $e;
            }
            
            Logger::error("Error updating inspection #{$id} status: " . $e->getMessage(), [
                'data' => $data,
                'user_id' => $currentUser['id'] ?? null
            ]);
            
            throw new Exception("Error updating inspection status: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * ดึงข้อมูลสรุป (GET /inspection/summary)
     * @param int|null $id ไม่ใช้
     * @param array $data ข้อมูลเพิ่มเติม
     * @return array ข้อมูลสรุป
     */
    public function getSummary($id = null, $data = []) {
        try {
            $db = getPDO();
            
            // ตรวจสอบแคช
            $cacheKey = 'inspection_summary';
            if (function_exists('apcu_fetch') && APP_ENV === 'production') {
                $cached = apcu_fetch($cacheKey, $success);
                if ($success) {
                    return $cached;
                }
            }
            
            $summary = [
                'total' => 0,
                'accept' => 0,
                'reject' => 0,
                'today' => 0,
                'by_machine' => [],
                'by_shift' => [],
                'by_defect' => [],
                'by_status' => [],
                'recent' => []
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
            $sql = "SELECT ld.defect_code, dt.name, SUM(ld.defect_count) as count 
                    FROM lot_defects ld
                    JOIN inspection_lots il ON ld.lot_id = il.id
                    LEFT JOIN defect_types dt ON ld.defect_code = dt.id
                    GROUP BY ld.defect_code, dt.name 
                    ORDER BY count DESC 
                    LIMIT 10";
            
            $result = $db->query($sql);
            if ($result) {
                while ($row = $result->fetch()) {
                    $summary['by_defect'][] = [
                        'defect_code' => $row['defect_code'],
                        'defect_name' => $row['name'] ?? $row['defect_code'],
                        'count' => intval($row['count'])
                    ];
                }
            }
            
            // 7. จำนวนตามสถานะ
            $sql = "SELECT status, COUNT(*) as count 
                    FROM inspections 
                    GROUP BY status";
            
            $result = $db->query($sql);
            if ($result) {
                while ($row = $result->fetch()) {
                    $summary['by_status'][] = [
                        'status' => $row['status'] ?: 'unknown',
                        'count' => intval($row['count'])
                    ];
                }
            }
            
            // 8. การตรวจสอบล่าสุด
            $sql = "SELECT id, doc_pt, production_date, shift, item_number, inspector, created_at 
                    FROM inspections 
                    ORDER BY created_at DESC 
                    LIMIT 5";
            
            $result = $db->query($sql);
            if ($result) {
                while ($row = $result->fetch()) {
                    $summary['recent'][] = [
                        'id' => $row['id'],
                        'doc_pt' => $row['doc_pt'],
                        'production_date' => date('d/m/Y', strtotime($row['production_date'])),
                        'shift' => $row['shift'],
                        'item_number' => $row['item_number'],
                        'inspector' => $row['inspector'],
                        'created_at' => date('d/m/Y H:i', strtotime($row['created_at']))
                    ];
                }
            }
            
            // เก็บในแคช
            if (function_exists('apcu_store') && APP_ENV === 'production') {
                apcu_store($cacheKey, $summary, 300); // แคช 5 นาที
            }
            
            // บันทึกการเข้าถึง
            $currentUser = Auth::getCurrentUser();
            Logger::info("Viewed inspection summary", [
                'user_id' => $currentUser ? $currentUser['id'] : null
            ]);
            
            return $this->transformOutput($summary);
        } catch (Exception $e) {
            Logger::error("Error fetching summary data: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            throw new Exception("Error retrieving summary data: " . $e->getMessage(), 500);
        }
    }
    
    /**
     * ค้นหาการตรวจสอบ (GET /inspection/search)
     * @param int|null $id ไม่ใช้
     * @param array $data ข้อมูลการค้นหา
     * @return array ผลลัพธ์การค้นหา
     */
    public function getSearch($id = null, $data = []) {
        try {
            $searchTerm = isset($_GET['q']) ? sanitizeInput($_GET['q']) : null;
            
            if (empty($searchTerm)) {
                throw new ValidationException("Search term is required", 400);
            }
            
            $db = getPDO();
            
            // ค้นหาในหลายฟิลด์
            $sql = "SELECT id, doc_pt, item_number, machine_no, work_order, production_date, shift, inspector, created_at
                    FROM inspections
                    WHERE doc_pt LIKE ? 
                    OR item_number LIKE ?
                    OR machine_no LIKE ?
                    OR work_order LIKE ?
                    OR inspector LIKE ?
                    LIMIT 100";
            
            $searchPattern = "%{$searchTerm}%";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([
                $searchPattern,
                $searchPattern,
                $searchPattern,
                $searchPattern,
                $searchPattern
            ]);
            
            $results = $stmt->fetchAll();
            
            // แปลงวันที่เป็นรูปแบบที่อ่านง่ายก่อนส่งกลับ
            foreach ($results as &$item) {
                if (isset($item['production_date'])) {
                    $item['production_date_formatted'] = date('d/m/Y', strtotime($item['production_date']));
                }
                if (isset($item['created_at'])) {
                    $item['created_at_formatted'] = date('d/m/Y H:i', strtotime($item['created_at']));
                }
            }
            
            // บันทึกการค้นหา
            $currentUser = Auth::getCurrentUser();
            Logger::info("Searched for inspections", [
                'user_id' => $currentUser ? $currentUser['id'] : null,
                'search_term' => $searchTerm,
                'results_count' => count($results)
            ]);
            
            return [
                'results' => $this->transformOutput($results),
                'count' => count($results)
            ];
        } catch (ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            Logger::error("Error searching inspections: " . $e->getMessage(), [
                'search_term' => $searchTerm ?? null
            ]);
            throw new Exception("Error searching inspections: " . $e->getMessage(), 500);
        }
    }
}
?>