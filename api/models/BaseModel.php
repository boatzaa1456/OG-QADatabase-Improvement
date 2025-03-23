<?php
/**
 * Base Model
 * คลาสพื้นฐานสำหรับโมเดลทั้งหมด
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

abstract class BaseModel {
    // ชื่อตาราง (จะถูกกำหนดในคลาสลูก)
    protected $table;
    
    // Primary key (ค่าเริ่มต้นคือ id)
    protected $primaryKey = 'id';
    
    // ฟิลด์ที่อนุญาตให้แก้ไขได้
    protected $fillable = [];
    
    // ฟิลด์ที่ต้องการให้ซ่อนในการแสดงผล
    protected $hidden = [];
    
    /**
     * Constructor
     */
    public function __construct() {
        // ตรวจสอบว่ามีการกำหนดชื่อตารางหรือไม่
        if (empty($this->table)) {
            throw new Exception("Model must define a table name");
        }
    }
    
    /**
     * ดึงข้อมูลทั้งหมด
     */
    public function getAll($limit = 100, $offset = 0) {
        try {
            $db = getPDO();
            
            $sql = "SELECT * FROM {$this->table} LIMIT ? OFFSET ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$limit, $offset]);
            
            $results = $stmt->fetchAll();
            
            // ซ่อนฟิลด์ที่กำหนดไว้
            return $this->hideFields($results);
        } catch (Exception $e) {
            throw new Exception("Error fetching data: " . $e->getMessage());
        }
    }
    
    /**
     * ดึงข้อมูลตาม ID
     */
    public function getById($id) {
        try {
            $db = getPDO();
            
            $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            
            $result = $stmt->fetch();
            
            // ซ่อนฟิลด์ที่กำหนดไว้
            return $this->hideFields($result);
        } catch (Exception $e) {
            throw new Exception("Error fetching data: " . $e->getMessage());
        }
    }
    
    /**
     * สร้างข้อมูลใหม่
     */
    public function create($data) {
        try {
            // กรองข้อมูลให้เหลือเฉพาะฟิลด์ที่อนุญาต
            $filteredData = $this->filterData($data);
            
            if (empty($filteredData)) {
                throw new Exception("No valid data provided");
            }
            
            $db = getPDO();
            
            // สร้าง SQL
            $fields = array_keys($filteredData);
            $placeholders = array_fill(0, count($fields), '?');
            
            $sql = "INSERT INTO {$this->table} (" . implode(", ", $fields) . ") VALUES (" . implode(", ", $placeholders) . ")";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute(array_values($filteredData));
            
            return $db->lastInsertId();
        } catch (Exception $e) {
            throw new Exception("Error creating data: " . $e->getMessage());
        }
    }
    
    /**
     * อัพเดทข้อมูล
     */
    public function update($id, $data) {
        try {
            // กรองข้อมูลให้เหลือเฉพาะฟิลด์ที่อนุญาต
            $filteredData = $this->filterData($data);
            
            if (empty($filteredData)) {
                throw new Exception("No valid data provided");
            }
            
            $db = getPDO();
            
            // สร้าง SQL
            $fields = array_map(function($field) {
                return "$field = ?";
            }, array_keys($filteredData));
            
            $params = array_values($filteredData);
            $params[] = $id;
            
            $sql = "UPDATE {$this->table} SET " . implode(", ", $fields) . " WHERE {$this->primaryKey} = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            throw new Exception("Error updating data: " . $e->getMessage());
        }
    }
    
    /**
     * ลบข้อมูล
     */
    public function delete($id) {
        try {
            $db = getPDO();
            
            $sql = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            throw new Exception("Error deleting data: " . $e->getMessage());
        }
    }
    
    /**
     * กรองข้อมูลให้เหลือเฉพาะฟิลด์ที่อนุญาต
     */
    protected function filterData($data) {
        $filtered = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, $this->fillable)) {
                $filtered[$key] = $value;
            }
        }
        
        return $filtered;
    }
    
    /**
     * ซ่อนฟิลด์ที่กำหนดไว้
     */
    protected function hideFields($data) {
        if (empty($data)) {
            return $data;
        }
        
        // ถ้าเป็น array เดียว
        if (!isset($data[0])) {
            foreach ($this->hidden as $field) {
                if (isset($data[$field])) {
                    unset($data[$field]);
                }
            }
            return $data;
        }
        
        // ถ้าเป็น array ของ array
        foreach ($data as &$item) {
            foreach ($this->hidden as $field) {
                if (isset($item[$field])) {
                    unset($item[$field]);
                }
            }
        }
        
        return $data;
    }
}
?>