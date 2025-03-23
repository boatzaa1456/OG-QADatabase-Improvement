<?php
/**
 * Inspection Model
 * โมเดลสำหรับจัดการข้อมูลการตรวจสอบ
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

require_once 'models/BaseModel.php';

class Inspection extends BaseModel {
    // ชื่อตาราง
    protected $table = 'inspections';
    
    // ฟิลด์ที่อนุญาตให้แก้ไขได้
    protected $fillable = [
        'doc_pt', 'production_date', 'shift', 'item_number', 'gauge_mark',
        'production_type', 'is_rework', 'is_destroy', 'use_jig', 'no_jig',
        'machine_no', 'total_product', 'sampling_date', 'work_order',
        'operation', 'inspector', 'supervisor', 'remarks', 'status',
        'version'
    ];
    
    /**
     * ดึงข้อมูลการตรวจสอบทั้งหมด พร้อมกรอง
     * @param array $filters ตัวกรองข้อมูล
     * @param int $limit จำกัดจำนวนแถว
     * @param int $offset ตำแหน่งเริ่มต้น
     * @return array ข้อมูลการตรวจสอบ
     */
    public function getAll($filters = [], $limit = 100, $offset = 0) {
        try {
            $db = getPDO();
            
            // เริ่มต้นคำสั่ง SQL พร้อมเงื่อนไขพื้นฐาน
            $sql = "SELECT i.*, 
                    (SELECT result FROM inspection_lots WHERE inspection_id = i.id LIMIT 1) as result
                    FROM {$this->table} i WHERE 1=1";
            
            $params = [];
            
            // เพิ่มเงื่อนไขการกรอง
            if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
                $sql .= " AND i.production_date BETWEEN ? AND ?";
                $params[] = $filters['start_date'];
                $params[] = $filters['end_date'];
            }
            
            if (!empty($filters['shift'])) {
                $sql .= " AND i.shift = ?";
                $params[] = $filters['shift'];
            }
            
            if (!empty($filters['machine'])) {
                $sql .= " AND i.machine_no = ?";
                $params[] = $filters['machine'];
            }
            
            if (!empty($filters['item'])) {
                $sql .= " AND i.item_number LIKE ?";
                $params[] = "%{$filters['item']}%";
            }
            
            if (!empty($filters['inspector'])) {
                $sql .= " AND i.inspector LIKE ?";
                $params[] = "%{$filters['inspector']}%";
            }
            
            if (!empty($filters['status'])) {
                $sql .= " AND i.status = ?";
                $params[] = $filters['status'];
            }
            
            // กรองตามวันที่สร้าง
            if (!empty($filters['created_date'])) {
                $sql .= " AND DATE(i.created_at) = ?";
                $params[] = $filters['created_date'];
            }
            
            // เพิ่มการเรียงลำดับและจำกัดจำนวน
            $sql .= " ORDER BY i.created_at DESC LIMIT ? OFFSET ?";
            $params[] = (int)$limit;
            $params[] = (int)$offset;
            
            // เตรียมและทำคำสั่ง SQL
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            // สร้าง index สำหรับค้นหาข้อมูลในหน่วยความจำอย่างรวดเร็ว
            $results = $stmt->fetchAll();
            
            // เพิ่มแคชข้อมูลถ้าเป็นไปได้
            if (function_exists('apcu_store') && !empty($results) && APP_ENV === 'production') {
                $cacheKey = 'inspections_' . md5(json_encode($filters) . $limit . $offset);
                apcu_store($cacheKey, $results, 300); // แคช 5 นาที
            }
            
            return $results;
        } catch (PDOException $e) {
            Logger::error("Database error in getAll: " . $e->getMessage(), [
                'filters' => $filters,
                'limit' => $limit,
                'offset' => $offset
            ]);
            throw new Exception("Error fetching inspections: " . $e->getMessage());
        } catch (Exception $e) {
            Logger::error("Error in getAll: " . $e->getMessage(), [
                'filters' => $filters
            ]);
            throw $e;
        }
    }
    
    /**
     * สร้างการตรวจสอบใหม่พร้อมข้อมูลที่เกี่ยวข้อง
     * @param array $data ข้อมูลสำหรับสร้าง
     * @return int ID ของรายการที่สร้าง
     */
    public function createWithRelated($data) {
        $db = getPDO();
        $inspectionId = null;
        
        try {
            // เริ่ม transaction
            $db->beginTransaction();
            
            // ล็อคเพื่อป้องกันการเข้าถึงพร้อมกัน
            $lockName = "inspection_create_lock";
            $stmt = $db->prepare("SELECT GET_LOCK(?, 10)");
            $stmt->execute([$lockName]);
            $lockResult = $stmt->fetchColumn();
            
            if (!$lockResult) {
                throw new Exception("Could not acquire lock. Another process might be creating inspection data.");
            }
            
            // 1. บันทึกข้อมูลหลักของการตรวจสอบ
            $inspectionData = [];
            foreach ($this->fillable as $field) {
                if (isset($data[$field])) {
                    $inspectionData[$field] = $data[$field];
                }
            }
            
            // เพิ่มข้อมูลเริ่มต้น
            $inspectionData['status'] = $data['status'] ?? 'draft';
            $inspectionData['version'] = 1;
            
            // เพิ่มข้อมูลผู้สร้าง
            $currentUser = Auth::getCurrentUser();
            if ($currentUser) {
                $inspectionData['created_by'] = $currentUser['id'];
            }
            
            // สร้าง SQL สำหรับบันทึกข้อมูลหลัก
            $fields = array_keys($inspectionData);
            $placeholders = array_fill(0, count($fields), '?');
            
            $sql = "INSERT INTO {$this->table} (" . implode(", ", $fields) . ") 
                    VALUES (" . implode(", ", $placeholders) . ")";
                    
            $stmt = $db->prepare($sql);
            
            // ดักจับข้อผิดพลาดในการบันทึกข้อมูล
            try {
                $stmt->execute(array_values($inspectionData));
                // รับค่า ID ที่เพิ่งบันทึก
                $inspectionId = $db->lastInsertId();
                
                // บันทึกการเปลี่ยนแปลง
                $this->logChange('inspections', $inspectionId, 'create', null, json_encode($inspectionData), $currentUser ? $currentUser['id'] : null);
            } catch (PDOException $e) {
                throw new Exception("Error creating inspection: " . $e->getMessage());
            }
            
            // 2. บันทึกข้อมูลล็อต
            if (!empty($data['lots'])) {
                $lotIds = $this->saveLots($db, $inspectionId, $data['lots'], $currentUser);
                
                // 3. บันทึกข้อมูลข้อบกพร่อง
                if (!empty($data['defects'])) {
                    $this->saveDefects($db, $lotIds, $data['defects'], $currentUser);
                }
                
                // 4. บันทึกข้อมูลการวัดความเครียด
                if (!empty($data['strainMeasurements'])) {
                    $this->saveStrainMeasurements($db, $lotIds, $data['strainMeasurements'], $currentUser);
                }
            }
            
            // ปล่อยล็อค
            $db->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]);
            
            // Commit transaction
            $db->commit();
            
            // บันทึกเหตุการณ์
            Logger::info("Created inspection #{$inspectionId}", [
                'user_id' => $currentUser ? $currentUser['id'] : null,
                'doc_pt' => $data['docPT'] ?? null
            ]);
            
            return $inspectionId;
        } catch (Exception $e) {
            // Rollback ถ้าเกิดข้อผิดพลาด
            if ($db && $db->inTransaction()) {
                $db->rollBack();
            }
            
            // ปล่อยล็อคถ้ามีการล็อค
            $db->prepare("SELECT RELEASE_LOCK('inspection_create_lock')")->execute();
            
            // บันทึกข้อผิดพลาด
            Logger::error("Failed to create inspection: " . $e->getMessage(), [
                'exception' => $e,
                'data' => $data
            ]);
            
            throw new Exception("Error creating inspection: " . $e->getMessage());
        }
    }
    
    /**
     * บันทึกข้อมูลล็อต
     * @param PDO $db การเชื่อมต่อฐานข้อมูล
     * @param int $inspectionId ID ของการตรวจสอบ
     * @param array $lots ข้อมูลล็อต
     * @param array|null $currentUser ข้อมูลผู้ใช้ปัจจุบัน
     * @return array ID ของล็อตที่บันทึก
     */
    private function saveLots($db, $inspectionId, $lots, $currentUser = null) {
        $lotIds = [];
        
        foreach ($lots as $lot) {
            if (empty($lot['lotNumber'])) {
                continue;
            }
            
            $lotSql = "INSERT INTO inspection_lots (
                        inspection_id, lot_number, pieces_per_lot, description, 
                        pallet_no, strain_std, first_sample_size, first_sample_ac_re, 
                        second_sample_size, second_sample_ac_re, result, qp, strain_result, version
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $lotStmt = $db->prepare($lotSql);
            $lotData = [
                $inspectionId,
                $lot['lotNumber'],
                isset($lot['piecesPerLot']) ? (int)$lot['piecesPerLot'] : 0,
                isset($lot['description']) ? $lot['description'] : '',
                isset($lot['palletNo']) ? $lot['palletNo'] : '',
                isset($lot['strainStd']) ? $lot['strainStd'] : null,
                isset($lot['firstSampleSize']) ? (int)$lot['firstSampleSize'] : null,
                isset($lot['firstSampleAcRe']) ? $lot['firstSampleAcRe'] : '',
                isset($lot['secondSampleSize']) ? (int)$lot['secondSampleSize'] : null,
                isset($lot['secondSampleAcRe']) ? $lot['secondSampleAcRe'] : '',
                isset($lot['result']) ? $lot['result'] : '',
                isset($lot['qp']) ? $lot['qp'] : '',
                isset($lot['strainResult']) ? $lot['strainResult'] : '',
                1 // เริ่มต้นด้วย version 1
            ];
            
            try {
                $lotStmt->execute($lotData);
                
                // รับค่า ID ของล็อต
                $lotId = $db->lastInsertId();
                $lotIds[$lot['lotNumber']] = $lotId;
                
                // บันทึกการเปลี่ยนแปลง
                $this->logChange('inspection_lots', $lotId, 'create', null, json_encode($lot), $currentUser ? $currentUser['id'] : null);
            } catch (PDOException $e) {
                throw new Exception("Error saving lot: " . $e->getMessage());
            }
        }
        
        return $lotIds;
    }
    
    /**
     * บันทึกข้อมูลข้อบกพร่อง
     * @param PDO $db การเชื่อมต่อฐานข้อมูล
     * @param array $lotIds แผนที่ของ ID ล็อต
     * @param array $defects ข้อมูลข้อบกพร่อง
     * @param array|null $currentUser ข้อมูลผู้ใช้ปัจจุบัน
     */
    private function saveDefects($db, $lotIds, $defects, $currentUser = null) {
        foreach ($defects as $defect) {
            $lotKey = 'lot' . $defect['lot'];
            
            if (!isset($lotIds[$lotKey])) {
                continue;
            }
            
            $count = isset($defect['count']) ? (int)$defect['count'] : 0;
            
            // ข้ามถ้าไม่มีข้อบกพร่อง
            if ($count <= 0) {
                continue;
            }
            
            $defectSql = "INSERT INTO lot_defects (lot_id, defect_code, defect_count, created_by) 
                         VALUES (?, ?, ?, ?)";
            
            $defectStmt = $db->prepare($defectSql);
            
            try {
                $defectStmt->execute([
                    $lotIds[$lotKey],
                    $defect['defectCode'],
                    $count,
                    $currentUser ? $currentUser['id'] : null
                ]);
                
                // บันทึกการเปลี่ยนแปลง
                $defectId = $db->lastInsertId();
                $this->logChange('lot_defects', $defectId, 'create', null, json_encode($defect), $currentUser ? $currentUser['id'] : null);
            } catch (PDOException $e) {
                throw new Exception("Error saving defect: " . $e->getMessage());
            }
        }
    }
    
    /**
     * บันทึกข้อมูลการวัดความเครียด
     * @param PDO $db การเชื่อมต่อฐานข้อมูล
     * @param array $lotIds แผนที่ของ ID ล็อต
     * @param array $measurements ข้อมูลการวัดความเครียด
     * @param array|null $currentUser ข้อมูลผู้ใช้ปัจจุบัน
     */
    private function saveStrainMeasurements($db, $lotIds, $measurements, $currentUser = null) {
        foreach ($measurements as $measurement) {
            $lotKey = 'lot' . $measurement['lot'];
            
            if (!isset($lotIds[$lotKey])) {
                continue;
            }
            
            // ข้ามถ้าไม่มีค่า
            if (!isset($measurement['value']) || $measurement['value'] === '') {
                continue;
            }
            
            $position = (int)$measurement['position'];
            $value = (float)$measurement['value'];
            
            $strainSql = "INSERT INTO strain_measurements (lot_id, position, value, created_by) 
                         VALUES (?, ?, ?, ?)";
            
            $strainStmt = $db->prepare($strainSql);
            
            try {
                $strainStmt->execute([
                    $lotIds[$lotKey],
                    $position,
                    $value,
                    $currentUser ? $currentUser['id'] : null
                ]);
                
                // บันทึกการเปลี่ยนแปลง
                $measurementId = $db->lastInsertId();
                $this->logChange('strain_measurements', $measurementId, 'create', null, json_encode($measurement), $currentUser ? $currentUser['id'] : null);
            } catch (PDOException $e) {
                throw new Exception("Error saving strain measurement: " . $e->getMessage());
            }
        }
    }
    
    /**
     * ดึงข้อมูลการตรวจสอบพร้อมข้อมูลที่เกี่ยวข้อง
     * @param int $id ID ของการตรวจสอบ
     * @return array|null ข้อมูลการตรวจสอบ
     */
    public function getWithRelated($id) {
        try {
            // ตรวจสอบแคช
            if (function_exists('apcu_fetch') && APP_ENV === 'production') {
                $cacheKey = 'inspection_' . $id;
                $cached = apcu_fetch($cacheKey, $success);
                if ($success) {
                    return $cached;
                }
            }
            
            $db = getPDO();
            
            // 1. ดึงข้อมูลหลักของการตรวจสอบ
            $sql = "SELECT * FROM {$this->table} WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            
            $inspection = $stmt->fetch();
            
            if (!$inspection) {
                return null;
            }
            
            // 2. ดึงข้อมูลล็อต
            $lotSql = "SELECT * FROM inspection_lots WHERE inspection_id = ? ORDER BY lot_number";
            $lotStmt = $db->prepare($lotSql);
            $lotStmt->execute([$id]);
            
            $lots = [];
            while ($lot = $lotStmt->fetch()) {
                $lotId = $lot['id'];
                
                // 3. ดึงข้อมูลข้อบกพร่องของล็อต
                $defectSql = "SELECT ld.*, dt.name as defect_name, dt.severity 
                              FROM lot_defects ld
                              LEFT JOIN defect_types dt ON ld.defect_code = dt.id
                              WHERE ld.lot_id = ?";
                $defectStmt = $db->prepare($defectSql);
                $defectStmt->execute([$lotId]);
                
                $defects = $defectStmt->fetchAll();
                
                // 4. ดึงข้อมูลการวัดความเครียดของล็อต
                $strainSql = "SELECT * FROM strain_measurements WHERE lot_id = ? ORDER BY position";
                $strainStmt = $db->prepare($strainSql);
                $strainStmt->execute([$lotId]);
                
                $strainMeasurements = $strainStmt->fetchAll();
                
                // 5. เพิ่มข้อมูลข้อบกพร่องและการวัดความเครียดเข้าไปในล็อต
                $lot['defects'] = $defects;
                $lot['strainMeasurements'] = $strainMeasurements;
                
                $lots[] = $lot;
            }
            
            // 6. เพิ่มข้อมูลล็อตเข้าไปในการตรวจสอบ
            $inspection['lots'] = $lots;
            
            // เก็บในแคช
            if (function_exists('apcu_store') && APP_ENV === 'production') {
                apcu_store('inspection_' . $id, $inspection, 600); // แคช 10 นาที
            }
            
            return $inspection;
        } catch (PDOException $e) {
            Logger::error("Database error in getWithRelated: " . $e->getMessage(), [
                'id' => $id
            ]);
            throw new Exception("Error fetching inspection: " . $e->getMessage());
        } catch (Exception $e) {
            Logger::error("Error in getWithRelated: " . $e->getMessage(), [
                'id' => $id
            ]);
            throw $e;
        }
    }
    
    /**
     * อัพเดทข้อมูลการตรวจสอบพร้อมข้อมูลที่เกี่ยวข้อง
     * @param int $id ID ของการตรวจสอบ
     * @param array $data ข้อมูลที่ต้องการอัพเดท
     * @return bool ผลลัพธ์การอัพเดท
     */
    public function updateWithRelated($id, $data) {
        $db = getPDO();
        
        try {
            // เริ่ม transaction
            $db->beginTransaction();
            
            // ล็อคเพื่อป้องกันการเข้าถึงพร้อมกัน
            $lockName = "inspection_update_{$id}_lock";
            $stmt = $db->prepare("SELECT GET_LOCK(?, 10)");
            $stmt->execute([$lockName]);
            $lockResult = $stmt->fetchColumn();
            
            if (!$lockResult) {
                throw new Exception("Could not acquire lock. Another process might be updating inspection data.");
            }
            
            // ตรวจสอบ version กับ ID
            $versionStmt = $db->prepare("SELECT version FROM {$this->table} WHERE id = ?");
            $versionStmt->execute([$id]);
            $currentVersion = $versionStmt->fetchColumn();
            
            if (!$currentVersion) {
                throw new Exception("Inspection not found", 404);
            }
            
            // ตรวจสอบ optimistic locking
            if (isset($data['version']) && (int)$data['version'] !== (int)$currentVersion) {
                throw new ConcurrencyException("Inspection has been modified by another user. Please refresh and try again.");
            }
            
            // 1. อัพเดทข้อมูลหลักของการตรวจสอบ
            $inspectionData = [];
            foreach ($this->fillable as $field) {
                if (isset($data[$field])) {
                    $inspectionData[$field] = $data[$field];
                }
            }
            
            // เพิ่มข้อมูลผู้แก้ไข
            $currentUser = Auth::getCurrentUser();
            if ($currentUser) {
                $inspectionData['updated_by'] = $currentUser['id'];
            }
            
            // เพิ่ม version ใหม่
            $inspectionData['version'] = (int)$currentVersion + 1;
            
            if (!empty($inspectionData)) {
                $fields = [];
                foreach ($inspectionData as $field => $value) {
                    $fields[] = "$field = ?";
                }
                
                $sql = "UPDATE {$this->table} SET " . implode(", ", $fields) . " WHERE id = ?";
                
                $params = array_values($inspectionData);
                $params[] = $id;
                
                $updateStmt = $db->prepare($sql);
                $updateStmt->execute($params);
                
                // บันทึกการเปลี่ยนแปลง
                $this->logChange('inspections', $id, 'update', json_encode(['version' => $currentVersion]), json_encode($inspectionData), $currentUser ? $currentUser['id'] : null);
            }
            
            // 2. อัพเดทข้อมูลล็อต
            if (!empty($data['lots'])) {
                $this->updateLots($db, $id, $data['lots'], $currentUser);
                
                // ดึง ID ของล็อตทั้งหมด
                $lotIdsStmt = $db->prepare("SELECT id, lot_number FROM inspection_lots WHERE inspection_id = ?");
                $lotIdsStmt->execute([$id]);
                $lotIds = [];
                while ($lot = $lotIdsStmt->fetch()) {
                    $lotIds[$lot['lot_number']] = $lot['id'];
                }
                
                // 3. อัพเดทข้อมูลข้อบกพร่อง
                if (!empty($data['defects'])) {
                    $this->updateDefects($db, $lotIds, $data['defects'], $currentUser);
                }
                
                // 4. อัพเดทข้อมูลการวัดความเครียด
                if (!empty($data['strainMeasurements'])) {
                    $this->updateStrainMeasurements($db, $lotIds, $data['strainMeasurements'], $currentUser);
                }
            }
            
            // ปล่อยล็อค
            $db->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]);
            
            // ล้างแคช
            if (function_exists('apcu_delete') && APP_ENV === 'production') {
                apcu_delete('inspection_' . $id);
            }
            
            // Commit transaction
            $db->commit();
            
            // บันทึกเหตุการณ์
            Logger::info("Updated inspection #{$id}", [
                'user_id' => $currentUser ? $currentUser['id'] : null
            ]);
            
            return true;
        } catch (ConcurrencyException $e) {
            // Rollback ถ้าเกิดข้อผิดพลาด
            if ($db && $db->inTransaction()) {
                $db->rollBack();
            }
            
            // ปล่อยล็อคถ้ามีการล็อค
            $db->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]);
            
            // ส่งต่อข้อยกเว้นแบบเฉพาะสำหรับ concurrency
            throw $e;
        } catch (Exception $e) {
            // Rollback ถ้าเกิดข้อผิดพลาด
            if ($db && $db->inTransaction()) {
                $db->rollBack();
            }
            
            // ปล่อยล็อคถ้ามีการล็อค
            $db->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]);
            
            // บันทึกข้อผิดพลาด
            Logger::error("Failed to update inspection #{$id}: " . $e->getMessage(), [
                'exception' => $e,
                'data' => $data
            ]);
            
            throw new Exception("Error updating inspection: " . $e->getMessage());
        }
    }
    
    /**
     * อัพเดทข้อมูลล็อต
     * @param PDO $db การเชื่อมต่อฐานข้อมูล
     * @param int $inspectionId ID ของการตรวจสอบ
     * @param array $lots ข้อมูลล็อต
     * @param array|null $currentUser ข้อมูลผู้ใช้ปัจจุบัน
     * @return bool ผลลัพธ์การอัพเดท
     */
    private function updateLots($db, $inspectionId, $lots, $currentUser = null) {
        // ตรวจสอบล็อตที่มีอยู่แล้ว
        $existingLotsStmt = $db->prepare("SELECT id, lot_number, version FROM inspection_lots WHERE inspection_id = ?");
        $existingLotsStmt->execute([$inspectionId]);
        
        $existingLots = [];
        while ($lot = $existingLotsStmt->fetch()) {
            $existingLots[$lot['lot_number']] = [
                'id' => $lot['id'],
                'version' => $lot['version']
            ];
        }
        
        // วนลูปผ่านล็อตที่ส่งมาและอัพเดทหรือเพิ่มใหม่
        foreach ($lots as $lot) {
            if (empty($lot['lotNumber'])) {
                continue;
            }
            
            $lotNumber = $lot['lotNumber'];
            
            // ล็อตมีอยู่แล้ว
            if (isset($existingLots[$lotNumber])) {
                $lotId = $existingLots[$lotNumber]['id'];
                $currentVersion = $existingLots[$lotNumber]['version'];
                
                // ตรวจสอบ optimistic locking
                if (isset($lot['version']) && (int)$lot['version'] !== (int)$currentVersion) {
                    throw new ConcurrencyException("Lot {$lotNumber} has been modified by another user. Please refresh and try again.");
                }
                
                // อัพเดทล็อต
                $lotSql = "UPDATE inspection_lots SET 
                          pieces_per_lot = ?, description = ?, pallet_no = ?, 
                          strain_std = ?, first_sample_size = ?, first_sample_ac_re = ?, 
                          second_sample_size = ?, second_sample_ac_re = ?, result = ?, 
                          qp = ?, strain_result = ?, version = version + 1, updated_at = NOW()
                          WHERE id = ?";
                
                $lotStmt = $db->prepare($lotSql);
                $lotStmt->execute([
                    isset($lot['piecesPerLot']) ? (int)$lot['piecesPerLot'] : 0,
                    isset($lot['description']) ? $lot['description'] : '',
                    isset($lot['palletNo']) ? $lot['palletNo'] : '',
                    isset($lot['strainStd']) ? $lot['strainStd'] : null,
                    isset($lot['firstSampleSize']) ? (int)$lot['firstSampleSize'] : null,
                    isset($lot['firstSampleAcRe']) ? $lot['firstSampleAcRe'] : '',
                    isset($lot['secondSampleSize']) ? (int)$lot['secondSampleSize'] : null,
                    isset($lot['secondSampleAcRe']) ? $lot['secondSampleAcRe'] : '',
                    isset($lot['result']) ? $lot['result'] : '',
                    isset($lot['qp']) ? $lot['qp'] : '',
                    isset($lot['strainResult']) ? $lot['strainResult'] : '',
                    $lotId
                ]);
                
                // บันทึกการเปลี่ยนแปลง
                $this->logChange('inspection_lots', $lotId, 'update', json_encode(['version' => $currentVersion]), json_encode($lot), $currentUser ? $currentUser['id'] : null);
            } else {
                // สร้างล็อตใหม่
                $lotSql = "INSERT INTO inspection_lots (
                          inspection_id, lot_number, pieces_per_lot, description, 
                          pallet_no, strain_std, first_sample_size, first_sample_ac_re, 
                          second_sample_size, second_sample_ac_re, result, qp, strain_result, version
                          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
                $lotStmt = $db->prepare($lotSql);
                $lotStmt->execute([
                    $inspectionId,
                    $lotNumber,
                    isset($lot['piecesPerLot']) ? (int)$lot['piecesPerLot'] : 0,
                    isset($lot['description']) ? $lot['description'] : '',
                    isset($lot['palletNo']) ? $lot['palletNo'] : '',
                    isset($lot['strainStd']) ? $lot['strainStd'] : null,
                    isset($lot['firstSampleSize']) ? (int)$lot['firstSampleSize'] : null,
                    isset($lot['firstSampleAcRe']) ? $lot['firstSampleAcRe'] : '',
                    isset($lot['secondSampleSize']) ? (int)$lot['secondSampleSize'] : null,
                    isset($lot['secondSampleAcRe']) ? $lot['secondSampleAcRe'] : '',
                    isset($lot['result']) ? $lot['result'] : '',
                    isset($lot['qp']) ? $lot['qp'] : '',
                    isset($lot['strainResult']) ? $lot['strainResult'] : '',
                    1 // เริ่มต้นด้วย version 1
                ]);
                
                // บันทึกการเปลี่ยนแปลง
                $lotId = $db->lastInsertId();
                $this->logChange('inspection_lots', $lotId, 'create', null, json_encode($lot), $currentUser ? $currentUser['id'] : null);
            }
        }
        
        return true;
    }
    
    /**
     * อัพเดทข้อมูลข้อบกพร่อง
     * @param PDO $db การเชื่อมต่อฐานข้อมูล
     * @param array $lotIds แผนที่ของ ID ล็อต
     * @param array $defects ข้อมูลข้อบกพร่อง
     * @param array|null $currentUser ข้อมูลผู้ใช้ปัจจุบัน
     * @return bool ผลลัพธ์การอัพเดท
     */
    private function updateDefects($db, $lotIds, $defects, $currentUser = null) {
        // ลบข้อบกพร่องเดิมทั้งหมด
        foreach ($lotIds as $lotNumber => $lotId) {
            // อ่านข้อมูลเดิมก่อนลบเพื่อบันทึกการเปลี่ยนแปลง
            $oldDefectsStmt = $db->prepare("SELECT * FROM lot_defects WHERE lot_id = ?");
            $oldDefectsStmt->execute([$lotId]);
            $oldDefects = $oldDefectsStmt->fetchAll();
            
            // บันทึกการเปลี่ยนแปลงของแต่ละรายการที่ลบ
            foreach ($oldDefects as $oldDefect) {
                $this->logChange('lot_defects', $oldDefect['id'], 'delete', json_encode($oldDefect), null, $currentUser ? $currentUser['id'] : null);
            }
            
            // ลบข้อมูลเดิม
            $deleteStmt = $db->prepare("DELETE FROM lot_defects WHERE lot_id = ?");
            $deleteStmt->execute([$lotId]);
        }
        
        // เพิ่มข้อบกพร่องใหม่
        foreach ($defects as $defect) {
            $lotKey = 'lot' . $defect['lot'];
            
            if (!isset($lotIds[$lotKey])) {
                continue;
            }
            
            $count = isset($defect['count']) ? (int)$defect['count'] : 0;
            
            // ข้ามถ้าไม่มีข้อบกพร่อง
            if ($count <= 0) {
                continue;
            }
            
            $defectSql = "INSERT INTO lot_defects (lot_id, defect_code, defect_count, created_by) 
                         VALUES (?, ?, ?, ?)";
            
            $defectStmt = $db->prepare($defectSql);
            $defectStmt->execute([
                $lotIds[$lotKey],
                $defect['defectCode'],
                $count,
                $currentUser ? $currentUser['id'] : null
            ]);
            
            // บันทึกการเปลี่ยนแปลง
            $defectId = $db->lastInsertId();
            $this->logChange('lot_defects', $defectId, 'create', null, json_encode($defect), $currentUser ? $currentUser['id'] : null);
        }
        
        return true;
    }
    
    /**
     * อัพเดทข้อมูลการวัดความเครียด
     * @param PDO $db การเชื่อมต่อฐานข้อมูล
     * @param array $lotIds แผนที่ของ ID ล็อต
     * @param array $measurements ข้อมูลการวัดความเครียด
     * @param array|null $currentUser ข้อมูลผู้ใช้ปัจจุบัน
     * @return bool ผลลัพธ์การอัพเดท
     */
    private function updateStrainMeasurements($db, $lotIds, $measurements, $currentUser = null) {
        // ลบการวัดความเครียดเดิมทั้งหมด
        foreach ($lotIds as $lotNumber => $lotId) {
            // อ่านข้อมูลเดิมก่อนลบเพื่อบันทึกการเปลี่ยนแปลง
            $oldMeasurementsStmt = $db->prepare("SELECT * FROM strain_measurements WHERE lot_id = ?");
            $oldMeasurementsStmt->execute([$lotId]);
            $oldMeasurements = $oldMeasurementsStmt->fetchAll();
            
            // บันทึกการเปลี่ยนแปลงของแต่ละรายการที่ลบ
            foreach ($oldMeasurements as $oldMeasurement) {
                $this->logChange('strain_measurements', $oldMeasurement['id'], 'delete', json_encode($oldMeasurement), null, $currentUser ? $currentUser['id'] : null);
            }
            
            // ลบข้อมูลเดิม
            $deleteStmt = $db->prepare("DELETE FROM strain_measurements WHERE lot_id = ?");
            $deleteStmt->execute([$lotId]);
        }
        
        // เพิ่มการวัดความเครียดใหม่
        foreach ($measurements as $measurement) {
            $lotKey = 'lot' . $measurement['lot'];
            
            if (!isset($lotIds[$lotKey])) {
                continue;
            }
            
            // ข้ามถ้าไม่มีค่า
            if (!isset($measurement['value']) || $measurement['value'] === '') {
                continue;
            }
            
            $position = (int)$measurement['position'];
            $value = (float)$measurement['value'];
            
            $strainSql = "INSERT INTO strain_measurements (lot_id, position, value, created_by) 
                         VALUES (?, ?, ?, ?)";
            
            $strainStmt = $db->prepare($strainSql);
            $strainStmt->execute([
                $lotIds[$lotKey],
                $position,
                $value,
                $currentUser ? $currentUser['id'] : null
            ]);
            
            // บันทึกการเปลี่ยนแปลง
            $measurementId = $db->lastInsertId();
            $this->logChange('strain_measurements', $measurementId, 'create', null, json_encode($measurement), $currentUser ? $currentUser['id'] : null);
        }
        
        return true;
    }
    
    /**
     * บันทึกการเปลี่ยนแปลงข้อมูล
     * @param string $entityType ประเภทของข้อมูล
     * @param int $entityId ID ของข้อมูล
     * @param string $changeType ประเภทการเปลี่ยนแปลง (create, update, delete)
     * @param string|null $oldValue ค่าเดิม
     * @param string|null $newValue ค่าใหม่
     * @param int|null $userId ID ของผู้ใช้
     * @return int|bool ID ของบันทึกหรือ false ถ้าล้มเหลว
     */
    private function logChange($entityType, $entityId, $changeType, $oldValue, $newValue, $userId) {
        try {
            $db = getPDO();
            
            $logSql = "INSERT INTO change_logs (entity_type, entity_id, field_name, old_value, new_value, change_type, user_id)
                      VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $logStmt = $db->prepare($logSql);
            $logStmt->execute([
                $entityType,
                $entityId,
                'all',
                $oldValue,
                $newValue,
                $changeType,
                $userId
            ]);
            
            return $db->lastInsertId();
        } catch (Exception $e) {
            // ถ้าไม่สามารถบันทึกได้ก็แค่ล็อกและไม่ทำให้กระบวนการหลักล้มเหลว
            Logger::error("Failed to log change: " . $e->getMessage(), [
                'entityType' => $entityType,
                'entityId' => $entityId,
                'changeType' => $changeType
            ]);
            
            return false;
        }
    }
}

/**
 * ConcurrencyException
 * ข้อยกเว้นสำหรับการขัดแย้งในการเข้าถึงข้อมูลพร้อมกัน
 */
class ConcurrencyException extends Exception {
    public function __construct($message = "Concurrent modification detected", $code = 409, $previous = null) {
        parent::__construct($message, $code, $previous);
    }
}
?>