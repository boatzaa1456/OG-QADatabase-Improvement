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
        'operation', 'inspector', 'supervisor', 'remarks'
    ];
    
    /**
     * ดึงข้อมูลการตรวจสอบทั้งหมด พร้อมกรอง
     */
    public function getAll($filters = [], $limit = 1000, $offset = 0) {
        try {
            $db = getPDO();
            
            // สร้างคำสั่ง SQL พื้นฐาน
            $sql = "SELECT i.*, 
                    (SELECT result FROM inspection_lots WHERE inspection_id = i.id ORDER BY result = 'Reject' DESC LIMIT 1) as result 
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
            
            // กรองตามวันที่สร้าง
            if (!empty($filters['created_date'])) {
                $sql .= " AND DATE(i.created_at) = ?";
                $params[] = $filters['created_date'];
            }
            
            // เพิ่มการเรียงลำดับและจำกัดจำนวน
            $sql .= " ORDER BY i.created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            
            // เตรียมและทำคำสั่ง SQL
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll();
        } catch (Exception $e) {
            throw new Exception("Error fetching inspections: " . $e->getMessage());
        }
    }
    
    /**
     * สร้างการตรวจสอบใหม่พร้อมข้อมูลที่เกี่ยวข้อง
     */
    public function createWithRelated($data) {
        try {
            $db = getPDO();
            
            // เริ่ม transaction
            $db->beginTransaction();
            
            // 1. บันทึกข้อมูลหลักของการตรวจสอบ
            
            // เตรียมข้อมูลสำหรับบันทึก
            $inspectionData = [];
            foreach ($this->fillable as $field) {
                if (isset($data[$field])) {
                    $inspectionData[$field] = $data[$field];
                }
            }
            
            // เพิ่มข้อมูลผู้สร้าง
            if (isset($_SESSION['user_id'])) {
                $inspectionData['created_by'] = $_SESSION['user_id'];
            }
            
            // สร้าง SQL สำหรับบันทึกข้อมูลหลัก
            $fields = array_keys($inspectionData);
            $placeholders = array_fill(0, count($fields), '?');
            
            $sql = "INSERT INTO {$this->table} (" . implode(", ", $fields) . ") 
                    VALUES (" . implode(", ", $placeholders) . ")";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute(array_values($inspectionData));
            
            // รับค่า ID ที่เพิ่งบันทึก
            $inspectionId = $db->lastInsertId();
            
            // 2. บันทึกข้อมูลล็อต
            if (!empty($data['lots'])) {
                $lotIds = [];
                
                foreach ($data['lots'] as $lot) {
                    if (empty($lot['lotNumber'])) {
                        continue;
                    }
                    
                    $lotSql = "INSERT INTO inspection_lots (
                                inspection_id, lot_number, pieces_per_lot, description, 
                                pallet_no, strain_std, first_sample_size, first_sample_ac_re, 
                                second_sample_size, second_sample_ac_re, result, qp, strain_result
                              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    
                    $lotStmt = $db->prepare($lotSql);
                    $lotStmt->execute([
                        $inspectionId,
                        $lot['lotNumber'],
                        isset($lot['piecesPerLot']) ? $lot['piecesPerLot'] : 0,
                        isset($lot['description']) ? $lot['description'] : '',
                        isset($lot['palletNo']) ? $lot['palletNo'] : '',
                        isset($lot['strainStd']) ? $lot['strainStd'] : null,
                        isset($lot['firstSampleSize']) ? $lot['firstSampleSize'] : null,
                        isset($lot['firstSampleAcRe']) ? $lot['firstSampleAcRe'] : '',
                        isset($lot['secondSampleSize']) ? $lot['secondSampleSize'] : null,
                        isset($lot['secondSampleAcRe']) ? $lot['secondSampleAcRe'] : '',
                        isset($lot['result']) ? $lot['result'] : '',
                        isset($lot['qp']) ? $lot['qp'] : '',
                        isset($lot['strainResult']) ? $lot['strainResult'] : ''
                    ]);
                    
                    // รับค่า ID ของล็อต
                    $lotId = $db->lastInsertId();
                    $lotIds[$lot['lotNumber']] = $lotId;
                }
                
                // 3. บันทึกข้อมูลข้อบกพร่อง
                if (!empty($data['defects'])) {
                    foreach ($data['defects'] as $defect) {
                        $lotKey = 'lot' . $defect['lot'];
                        
                        if (!isset($lotIds[$lotKey])) {
                            continue;
                        }
                        
                        $defectSql = "INSERT INTO lot_defects (lot_id, defect_code, defect_count) 
                                     VALUES (?, ?, ?)";
                        
                        $defectStmt = $db->prepare($defectSql);
                        $defectStmt->execute([
                            $lotIds[$lotKey],
                            $defect['defectCode'],
                            isset($defect['count']) ? $defect['count'] : 0
                        ]);
                    }
                }
                
                // 4. บันทึกข้อมูลการวัดความเครียด
                if (!empty($data['strainMeasurements'])) {
                    foreach ($data['strainMeasurements'] as $measurement) {
                        $lotKey = 'lot' . $measurement['lot'];
                        
                        if (!isset($lotIds[$lotKey])) {
                            continue;
                        }
                        
                        $strainSql = "INSERT INTO strain_measurements (lot_id, position, value) 
                                     VALUES (?, ?, ?)";
                        
                        $strainStmt = $db->prepare($strainSql);
                        $strainStmt->execute([
                            $lotIds[$lotKey],
                            $measurement['position'],
                            $measurement['value']
                        ]);
                    }
                }
            }
            
            // Commit transaction
            $db->commit();
            
            return $inspectionId;
        } catch (Exception $e) {
            // Rollback ถ้าเกิดข้อผิดพลาด
            if ($db && $db->inTransaction()) {
                $db->rollBack();
            }
            
            throw new Exception("Error creating inspection: " . $e->getMessage());
        }
    }
    
    /**
     * ดึงข้อมูลการตรวจสอบพร้อมข้อมูลที่เกี่ยวข้อง
     */
    public function getWithRelated($id) {
        try {
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
            $lotSql = "SELECT * FROM inspection_lots WHERE inspection_id = ?";
            $lotStmt = $db->prepare($lotSql);
            $lotStmt->execute([$id]);
            
            $lots = [];
            while ($lot = $lotStmt->fetch()) {
                $lotId = $lot['id'];
                
                // 3. ดึงข้อมูลข้อบกพร่องของล็อต
                $defectSql = "SELECT * FROM lot_defects WHERE lot_id = ?";
                $defectStmt = $db->prepare($defectSql);
                $defectStmt->execute([$lotId]);
                
                $defects = $defectStmt->fetchAll();
                
                // 4. ดึงข้อมูลการวัดความเครียดของล็อต
                $strainSql = "SELECT * FROM strain_measurements WHERE lot_id = ?";
                $strainStmt = $db->prepare($strainSql);
                $strainStmt->execute([$lotId]);
                
                $strainMeasurements = $strainStmt->fetchAll();
                
                // 5. เพิ่มข้อมูลข้อบกพร่องและการวัดความเครียดเข้าไปในล็อต
                $lot['defects'] = $defects;
                $lot['strain_measurements'] = $strainMeasurements;
                
                $lots[] = $lot;
            }
            
            // 6. เพิ่มข้อมูลล็อตเข้าไปในการตรวจสอบ
            $inspection['lots'] = $lots;
            
            return $inspection;
        } catch (Exception $e) {
            throw new Exception("Error fetching inspection: " . $e->getMessage());
        }
    }
    
    /**
     * อัพเดทข้อมูลการตรวจสอบพร้อมข้อมูลที่เกี่ยวข้อง
     */
    public function updateWithRelated($id, $data) {
        try {
            $db = getPDO();
            
            // เริ่ม transaction
            $db->beginTransaction();
            
            // 1. อัพเดทข้อมูลหลักของการตรวจสอบ
            $inspectionData = [];
            foreach ($this->fillable as $field) {
                if (isset($data[$field])) {
                    $inspectionData[$field] = $data[$field];
                }
            }
            
            // เพิ่มข้อมูลผู้แก้ไข
            if (isset($_SESSION['user_id'])) {
                $inspectionData['updated_by'] = $_SESSION['user_id'];
            }
            
            if (!empty($inspectionData)) {
                $fields = [];
                foreach ($inspectionData as $field => $value) {
                    $fields[] = "$field = ?";
                }
                
                $sql = "UPDATE {$this->table} SET " . implode(", ", $fields) . " WHERE id = ?";
                
                $params = array_values($inspectionData);
                $params[] = $id;
                
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            }
            
            // 2. อัพเดทข้อมูลล็อต
            if (!empty($data['lots'])) {
                // ตรวจสอบล็อตที่มีอยู่แล้ว
                $existingLotSql = "SELECT id, lot_number FROM inspection_lots WHERE inspection_id = ?";
                $existingLotStmt = $db->prepare($existingLotSql);
                $existingLotStmt->execute([$id]);
                
                $existingLots = [];
                while ($lot = $existingLotStmt->fetch()) {
                    $existingLots[$lot['lot_number']] = $lot['id'];
                }
                
                $lotIds = [];
                
                foreach ($data['lots'] as $lot) {
                    if (empty($lot['lotNumber'])) {
                        continue;
                    }
                    
                    $lotNumber = $lot['lotNumber'];
                    
                    // ล็อตมีอยู่แล้ว
                    if (isset($existingLots[$lotNumber])) {
                        $lotId = $existingLots[$lotNumber];
                        
                        // อัพเดทล็อต
                        $lotSql = "UPDATE inspection_lots SET 
                                  pieces_per_lot = ?, description = ?, pallet_no = ?, 
                                  strain_std = ?, first_sample_size = ?, first_sample_ac_re = ?, 
                                  second_sample_size = ?, second_sample_ac_re = ?, result = ?, 
                                  qp = ?, strain_result = ? 
                                  WHERE id = ?";
                        
                        $lotStmt = $db->prepare($lotSql);
                        $lotStmt->execute([
                            isset($lot['piecesPerLot']) ? $lot['piecesPerLot'] : 0,
                            isset($lot['description']) ? $lot['description'] : '',
                            isset($lot['palletNo']) ? $lot['palletNo'] : '',
                            isset($lot['strainStd']) ? $lot['strainStd'] : null,
                            isset($lot['firstSampleSize']) ? $lot['firstSampleSize'] : null,
                            isset($lot['firstSampleAcRe']) ? $lot['firstSampleAcRe'] : '',
                            isset($lot['secondSampleSize']) ? $lot['secondSampleSize'] : null,
                            isset($lot['secondSampleAcRe']) ? $lot['secondSampleAcRe'] : '',
                            isset($lot['result']) ? $lot['result'] : '',
                            isset($lot['qp']) ? $lot['qp'] : '',
                            isset($lot['strainResult']) ? $lot['strainResult'] : '',
                            $lotId
                        ]);
                    } else {
                        // สร้างล็อตใหม่
                        $lotSql = "INSERT INTO inspection_lots (
                                  inspection_id, lot_number, pieces_per_lot, description, 
                                  pallet_no, strain_std, first_sample_size, first_sample_ac_re, 
                                  second_sample_size, second_sample_ac_re, result, qp, strain_result
                                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                        
                        $lotStmt = $db->prepare($lotSql);
                        $lotStmt->execute([
                            $id,
                            $lotNumber,
                            isset($lot['piecesPerLot']) ? $lot['piecesPerLot'] : 0,
                            isset($lot['description']) ? $lot['description'] : '',
                            isset($lot['palletNo']) ? $lot['palletNo'] : '',
                            isset($lot['strainStd']) ? $lot['strainStd'] : null,
                            isset($lot['firstSampleSize']) ? $lot['firstSampleSize'] : null,
                            isset($lot['firstSampleAcRe']) ? $lot['firstSampleAcRe'] : '',
                            isset($lot['secondSampleSize']) ? $lot['secondSampleSize'] : null,
                            isset($lot['secondSampleAcRe']) ? $lot['secondSampleAcRe'] : '',
                            isset($lot['result']) ? $lot['result'] : '',
                            isset($lot['qp']) ? $lot['qp'] : '',
                            isset($lot['strainResult']) ? $lot['strainResult'] : ''
                        ]);
                        
                        $lotId = $db->lastInsertId();
                    }
                    
                    $lotIds[$lotNumber] = $lotId;
                }
                
                // 3. อัพเดทข้อมูลข้อบกพร่อง
                if (!empty($data['defects'])) {
                    // ลบข้อบกพร่องเดิมทั้งหมด
                    foreach ($lotIds as $lotKey => $lotId) {
                        $deleteSql = "DELETE FROM lot_defects WHERE lot_id = ?";
                        $deleteStmt = $db->prepare($deleteSql);
                        $deleteStmt->execute([$lotId]);
                    }
                    
                    // เพิ่มข้อบกพร่องใหม่
                    foreach ($data['defects'] as $defect) {
                        $lotKey = 'lot' . $defect['lot'];
                        
                        if (!isset($lotIds[$lotKey])) {
                            continue;
                        }
                        
                        $defectSql = "INSERT INTO lot_defects (lot_id, defect_code, defect_count) 
                                     VALUES (?, ?, ?)";
                        
                        $defectStmt = $db->prepare($defectSql);
                        $defectStmt->execute([
                            $lotIds[$lotKey],
                            $defect['defectCode'],
                            isset($defect['count']) ? $defect['count'] : 0
                        ]);
                    }
                }
                
                // 4. อัพเดทข้อมูลการวัดความเครียด
                if (!empty($data['strainMeasurements'])) {
                    // ลบการวัดความเครียดเดิมทั้งหมด
                    foreach ($lotIds as $lotKey => $lotId) {
                        $deleteSql = "DELETE FROM strain_measurements WHERE lot_id = ?";
                        $deleteStmt = $db->prepare($deleteSql);
                        $deleteStmt->execute([$lotId]);
                    }
                    
                    // เพิ่มการวัดความเครียดใหม่
                    foreach ($data['strainMeasurements'] as $measurement) {
                        $lotKey = 'lot' . $measurement['lot'];
                        
                        if (!isset($lotIds[$lotKey])) {
                            continue;
                        }
                        
                        $strainSql = "INSERT INTO strain_measurements (lot_id, position, value) 
                                     VALUES (?, ?, ?)";
                        
                        $strainStmt = $db->prepare($strainSql);
                        $strainStmt->execute([
                            $lotIds[$lotKey],
                            $measurement['position'],
                            $measurement['value']
                        ]);
                    }
                }
            }
            
            // Commit transaction
            $db->commit();
            
            return true;
        } catch (Exception $e) {
            // Rollback ถ้าเกิดข้อผิดพลาด
            if ($db && $db->inTransaction()) {
                $db->rollBack();
            }
            
            throw new Exception("Error updating inspection: " . $e->getMessage());
        }
    }
}
?>