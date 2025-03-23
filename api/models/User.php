<?php
/**
 * User Model
 * โมเดลสำหรับจัดการข้อมูลผู้ใช้
 */

// ป้องกันการเข้าถึงไฟล์โดยตรง
if (!defined('INCLUDE_API')) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Direct access not permitted']);
    exit;
}

require_once 'models/BaseModel.php';

class User extends BaseModel {
    // ชื่อตาราง
    protected $table = 'users';
    
    // ฟิลด์ที่อนุญาตให้แก้ไขได้
    protected $fillable = [
        'username', 'password', 'email', 'display_name', 'role', 'is_active'
    ];
    
    // ฟิลด์ที่ต้องการให้ซ่อนในการแสดงผล
    protected $hidden = ['password'];
    
    /**
     * ดึงผู้ใช้ทั้งหมด
     */
    public function getAll($limit = 100, $offset = 0) {
        try {
            $db = getPDO();
            
            $sql = "SELECT id, username, email, display_name, role, last_login, is_active, created_at, updated_at 
                    FROM {$this->table} 
                    ORDER BY id DESC 
                    LIMIT ? OFFSET ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$limit, $offset]);
            
            return $stmt->fetchAll();
        } catch (Exception $e) {
            throw new Exception("Error fetching users: " . $e->getMessage());
        }
    }
    
    /**
     * ดึงผู้ใช้ตาม ID
     */
    public function getById($id) {
        try {
            $db = getPDO();
            
            $sql = "SELECT id, username, email, display_name, role, last_login, is_active, created_at, updated_at 
                    FROM {$this->table} 
                    WHERE id = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            
            return $stmt->fetch();
        } catch (Exception $e) {
            throw new Exception("Error fetching user: " . $e->getMessage());
        }
    }
    
    /**
     * ดึงผู้ใช้ตาม username
     */
    public function getByUsername($username) {
        try {
            $db = getPDO();
            
            $sql = "SELECT id, username, email, display_name, role, last_login, is_active, created_at, updated_at 
                    FROM {$this->table} 
                    WHERE username = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$username]);
            
            return $stmt->fetch();
        } catch (Exception $e) {
            throw new Exception("Error fetching user: " . $e->getMessage());
        }
    }
    
    /**
     * สร้างผู้ใช้ใหม่
     */
    public function create($data) {
        try {
            // ตรวจสอบว่ามี username หรือ email ซ้ำหรือไม่
            if ($this->isUsernameExists($data['username'])) {
                throw new Exception("Username already exists", 400);
            }
            
            if ($this->isEmailExists($data['email'])) {
                throw new Exception("Email already exists", 400);
            }
            
            // เข้ารหัสรหัสผ่าน
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => HASH_COST]);
            
            $db = getPDO();
            
            $sql = "INSERT INTO {$this->table} (username, password, email, display_name, role, is_active) 
                    VALUES (?, ?, ?, ?, ?, ?)";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([
                $data['username'],
                $data['password'],
                $data['email'],
                $data['display_name'],
                $data['role'] ?? 'viewer',
                $data['is_active'] ?? 1
            ]);
            
            return $db->lastInsertId();
        } catch (Exception $e) {
            throw new Exception("Error creating user: " . $e->getMessage(), 
                                $e->getCode() ? $e->getCode() : 500);
        }
    }
    
    /**
     * อัพเดทข้อมูลผู้ใช้
     */
    public function update($id, $data) {
        try {
            // ตรวจสอบว่ามี username หรือ email ซ้ำหรือไม่ (ยกเว้นของผู้ใช้คนนี้)
            if (isset($data['username']) && $this->isUsernameExists($data['username'], $id)) {
                throw new Exception("Username already exists", 400);
            }
            
            if (isset($data['email']) && $this->isEmailExists($data['email'], $id)) {
                throw new Exception("Email already exists", 400);
            }
            
            // เตรียม fields และ parameters สำหรับ SQL
            $fields = [];
            $params = [];
            
            foreach ($this->fillable as $field) {
                if (isset($data[$field])) {
                    // เข้ารหัสรหัสผ่านถ้ามีการแก้ไข
                    if ($field === 'password' && !empty($data[$field])) {
                        $data[$field] = password_hash($data[$field], PASSWORD_BCRYPT, ['cost' => HASH_COST]);
                    }
                    
                    $fields[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }
            
            // ถ้าไม่มีข้อมูลที่จะอัพเดท
            if (empty($fields)) {
                return true;
            }
            
            // เพิ่ม ID เข้าไปใน parameters
            $params[] = $id;
            
            $db = getPDO();
            
            $sql = "UPDATE {$this->table} SET " . implode(", ", $fields) . " WHERE id = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            throw new Exception("Error updating user: " . $e->getMessage(), 
                                $e->getCode() ? $e->getCode() : 500);
        }
    }
    
    /**
     * ลบผู้ใช้
     */
    public function delete($id) {
        try {
            $db = getPDO();
            
            // ไม่ลบจริงๆ แต่เปลี่ยนสถานะเป็นไม่ใช้งาน
            $sql = "UPDATE {$this->table} SET is_active = 0 WHERE id = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            throw new Exception("Error deleting user: " . $e->getMessage());
        }
    }
    
    /**
     * ตรวจสอบว่า username มีอยู่แล้วหรือไม่
     */
    private function isUsernameExists($username, $excludeId = null) {
        try {
            $db = getPDO();
            
            $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE username = ?";
            $params = [$username];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
                    
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            $result = $stmt->fetch();
            
            return $result['count'] > 0;
        } catch (Exception $e) {
            throw new Exception("Error checking username: " . $e->getMessage());
        }
    }
    
    /**
     * ตรวจสอบว่า email มีอยู่แล้วหรือไม่
     */
    private function isEmailExists($email, $excludeId = null) {
        try {
            $db = getPDO();
            
            $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE email = ?";
            $params = [$email];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
                    
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            $result = $stmt->fetch();
            
            return $result['count'] > 0;
        } catch (Exception $e) {
            throw new Exception("Error checking email: " . $e->getMessage());
        }
    }
    
    /**
     * เปลี่ยนรหัสผ่าน
     */
    public function changePassword($id, $currentPassword, $newPassword) {
        try {
            // ตรวจสอบรหัสผ่านปัจจุบัน
            $db = getPDO();
            
            $sql = "SELECT password FROM {$this->table} WHERE id = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            
            $user = $stmt->fetch();
            
            if (!$user) {
                throw new Exception("User not found", 404);
            }
            
            if (!password_verify($currentPassword, $user['password'])) {
                throw new Exception("Current password is incorrect", 400);
            }
            
            // เปลี่ยนรหัสผ่าน
            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => HASH_COST]);
            
            $sql = "UPDATE {$this->table} SET password = ? WHERE id = ?";
                    
            $stmt = $db->prepare($sql);
            $stmt->execute([$hashedPassword, $id]);
            
            return true;
        } catch (Exception $e) {
            throw new Exception("Error changing password: " . $e->getMessage(), 
                                $e->getCode() ? $e->getCode() : 500);
        }
    }
}
?>