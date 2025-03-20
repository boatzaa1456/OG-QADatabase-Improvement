// เมื่อเอกสารโหลดเสร็จ
$(document).ready(function() {
    // เรียกฟังก์ชันเพื่อแสดงแบบฟอร์ม
    displayQAForm();
});

// ฟังก์ชันแสดงแบบฟอร์ม QA
function displayQAForm() {
    // สร้าง HTML สำหรับแบบฟอร์ม
    const formHTML = createQAFormHTML();
    
    // แสดงแบบฟอร์มในหน้าเว็บ
    $('#qa-form').html(formHTML);
    
    // เพิ่ม event listeners สำหรับฟังก์ชันต่างๆ ในฟอร์ม
    addFormEventListeners();
}

// ฟังก์ชันสร้าง HTML สำหรับแบบฟอร์ม QA
function createQAFormHTML() {
    return `
        <h2 class="mb-3">QA QUALITY DATA 1</h2>
        <form id="quality-form">
            <!-- ส่วนที่ 1: ข้อมูลทั่วไป -->
            <div class="form-section">
                <h3>ข้อมูลทั่วไป</h3>
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label for="doc-pt" class="form-label">Doc: PT</label>
                        <input type="text" class="form-control" id="doc-pt" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="production-date" class="form-label">Production Date</label>
                        <input type="date" class="form-control" id="production-date" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Shift</label>
                        <div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="shift" id="shift-a" value="A">
                                <label class="form-check-label" for="shift-a">A (เช้า)</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="shift" id="shift-m" value="M">
                                <label class="form-check-label" for="shift-m">M (บ่าย)</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="shift" id="shift-n" value="N">
                                <label class="form-check-label" for="shift-n">N (ดึก)</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label for="item-number" class="form-label">Item Number</label>
                        <input type="text" class="form-control" id="item-number" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="gauge-mark" class="form-label">Gauge Mark (mm)</label>
                        <input type="number" step="0.01" class="form-control" id="gauge-mark">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Production Type</label>
                        <div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="production-type" id="production-1" value="1" checked>
                                <label class="form-check-label" for="production-1">Production 1</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="production-type" id="production-3" value="3">
                                <label class="form-check-label" for="production-3">Production 3</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-3 mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="rework">
                            <label class="form-check-label" for="rework">Rework</label>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="destroy">
                            <label class="form-check-label" for="destroy">ทำลาย</label>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="use-jig">
                            <label class="form-check-label" for="use-jig">ใช้ JIG</label>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="no-jig">
                            <label class="form-check-label" for="no-jig">ไม่ใช้ JIG</label>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label for="machine-no" class="form-label">Machine No.</label>
                        <input type="text" class="form-control" id="machine-no" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="total-product" class="form-label">Total Product</label>
                        <input type="number" class="form-control" id="total-product" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="sampling-date" class="form-label">Sampling Date</label>
                        <input type="date" class="form-control" id="sampling-date" required>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="work-order" class="form-label">Work Order</label>
                        <input type="text" class="form-control" id="work-order" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="operation" class="form-label">Operation</label>
                        <input type="text" class="form-control" id="operation">
                    </div>
                </div>
            </div>
            
            <!-- ส่วนที่ 2: ข้อมูลล็อตและการสุ่มตัวอย่าง (จะเพิ่มในขั้นต่อไป) -->
            
            <!-- ปุ่มบันทึก -->
            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button type="button" class="btn btn-secondary me-md-2">ล้างฟอร์ม</button>
                <button type="submit" class="btn btn-primary">บันทึกข้อมูล</button>
            </div>
        </form>
    `;
}

// ฟังก์ชันเพิ่ม event listeners สำหรับฟอร์ม
function addFormEventListeners() {
    // Event listener สำหรับการส่งฟอร์ม
    $('#quality-form').on('submit', function(event) {
        event.preventDefault();
        saveFormData();
    });
    
    // อื่นๆ event listeners ที่จำเป็น
}

// ฟังก์ชันบันทึกข้อมูลจากฟอร์ม (จะพัฒนาในขั้นต่อไป)
function saveFormData() {
    alert('บันทึกข้อมูลเรียบร้อย (ฟังก์ชันทดสอบ)');
    // ในอนาคตจะส่งข้อมูลไปยังฐานข้อมูล
}