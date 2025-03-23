<?php
/**
 * Defect Controller
 * ตัวควบคุมสำหรับข้อมูลข้อบกพร่อง
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

require_once 'controllers/BaseController.php';
require_once 'models/DefectType.php';
require_once 'models/DefectCategory.php';

class DefectController extends BaseController {
    private $defectTypeModel;
    private $defectCategoryModel;
    
    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct();
        $this->defectTypeModel = new DefectType();
        $this->defectCategoryModel = new DefectCategory();
    }
    
    /**
     * ดึงประเภทข้อบกพร่องทั้งหมด (GET /defect/types)
     */
    public function getTypes($id = null, $data = []) {
        return $this->defectTypeModel->getAll();
    }
    
    /**
     * ดึงหมวดหมู่ข้อบกพร่องทั้งหมด (GET /defect/categories)
     */
    public function getCategories($id = null, $data = []) {
        return $this->defectCategoryModel->getAll();
    }
    
    /**
     * ดึงประเภทข้อบกพร่องตามหมวดหมู่ (GET /defect/by-category/1)
     */
    public function getByCategory($id = null, $data = []) {
        if (!$id) {
            throw new Exception("Category ID is required", 400);
        }
        
        return $this->defectTypeModel->getByCategory($id);
    }
    
    /**
     * ดึงประเภทข้อบกพร่องตาม ID (GET /defect/type/D1001)
     */
    public function getType($id = null, $data = []) {
        if (!$id) {
            throw new Exception("Defect type ID is required", 400);
        }
        
        $defectType = $this->defectTypeModel->getById($id);
        
        if (!$defectType) {
            throw new Exception("Defect type not found", 404);
        }
        
        return $defectType;
    }
    
    /**
     * สร้างประเภทข้อบกพร่องใหม่ (POST /defect/type)
     */
    public function postType($id = null, $data = []) {
        // ตรวจสอบสิทธิ์
        $currentUser = Auth::getCurrentUser();
        if ($currentUser && $currentUser['role'] !== 'admin' && $currentUser['role'] !== 'supervisor') {
            throw new Exception("You do not have permission to create defect type", 403);
        }
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!isset($data['id']) || !isset($data['name']) || !isset($data['category_id'])) {
            throw new Exception("ID, name and category_id are required", 400);
        }
        
        // ตรวจสอบว่ามีหมวดหมู่นี้จริงหรือไม่
        $category = $this->defectCategoryModel->getById($data['category_id']);
        if (!$category) {
            throw new Exception("Category not found", 404);
        }
        
        // ตรวจสอบว่ามี ID นี้อยู่แล้วหรือไม่
        $existingType = $this->defectTypeModel->getById($data['id']);
        if ($existingType) {
            throw new Exception("Defect type ID already exists", 400);
        }
        
        // สร้างประเภทข้อบกพร่องใหม่
        $this->defectTypeModel->create($data);
        
        return [
            'message' => 'Defect type created successfully',
            'id' => $data['id']
        ];
    }
    
    /**
     * อัพเดทประเภทข้อบกพร่อง (PUT /defect/type/D1001)
     */
    public function putType($id = null, $data = []) {
        if (!$id) {
            throw new Exception("Defect type ID is required", 400);
        }
        
        // ตรวจสอบสิทธิ์
        $currentUser = Auth::getCurrentUser();
        if ($currentUser && $currentUser['role'] !== 'admin' && $currentUser['role'] !== 'supervisor') {
            throw new Exception("You do not have permission to update defect type", 403);
        }
        
        // ตรวจสอบว่ามีประเภทข้อบกพร่องนี้จริงหรือไม่
        $defectType = $this->defectTypeModel->getById($id);
        if (!$defectType) {
            throw new Exception("Defect type not found", 404);
        }
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (empty($data)) {
            throw new Exception("No data provided", 400);
        }
        
        // ตรวจสอบว่ามีหมวดหมู่นี้จริงหรือไม่ (ถ้ามีการเปลี่ยนแปลง)
        if (isset($data['category_id'])) {
            $category = $this->defectCategoryModel->getById($data['category_id']);
            if (!$category) {
                throw new Exception("Category not found", 404);
            }
        }
        
        // อัพเดทประเภทข้อบกพร่อง
        $this->defectTypeModel->update($id, $data);
        
        return [
            'message' => 'Defect type updated successfully',
            'id' => $id
        ];
    }
    
    /**
     * ลบประเภทข้อบกพร่อง (DELETE /defect/type/D1001)
     */
    public function deleteType($id = null, $data = []) {
        if (!$id) {
            throw new Exception("Defect type ID is required", 400);
        }
        
        // ตรวจสอบสิทธิ์
        $currentUser = Auth::getCurrentUser();
        if ($currentUser && $currentUser['role'] !== 'admin') {
            throw new Exception("You do not have permission to delete defect type", 403);
        }
        
        // ตรวจสอบว่ามีประเภทข้อบกพร่องนี้จริงหรือไม่
        $defectType = $this->defectTypeModel->getById($id);
        if (!$defectType) {
            throw new Exception("Defect type not found", 404);
        }
        
        // ตรวจสอบว่ามีการใช้งานประเภทข้อบกพร่องนี้หรือไม่
        $inUse = $this->defectTypeModel->isInUse($id);
        if ($inUse) {
            throw new Exception("Cannot delete defect type because it is in use", 400);
        }
        
        // ลบประเภทข้อบกพร่อง
        $this->defectTypeModel->delete($id);
        
        return [
            'message' => 'Defect type deleted successfully',
            'id' => $id
        ];
    }
}
?>