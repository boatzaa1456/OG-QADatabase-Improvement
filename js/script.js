// ตรวจสอบ jQuery ก่อน
if (typeof jQuery === 'undefined') {
    throw new Error('jQuery is not loaded. Please include jQuery library.');
}

// กำหนดประเภทข้อบกพร่องและรายการข้อบกพร่อง
const defectCategories = [
    { id: 1, name: 'ข้อบกพร่องที่ผิว (Surface Defects)' },
    { id: 2, name: 'ข้อบกพร่องรูปทรง (Shape Defects)' },
    { id: 3, name: 'ข้อบกพร่องจากการผลิต (Manufacturing)' },
    { id: 4, name: 'ข้อบกพร่องอื่นๆ (Others)' }
];

const defectTypes = [
    // กลุ่มข้อบกพร่องที่ผิว (Surface Defects)
    { id: '1019', name: 'Dirty body', categoryId: 1 },
    { id: '1052', name: 'Scratch', categoryId: 1 },
    { id: '1001', name: 'Blister on surface', categoryId: 1 },
    
    // กลุ่มข้อบกพร่องรูปทรง (Shape Defects)
    { id: '1047', name: 'Rocker bottom', categoryId: 2 },
    { id: '1012', name: 'Distorted', categoryId: 2 },
    { id: '1015', name: 'Thin bottom', categoryId: 2 },
    
    // กลุ่มข้อบกพร่องจากการผลิต (Manufacturing Defects)
    { id: '1106', name: 'Wrong Joint', categoryId: 3 },
    { id: '1024', name: 'Blister', categoryId: 3 },
    { id: 'Cold Mark', name: 'Cold Mark', categoryId: 3 },
    { id: 'Cold Glass', name: 'Cold Glass', categoryId: 3 },
    
    // กลุ่มข้อบกพร่องอื่นๆ (Others)
    { id: '1099', name: 'Others', categoryId: 4 }
    // เพิ่มข้อบกพร่องอื่นๆ ที่ต้องการ
];

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
                                <input class="form-check-input" type="radio" name="shift" id="shift-m" value="M">
                                <label class="form-check-label" for="shift-m">M (เช้า)</label>
                            </div>
                            <div class="form-check form-check-inline">
                                <input class="form-check-input" type="radio" name="shift" id="shift-a" value="A">
                                <label class="form-check-label" for="shift-a">A (บ่าย)</label>
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
                    <div class="col-md-6 mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="use-jig">
                            <label class="form-check-label" for="use-jig">ใช้ JIG</label>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
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
            
            <!-- ส่วนที่ 2: ข้อมูลล็อตและการสุ่มตัวอย่าง -->
            <div class="form-section">
                <h3>ข้อมูลล็อตและการสุ่มตัวอย่าง</h3>
                
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th width="15%">Field</th>
                                <th width="20%">ล็อต 1</th>
                                <th width="20%">ล็อต 2</th>
                                <th width="20%">ล็อต 3</th>
                                <th width="20%">ล็อต 4</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <th>LOT</th>
                                <td><input type="text" class="form-control" id="lot-number-1" placeholder="เช่น 1-11"></td>
                                <td><input type="text" class="form-control" id="lot-number-2" placeholder="เช่น 12-22"></td>
                                <td><input type="text" class="form-control" id="lot-number-3"></td>
                                <td><input type="text" class="form-control" id="lot-number-4"></td>
                            </tr>
                            <tr>
                                <th>จำนวนต่อล็อต</th>
                                <td><input type="number" class="form-control" id="pieces-per-lot-1"></td>
                                <td><input type="number" class="form-control" id="pieces-per-lot-2"></td>
                                <td><input type="number" class="form-control" id="pieces-per-lot-3"></td>
                                <td><input type="number" class="form-control" id="pieces-per-lot-4"></td>
                            </tr>
                            <tr>
                                <th>DESCRIPTION</th>
                                <td><input type="text" class="form-control" id="description-1"></td>
                                <td><input type="text" class="form-control" id="description-2"></td>
                                <td><input type="text" class="form-control" id="description-3"></td>
                                <td><input type="text" class="form-control" id="description-4"></td>
                            </tr>
                            <tr>
                                <th>Pallet No.</th>
                                <td><input type="text" class="form-control" id="pallet-no-1"></td>
                                <td><input type="text" class="form-control" id="pallet-no-2"></td>
                                <td><input type="text" class="form-control" id="pallet-no-3"></td>
                                <td><input type="text" class="form-control" id="pallet-no-4"></td>
                            </tr>
                            <tr>
                                <th>Strain Std.</th>
                                <td><input type="number" step="0.01" class="form-control" id="strain-std-1"></td>
                                <td><input type="number" step="0.01" class="form-control" id="strain-std-2"></td>
                                <td><input type="number" step="0.01" class="form-control" id="strain-std-3"></td>
                                <td><input type="number" step="0.01" class="form-control" id="strain-std-4"></td>
                            </tr>
                            <tr>
                                <th>1st Sample Size</th>
                                <td><input type="number" class="form-control" id="first-sample-size-1"></td>
                                <td><input type="number" class="form-control" id="first-sample-size-2"></td>
                                <td><input type="number" class="form-control" id="first-sample-size-3"></td>
                                <td><input type="number" class="form-control" id="first-sample-size-4"></td>
                            </tr>
                            <tr>
                                <th>1st Sample Ac. Re.</th>
                                <td><input type="text" class="form-control" id="first-sample-ac-re-1"></td>
                                <td><input type="text" class="form-control" id="first-sample-ac-re-2"></td>
                                <td><input type="text" class="form-control" id="first-sample-ac-re-3"></td>
                                <td><input type="text" class="form-control" id="first-sample-ac-re-4"></td>
                            </tr>
                            <tr>
                                <th>2nd Sample Size</th>
                                <td><input type="number" class="form-control" id="second-sample-size-1"></td>
                                <td><input type="number" class="form-control" id="second-sample-size-2"></td>
                                <td><input type="number" class="form-control" id="second-sample-size-3"></td>
                                <td><input type="number" class="form-control" id="second-sample-size-4"></td>
                            </tr>
                            <tr>
                                <th>2nd Sample Ac. Re.</th>
                                <td><input type="text" class="form-control" id="second-sample-ac-re-1"></td>
                                <td><input type="text" class="form-control" id="second-sample-ac-re-2"></td>
                                <td><input type="text" class="form-control" id="second-sample-ac-re-3"></td>
                                <td><input type="text" class="form-control" id="second-sample-ac-re-4"></td>
                            </tr>
                            <tr>
                                <th>Result</th>
                                <td>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-1" id="accept-1" value="Accept">
                                        <label class="form-check-label" for="accept-1">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-1" id="reject-1" value="Reject">
                                        <label class="form-check-label" for="reject-1">Reject</label>
                                    </div>
                                </td>
                                <td>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-2" id="accept-2" value="Accept">
                                        <label class="form-check-label" for="accept-2">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-2" id="reject-2" value="Reject">
                                        <label class="form-check-label" for="reject-2">Reject</label>
                                    </div>
                                </td>
                                <td>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-3" id="accept-3" value="Accept">
                                        <label class="form-check-label" for="accept-3">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-3" id="reject-3" value="Reject">
                                        <label class="form-check-label" for="reject-3">Reject</label>
                                    </div>
                                </td>
                                <td>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-4" id="accept-4" value="Accept">
                                        <label class="form-check-label" for="accept-4">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-4" id="reject-4" value="Reject">
                                        <label class="form-check-label" for="reject-4">Reject</label>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th>QP.</th>
                                <td><input type="text" class="form-control" id="qp-1"></td>
                                <td><input type="text" class="form-control" id="qp-2"></td>
                                <td><input type="text" class="form-control" id="qp-3"></td>
                                <td><input type="text" class="form-control" id="qp-4"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- ส่วนที่ 3: ข้อมูลข้อบกพร่อง -->
            <div class="form-section" id="defects-section">
                <h3>ข้อมูลข้อบกพร่อง</h3>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="input-group">
                            <input type="text" id="defect-search" class="form-control" placeholder="ค้นหารหัสหรือชื่อข้อบกพร่อง...">
                            <button class="btn btn-outline-secondary" type="button" id="clear-defect-search">ล้าง</button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <select id="defect-category" class="form-select">
                            <option value="0">ทุกประเภท</option>
                            ${defectCategories.map(category => 
                                `<option value="${category.id}">${category.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header bg-light">รายการข้อบกพร่องที่มี</div>
                            <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                                <div id="defect-list" class="row">
                                    <!-- Defect list will be populated here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header bg-light">เลือกล็อตที่ต้องการระบุข้อบกพร่อง</div>
                            <div class="card-body">
                                <div class="btn-group w-100" role="group">
                                    <button type="button" class="btn btn-primary lot-selector" data-lot="1">ล็อต 1</button>
                                    <button type="button" class="btn btn-outline-primary lot-selector" data-lot="2">ล็อต 2</button>
                                    <button type="button" class="btn btn-outline-primary lot-selector" data-lot="3">ล็อต 3</button>
                                    <button type="button" class="btn btn-outline-primary lot-selector" data-lot="4">ล็อต 4</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-bordered defect-table">
                        <thead class="table-light">
                            <tr>
                                <th width="10%">รหัส</th>
                                <th width="25%">ข้อบกพร่อง</th>
                                <th width="15%">ล็อต 1</th>
                                <th width="15%">ล็อต 2</th>
                                <th width="15%">ล็อต 3</th>
                                <th width="15%">ล็อต 4</th>
                                <th width="5%"></th>
                            </tr>
                        </thead>
                        <tbody id="active-defects">
                            <!-- Active defects will be populated here -->
                        </tbody>
                        <tfoot>
                            <tr class="table-secondary">
                                <th colspan="2">TOTAL</th>
                                <td id="total-defects-1">0</td>
                                <td id="total-defects-2">0</td>
                                <td id="total-defects-3">0</td>
                                <td id="total-defects-4">0</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            <!-- ส่วนที่ 4: ข้อมูลการวัดความเครียด -->
            <div class="form-section">
                <h3>การวัดความเครียด (Strain Y-line)</h3>
                
                <div class="table-responsive">
                    <table class="table table-bordered strain-table">
                        <thead>
                            <tr>
                                <th>ตำแหน่ง</th>
                                <th>ล็อต 1</th>
                                <th>ล็อต 2</th>
                                <th>ล็อต 3</th>
                                <th>ล็อต 4</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="1" data-position="1"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="2" data-position="1"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="3" data-position="1"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="4" data-position="1"></td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="1" data-position="2"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="2" data-position="2"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="3" data-position="2"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="4" data-position="2"></td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="1" data-position="3"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="2" data-position="3"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="3" data-position="3"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="4" data-position="3"></td>
                            </tr>
                            <tr>
                                <td>4</td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="1" data-position="4"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="2" data-position="4"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="3" data-position="4"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="4" data-position="4"></td>
                            </tr>
                            <tr>
                                <td>5</td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="1" data-position="5"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="2" data-position="5"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="3" data-position="5"></td>
                                <td><input type="number" step="0.01" class="form-control form-control-sm strain-input" data-lot="4" data-position="5"></td>
                            </tr>
                            <tr class="table-secondary">
                                <th>ผลการตรวจสอบ</th>
                                <td>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="strain-result-1" id="strain-accept-1" value="Accept">
                                        <label class="form-check-label" for="strain-accept-1">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="strain-result-1" id="strain-reject-1" value="Reject">
                                        <label class="form-check-label" for="strain-reject-1">Reject</label>
                                    </div>
                                </td>
                                <td>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="strain-result-2" id="strain-accept-2" value="Accept">
                                        <label class="form-check-label" for="strain-accept-2">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="strain-result-2" id="strain-reject-2" value="Reject">
                                        <label class="form-check-label" for="strain-reject-2">Reject</label>
                                    </div>
                                </td>
                                <td>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="strain-result-3" id="strain-accept-3" value="Accept">
                                        <label class="form-check-label" for="strain-accept-3">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="strain-result-3" id="strain-reject-3" value="Reject">
                                        <label class="form-check-label" for="strain-reject-3">Reject</label>
                                    </div>
                                </td>
                                <td>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="strain-result-4" id="strain-accept-4" value="Accept">
                                        <label class="form-check-label" for="strain-accept-4">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="strain-result-4" id="strain-reject-4" value="Reject">
                                        <label class="form-check-label" for="strain-reject-4">Reject</label>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <label for="strain-std" class="form-label">Std. 5.26 Mpa</label>
                    </div>
                </div>
            </div>
            
            <!-- ส่วนที่ 5: ข้อมูลการอนุมัติ -->
            <div class="form-section">
                <h3>การอนุมัติ</h3>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="inspector" class="form-label">Inspector</label>
                        <select class="form-select" id="inspector" required>
                            <option value="">เลือกผู้ตรวจสอบ</option>
                            <option value="inspector1">ผู้ตรวจสอบ 1</option>
                            <option value="inspector2">ผู้ตรวจสอบ 2</option>
                            <option value="inspector3">ผู้ตรวจสอบ 3</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="supervisor" class="form-label">Supervisor</label>
                        <select class="form-select" id="supervisor" required>
                            <option value="">เลือกผู้ตรวจทาน</option>
                            <option value="supervisor1">ผู้ตรวจทาน 1</option>
                            <option value="supervisor2">ผู้ตรวจทาน 2</option>
                            <option value="supervisor3">ผู้ตรวจทาน 3</option>
                        </select>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <label for="remarks" class="form-label">Remarks</label>
                        <textarea class="form-control" id="remarks" rows="3"></textarea>
                    </div>
                </div>
            </div>
            
            <!-- ปุ่มบันทึก -->
            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button type="button" class="btn btn-secondary me-md-2" id="clear-form">ล้างฟอร์ม</button>
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
    
    // Event listener สำหรับการล้างฟอร์ม
    $('#clear-form').on('click', function() {
        clearForm();
    });
    
    // เรียกใช้ฟังก์ชันเตรียมข้อมูลข้อบกพร่อง
    initDefectsSection();
    
    // คำนวณผลรวมเริ่มต้น
    calculateDefectTotals();
}

// ฟังก์ชันเตรียมข้อมูลในส่วนข้อบกพร่อง
function initDefectsSection() {
    // ตั้งค่าตัวแปรเริ่มต้น
    let selectedCategory = 0;
    let selectedLot = 1;
    let searchTerm = '';
    let activeDefects = [];
    
    // ฟังก์ชันช่วยกรองข้อบกพร่อง
    function getFilteredDefects() {
        let filtered = defectTypes;
        
        if (selectedCategory > 0) {
            filtered = filtered.filter(defect => defect.categoryId === selectedCategory);
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                defect => defect.id.toLowerCase().includes(term) || 
                          defect.name.toLowerCase().includes(term)
            );
        }
        
        return filtered;
    }
    
    // แสดงรายการข้อบกพร่อง
    function renderDefectList() {
        const defectsHtml = getFilteredDefects().map(defect => `
            <div class="col-md-6 mb-2">
                <div class="d-grid">
                    <button class="btn btn-outline-primary text-start add-defect-btn" data-id="${defect.id}">
                        <small class="text-muted">${defect.id}</small><br>
                        ${defect.name}
                    </button>
                </div>
            </div>
        `).join('');
        
        $('#defect-list').html(defectsHtml || '<div class="col-12 text-center py-3"><em>ไม่พบข้อบกพร่องที่ตรงกับเงื่อนไข</em></div>');
        
        // เพิ่ม event listeners
        $('.add-defect-btn').on('click', function() {
            const defectId = $(this).data('id');
            addDefect(defectId);
        });
    }
    
    // แสดงข้อบกพร่องที่เลือกไว้
    function renderActiveDefects() {
        const activeDefectsHtml = activeDefects.map(defect => `
            <tr>
                <td>${defect.id}</td>
                <td>${defect.name}</td>
                <td>
                    <input type="number" min="0" class="form-control form-control-sm defect-count-input" 
                           data-defect="${defect.id}" data-lot="1" value="${defect.counts[1]}">
                </td>
                <td>
                    <input type="number" min="0" class="form-control form-control-sm defect-count-input" 
                           data-defect="${defect.id}" data-lot="2" value="${defect.counts[2]}">
                </td>
                <td>
                    <input type="number" min="0" class="form-control form-control-sm defect-count-input" 
                           data-defect="${defect.id}" data-lot="3" value="${defect.counts[3]}">
                </td>
                <td>
                    <input type="number" min="0" class="form-control form-control-sm defect-count-input" 
                           data-defect="${defect.id}" data-lot="4" value="${defect.counts[4]}">
                </td>
                <td>
                    <button class="btn btn-sm btn-danger remove-defect-btn" data-id="${defect.id}">ลบ</button>
                </td>
            </tr>
        `).join('');
        
        $('#active-defects').html(activeDefectsHtml);
        
        // เพิ่ม event listeners
        $('.defect-count-input').on('change', function() {
            const defectId = $(this).data('defect');
            const lot = $(this).data('lot');
            const value = parseInt($(this).val()) || 0;
            updateDefectCount(defectId, lot, value);
        });
        
        $('.remove-defect-btn').on('click', function() {
            const defectId = $(this).data('id');
            removeDefect(defectId);
        });
        
        // อัพเดทผลรวม
        calculateDefectTotals();
    }
    
    // เพิ่มข้อบกพร่องในรายการที่เลือก
    function addDefect(defectId) {
        if (!activeDefects.some(d => d.id === defectId)) {
            const defect = defectTypes.find(d => d.id === defectId);
            if (defect) {
                activeDefects.push({
                    ...defect,
                    counts: { 1: 0, 2: 0, 3: 0, 4: 0 }
                });
                renderActiveDefects();
            }
        }
    }
    
    // ลบข้อบกพร่องจากรายการที่เลือก
    function removeDefect(defectId) {
        activeDefects = activeDefects.filter(d => d.id !== defectId);
        renderActiveDefects();
    }
    
    // อัพเดทจำนวนข้อบกพร่อง
    function updateDefectCount(defectId, lot, value) {
        activeDefects = activeDefects.map(defect => {
            if (defect.id === defectId) {
                return {
                    ...defect,
                    counts: {
                        ...defect.counts,
                        [lot]: value
                    }
                };
            }
            return defect;
        });
        
        calculateDefectTotals();
    }
    
    // เพิ่ม event listeners
    $('#defect-search').on('keyup', function() {
        searchTerm = $(this).val().trim();
        renderDefectList();
    });
    
    $('#clear-defect-search').on('click', function() {
        $('#defect-search').val('');
        searchTerm = '';
        renderDefectList();
    });
    
    $('#defect-category').on('change', function() {
        selectedCategory = parseInt($(this).val());
        renderDefectList();
    });
    
    $('.lot-selector').on('click', function() {
        $('.lot-selector').removeClass('btn-primary').addClass('btn-outline-primary');
        $(this).removeClass('btn-outline-primary').addClass('btn-primary');
        selectedLot = parseInt($(this).data('lot'));
    });
    
    // เริ่มต้นแสดงรายการข้อบกพร่อง
    renderDefectList();
}

// ฟังก์ชันคำนวณผลรวมข้อบกพร่อง
function calculateDefectTotals() {
    for (let lot = 1; lot <= 4; lot++) {
        let total = 0;
        $(`.defect-count-input[data-lot="${lot}"]`).each(function() {
            total += parseInt($(this).val()) || 0;
        });
        $(`#total-defects-${lot}`).text(total);
    }
}

// ฟังก์ชันล้างฟอร์ม
function clearForm() {
    if (confirm('คุณต้องการล้างข้อมูลทั้งหมดในฟอร์มนี้ใช่หรือไม่?')) {
        $('#quality-form')[0].reset();
        $('#active-defects').empty();
        calculateDefectTotals();
        
        // ตั้งค่าล็อตกลับเป็นค่าเริ่มต้น
        $('.lot-selector').removeClass('btn-primary').addClass('btn-outline-primary');
        $('.lot-selector[data-lot="1"]').removeClass('btn-outline-primary').addClass('btn-primary');
        
        // รีเซ็ตการค้นหาข้อบกพร่อง
        $('#defect-search').val('');
        $('#defect-category').val(0);
        $('#defect-list').empty();
        
        // รีโหลดรายการข้อบกพร่อง
        initDefectsSection();
    }
}

// ฟังก์ชันบันทึกข้อมูลจากฟอร์ม
function saveFormData() {
    // เก็บข้อมูลจากฟอร์ม
    const formData = {
        // ข้อมูลทั่วไป
        docPT: $('#doc-pt').val(),
        productionDate: $('#production-date').val(),
        shift: $('input[name="shift"]:checked').val(),
        itemNumber: $('#item-number').val(),
        gaugeMark: $('#gauge-mark').val(),
        productionType: $('input[name="production-type"]:checked').val(),
        useJig: $('#use-jig').is(':checked'),
        noJig: $('#no-jig').is(':checked'),
        machineNo: $('#machine-no').val(),
        totalProduct: $('#total-product').val(),
        samplingDate: $('#sampling-date').val(),
        workOrder: $('#work-order').val(),
        operation: $('#operation').val(),
        
        // ข้อมูลล็อต (จะเก็บเป็นอาร์เรย์)
        lots: [],
        
        // ข้อมูลข้อบกพร่อง (จะเก็บเป็นอาร์เรย์)
        defects: [],
        
        // ข้อมูลการวัดความเครียด (จะเก็บเป็นอาร์เรย์)
        strainMeasurements: [],
        
        // ข้อมูลการอนุมัติ
        inspector: $('#inspector').val(),
        supervisor: $('#supervisor').val(),
        remarks: $('#remarks').val()
    };
    
    // เก็บข้อมูลล็อต
    for (let i = 1; i <= 4; i++) {
        const lotData = {
            lotNumber: $(`#lot-number-${i}`).val(),
            piecesPerLot: $(`#pieces-per-lot-${i}`).val(),
            description: $(`#description-${i}`).val(),
            palletNo: $(`#pallet-no-${i}`).val(),
            strainStd: $(`#strain-std-${i}`).val(),
            firstSampleSize: $(`#first-sample-size-${i}`).val(),
            firstSampleAcRe: $(`#first-sample-ac-re-${i}`).val(),
            secondSampleSize: $(`#second-sample-size-${i}`).val(),
            secondSampleAcRe: $(`#second-sample-ac-re-${i}`).val(),
            result: $(`input[name="result-${i}"]:checked`).val(),
            qp: $(`#qp-${i}`).val(),
            strainResult: $(`input[name="strain-result-${i}"]:checked`).val()
        };
        
        // เพิ่มข้อมูลล็อตเข้าอาร์เรย์เฉพาะเมื่อมีการกรอกข้อมูล
        if (lotData.lotNumber) {
            formData.lots.push(lotData);
        }
    }
    
    // เก็บข้อมูลข้อบกพร่อง (จากตารางข้อบกพร่องที่เลือก)
    $('.defect-count-input').each(function() {
        const defectId = $(this).data('defect');
        const lot = $(this).data('lot');
        const count = parseInt($(this).val()) || 0;
        
        if (count > 0) {
            formData.defects.push({
                lot: lot,
                defectCode: defectId,
                count: count
            });
        }
    });
    
    // เก็บข้อมูลการวัดความเครียด
    $('.strain-input').each(function() {
        const lot = $(this).data('lot');
        const position = $(this).data('position');
        const value = parseFloat($(this).val());
        
        if (value) {
            formData.strainMeasurements.push({
                lot: lot,
                position: position,
                value: value
            });
        }
    });
    
    // ตรวจสอบว่ามีการกรอกข้อมูลพื้นฐานครบถ้วนหรือไม่
    if (!formData.docPT || !formData.productionDate || !formData.shift || !formData.itemNumber || !formData.machineNo || !formData.totalProduct || !formData.samplingDate || !formData.workOrder) {
        alert('กรุณากรอกข้อมูลพื้นฐานให้ครบถ้วน');
        return;
    }
    
    // ตรวจสอบว่ามีการเลือกผู้ตรวจสอบและผู้ตรวจทาน
    if (!formData.inspector || !formData.supervisor) {
        alert('กรุณาเลือกผู้ตรวจสอบและผู้ตรวจทาน');
        return;
    }
    
    // ตรวจสอบว่ามีการกรอกข้อมูลล็อตอย่างน้อย 1 ล็อตหรือไม่
    if (formData.lots.length === 0) {
        alert('กรุณากรอกข้อมูลล็อตอย่างน้อย 1 ล็อต');
        return;
    }
    
    // ส่งข้อมูลไปยังเซิร์ฟเวอร์
    sendDataToServer(formData);
}

// ฟังก์ชันสำหรับส่งข้อมูลไปยังเซิร์ฟเวอร์
function sendDataToServer(data) {
    // แสดงข้อความกำลังบันทึกข้อมูล
    $('#qa-form').append('<div class="alert alert-info mt-3" id="save-status">กำลังบันทึกข้อมูล...</div>');
    
    // เพิ่ม console.log เพื่อดูข้อมูลที่ส่ง (สำหรับการพัฒนา)
    console.log("ข้อมูลที่กำลังส่ง:", data);
    
    // ส่งข้อมูลไปยัง API ด้วย AJAX
    $.ajax({
        url: 'api/api.php?action=save_inspection',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        timeout: 30000, // เพิ่มค่า timeout เป็น 30 วินาที
        success: function(response) {
            try {
                // ตรวจสอบว่า response เป็น object หรือ string
                const result = typeof response === 'object' ? response : JSON.parse(response);
                
                if (result.status === 'success') {
                    // แสดงข้อความสำเร็จ
                    $('#save-status').removeClass('alert-info').addClass('alert-success')
                        .html(`บันทึกข้อมูลเรียบร้อย (ID: ${result.id})<br>
                             <a href="view.html?id=${result.id}" class="btn btn-sm btn-primary mt-2">ดูข้อมูลที่บันทึก</a>
                             <button class="btn btn-sm btn-secondary mt-2 ms-2" onclick="clearForm()">เริ่มบันทึกใหม่</button>`);
                } else {
                    // แสดงข้อความผิดพลาด
                    $('#save-status').removeClass('alert-info').addClass('alert-danger')
                        .html(`เกิดข้อผิดพลาด: ${result.message}`);
                }
            } catch (e) {
                // กรณีเกิดข้อผิดพลาดในการแปลง JSON
                $('#save-status').removeClass('alert-info').addClass('alert-danger')
                    .html('เกิดข้อผิดพลาดในการรับข้อมูลจากเซิร์ฟเวอร์');
                console.error('Error parsing response:', e, response);
            }
        },
        error: function(xhr, status, error) {
            // เพิ่มการตรวจสอบกรณีหมดเวลา
            if (status === 'timeout') {
                $('#save-status').removeClass('alert-info').addClass('alert-danger')
                    .html('การเชื่อมต่อหมดเวลา กรุณาลองอีกครั้ง');
            } else {
                $('#save-status').removeClass('alert-info').addClass('alert-danger')
                    .html(`เกิดข้อผิดพลาดในการส่งข้อมูล: ${error}`);
            }
            console.error('AJAX Error:', status, error, xhr.responseText);
        }
    });
}