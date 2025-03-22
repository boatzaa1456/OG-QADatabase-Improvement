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

// ปรับปรุงรายการข้อบกพร่อง - ใช้รูปแบบ ID ที่สอดคล้องกัน
const defectTypes = [
    // กลุ่มข้อบกพร่องที่ผิว (Surface Defects)
    { id: 'D1019', name: 'Dirty body', categoryId: 1 },
    { id: 'D1052', name: 'Scratch', categoryId: 1 },
    { id: 'D1001', name: 'Blister on surface', categoryId: 1 },
    { id: 'D1002', name: 'Stone', categoryId: 1 },
    { id: 'D1003', name: 'Check', categoryId: 1 },
    { id: 'D1004', name: 'Crack', categoryId: 1 },
    
    // กลุ่มข้อบกพร่องรูปทรง (Shape Defects)
    { id: 'D2047', name: 'Rocker bottom', categoryId: 2 },
    { id: 'D2012', name: 'Distorted', categoryId: 2 },
    { id: 'D2015', name: 'Thin bottom', categoryId: 2 },
    { id: 'D2001', name: 'Uneven rim', categoryId: 2 },
    { id: 'D2002', name: 'Warped', categoryId: 2 },
    
    // กลุ่มข้อบกพร่องจากการผลิต (Manufacturing Defects)
    { id: 'D3106', name: 'Wrong Joint', categoryId: 3 },
    { id: 'D3024', name: 'Blister', categoryId: 3 },
    { id: 'D3001', name: 'Cold Mark', categoryId: 3 },
    { id: 'D3002', name: 'Cold Glass', categoryId: 3 },
    { id: 'D3003', name: 'Fold', categoryId: 3 },
    { id: 'D3004', name: 'Glass Blob', categoryId: 3 },
    
    // กลุ่มข้อบกพร่องอื่นๆ (Others)
    { id: 'D4099', name: 'Others', categoryId: 4 }
];

// ตัวแปรสำหรับเก็บข้อบกพร่องที่เลือก
let activeDefects = [];
let selectedLot = 1;

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
                        <label for="doc-pt" class="form-label">Doc: PT <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="doc-pt" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="production-date" class="form-label">Production Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control" id="production-date" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Shift <span class="text-danger">*</span></label>
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
                        <label for="item-number" class="form-label">Item Number <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="item-number" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="gauge-mark" class="form-label">Gauge Mark (mm)</label>
                        <input type="number" step="0.01" class="form-control" id="gauge-mark">
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Production Type <span class="text-danger">*</span></label>
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
                        <label for="machine-no" class="form-label">Machine No. <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="machine-no" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="total-product" class="form-label">Total Product <span class="text-danger">*</span></label>
                        <input type="number" class="form-control" id="total-product" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="sampling-date" class="form-label">Sampling Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control" id="sampling-date" required>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="work-order" class="form-label">Work Order <span class="text-danger">*</span></label>
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
                <h3>ข้อมูลล็อตและการสุ่มตัวอย่าง <span class="text-danger">*</span></h3>
                
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
                                <th>LOT <span class="text-danger">*</span></th>
                                <td><input type="text" class="form-control" id="lot-number-1" placeholder="เช่น 1-11"></td>
                                <td><input type="text" class="form-control" id="lot-number-2" placeholder="เช่น 12-22"></td>
                                <td><input type="text" class="form-control" id="lot-number-3"></td>
                                <td><input type="text" class="form-control" id="lot-number-4"></td>
                            </tr>
                            <tr>
                                <th>จำนวนต่อล็อต <span class="text-danger">*</span></th>
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
                
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> เลือกล็อตที่ต้องการ จากนั้นเลือกข้อบกพร่องที่พบและระบุจำนวน คุณสามารถเลือกข้อบกพร่องได้หลายรายการต่อล็อต
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="lot-selector" class="form-label">เลือกล็อตที่ต้องการระบุข้อบกพร่อง</label>
                        <select id="lot-selector" class="form-select mb-2">
                            <option value="1">ล็อต 1</option>
                            <option value="2">ล็อต 2</option>
                            <option value="3">ล็อต 3</option>
                            <option value="4">ล็อต 4</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="defect-category" class="form-label">ประเภทข้อบกพร่อง</label>
                        <select id="defect-category" class="form-select mb-2">
                            <option value="0">ทุกประเภท</option>
                            ${defectCategories.map(category => 
                                `<option value="${category.id}">${category.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="defect-search" class="form-label">ค้นหาข้อบกพร่อง</label>
                        <div class="input-group">
                            <input type="text" id="defect-search" class="form-control" placeholder="ค้นหารหัสหรือชื่อข้อบกพร่อง...">
                            <button class="btn btn-outline-secondary" type="button" id="clear-defect-search">ล้าง</button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">รายการข้อบกพร่องที่มี</label>
                        <div class="card">
                            <div class="card-body defect-list-container" style="max-height: 300px; overflow-y: auto;">
                                <div id="defect-list" class="row">
                                    <!-- Defect list will be populated here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">ข้อบกพร่องที่พบในแต่ละล็อต</label>
                    <div class="table-responsive">
                        <table class="table table-bordered defect-table">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 10%">รหัส</th>
                                    <th style="width: 25%">ข้อบกพร่อง</th>
                                    <th style="width: 15%">ล็อต 1</th>
                                    <th style="width: 15%">ล็อต 2</th>
                                    <th style="width: 15%">ล็อต 3</th>
                                    <th style="width: 15%">ล็อต 4</th>
                                    <th style="width: 5%"></th>
                                </tr>
                            </thead>
                            <tbody id="active-defects">
                                <!-- จะแสดงข้อมูลข้อบกพร่องที่เลือกที่นี่ -->
                            </tbody>
                            <tfoot>
                                <tr class="table-secondary">
                                    <th colspan="2">รวมทั้งหมด</th>
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
                <h3>การอนุมัติ <span class="text-danger">*</span></h3>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="inspector" class="form-label">Inspector <span class="text-danger">*</span></label>
                        <select class="form-select" id="inspector" required>
                            <option value="">เลือกผู้ตรวจสอบ</option>
                            <option value="inspector1">ผู้ตรวจสอบ 1</option>
                            <option value="inspector2">ผู้ตรวจสอบ 2</option>
                            <option value="inspector3">ผู้ตรวจสอบ 3</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="supervisor" class="form-label">Supervisor <span class="text-danger">*</span></label>
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
            
            <!-- แสดงข้อความแจ้งเตือน -->
            <div id="validation-errors" class="alert alert-danger mt-3" style="display: none;">
                <strong>กรุณาตรวจสอบข้อมูล:</strong>
                <ul id="error-list"></ul>
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
        
        // ล้างข้อความแจ้งเตือนเดิม
        $('#validation-errors').hide();
        $('#error-list').empty();
        
        // ตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก
        if (validateForm()) {
            saveFormData();
        }
    });
    
    // Event listener สำหรับการล้างฟอร์ม
    $('#clear-form').on('click', function() {
        clearForm();
    });
    
    // เตรียมข้อมูลในส่วนข้อบกพร่อง
    initDefectsSection();
    
    // คำนวณผลรวมเริ่มต้น
    calculateDefectTotals();
}

// ฟังก์ชันตรวจสอบความถูกต้องของฟอร์ม
function validateForm() {
    const errors = [];
    
    // ตรวจสอบข้อมูลทั่วไป
    if (!$('#doc-pt').val()) errors.push('กรุณาระบุ Doc: PT');
    if (!$('#production-date').val()) errors.push('กรุณาระบุวันที่ผลิต');
    if (!$('input[name="shift"]:checked').val()) errors.push('กรุณาเลือกกะ');
    if (!$('#item-number').val()) errors.push('กรุณาระบุ Item Number');
    if (!$('#machine-no').val()) errors.push('กรุณาระบุ Machine No.');
    if (!$('#total-product').val()) errors.push('กรุณาระบุจำนวนสินค้าทั้งหมด');
    if (!$('#sampling-date').val()) errors.push('กรุณาระบุวันที่สุ่มตัวอย่าง');
    if (!$('#work-order').val()) errors.push('กรุณาระบุ Work Order');
    
    // ตรวจสอบข้อมูลล็อต (ต้องมีอย่างน้อย 1 ล็อต)
    let hasLot = false;
    for (let i = 1; i <= 4; i++) {
        if ($(`#lot-number-${i}`).val()) {
            if (!$(`#pieces-per-lot-${i}`).val()) {
                errors.push(`กรุณาระบุจำนวนต่อล็อตของล็อต ${i}`);
            } else {
                hasLot = true;
            }
        }
    }
    
    if (!hasLot) {
        errors.push('กรุณาระบุข้อมูลล็อตอย่างน้อย 1 ล็อต (LOT และจำนวน)');
    }
    
    // ตรวจสอบข้อมูลการอนุมัติ
    if (!$('#inspector').val()) errors.push('กรุณาเลือกผู้ตรวจสอบ');
    if (!$('#supervisor').val()) errors.push('กรุณาเลือกผู้ตรวจทาน');
    
    // ถ้ามีข้อผิดพลาด แสดงข้อความแจ้งเตือน
    if (errors.length > 0) {
        const errorHtml = errors.map(error => `<li>${error}</li>`).join('');
        $('#error-list').html(errorHtml);
        $('#validation-errors').show();
        
        // เลื่อนไปยังข้อความแจ้งเตือน
        $('html, body').animate({
            scrollTop: $('#validation-errors').offset().top - 100
        }, 500);
        
        return false;
    }
    
    return true;
}

// ฟังก์ชันเตรียมข้อมูลในส่วนข้อบกพร่อง (ปรับปรุงแล้ว)
function initDefectsSection() {
    // ตั้งค่าตัวแปรเริ่มต้น
    let selectedCategory = 0;
    let searchTerm = '';
    selectedLot = 1; // ค่าเริ่มต้นเป็นล็อต 1
    
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
    
    // แสดงรายการข้อบกพร่อง (ปรับปรุงแล้ว)
    function renderDefectList() {
        const filteredDefects = getFilteredDefects();
        
        let defectsHtml = '';
        
        // แบ่งกลุ่มตามหมวดหมู่เพื่อการแสดงผลที่ดีขึ้น
        if (selectedCategory === 0) {
            // กรณีแสดงทั้งหมด แยกตามหมวดหมู่
            defectCategories.forEach(category => {
                const categoryDefects = filteredDefects.filter(d => d.categoryId === category.id);
                
                if (categoryDefects.length > 0) {
                    defectsHtml += `<div class="col-12 mb-2"><h6 class="mt-2">${category.name}</h6></div>`;
                    
                    categoryDefects.forEach(defect => {
                        defectsHtml += `
                            <div class="col-md-6 col-lg-4 mb-2">
                                <button type="button" class="btn btn-outline-primary w-100 text-start add-defect-btn" data-id="${defect.id}">
                                    <span class="badge bg-secondary">${defect.id}</span> ${defect.name}
                                </button>
                            </div>
                        `;
                    });
                }
            });
        } else {
            // กรณีกรองตามหมวดหมู่
            filteredDefects.forEach(defect => {
                defectsHtml += `
                    <div class="col-md-6 col-lg-4 mb-2">
                        <button type="button" class="btn btn-outline-primary w-100 text-start add-defect-btn" data-id="${defect.id}">
                            <span class="badge bg-secondary">${defect.id}</span> ${defect.name}
                        </button>
                    </div>
                `;
            });
        }
        
        // ถ้าไม่มีข้อมูล
        if (!defectsHtml) {
            defectsHtml = '<div class="col-12 text-center py-3"><em>ไม่พบข้อบกพร่องที่ตรงกับเงื่อนไข</em></div>';
        }
        
        $('#defect-list').html(defectsHtml);
        
        // เพิ่ม event listeners สำหรับปุ่มเพิ่มข้อบกพร่อง
        $('.add-defect-btn').on('click', function(e) {
            e.preventDefault(); // ป้องกันการเลื่อนหน้า
            const defectId = $(this).data('id');
            addDefect(defectId);
        });
    }
    
    // แสดงข้อบกพร่องที่เลือกไว้
    function renderActiveDefects() {
        if (activeDefects.length === 0) {
            $('#active-defects').html('<tr><td colspan="7" class="text-center text-muted py-3">ยังไม่มีข้อบกพร่องที่เลือก กรุณาเลือกข้อบกพร่องจากรายการด้านบน</td></tr>');
            calculateDefectTotals();
            return;
        }
        
        const activeDefectsHtml = activeDefects.map(defect => `
            <tr>
                <td>${defect.id}</td>
                <td>${defect.name}</td>
                <td>
                    <input type="number" min="0" class="form-control form-control-sm defect-count-input" 
                           data-defect="${defect.id}" data-lot="1" value="${defect.counts[1] || 0}">
                </td>
                <td>
                    <input type="number" min="0" class="form-control form-control-sm defect-count-input" 
                           data-defect="${defect.id}" data-lot="2" value="${defect.counts[2] || 0}">
                </td>
                <td>
                    <input type="number" min="0" class="form-control form-control-sm defect-count-input" 
                           data-defect="${defect.id}" data-lot="3" value="${defect.counts[3] || 0}">
                </td>
                <td>
                    <input type="number" min="0" class="form-control form-control-sm defect-count-input" 
                           data-defect="${defect.id}" data-lot="4" value="${defect.counts[4] || 0}">
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger remove-defect-btn" data-id="${defect.id}">
                        <i class="fas fa-trash"></i>
                    </button>
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
        
        $('.remove-defect-btn').on('click', function(e) {
            e.preventDefault(); // ป้องกันการเลื่อนหน้า
            const defectId = $(this).data('id');
            removeDefect(defectId);
        });
        
        // อัพเดทผลรวม
        calculateDefectTotals();
    }
    
    // เพิ่มข้อบกพร่องในรายการที่เลือก
    function addDefect(defectId) {
        // ตรวจสอบว่ามีข้อบกพร่องนี้อยู่แล้วหรือไม่
        if (!activeDefects.some(d => d.id === defectId)) {
            const defect = defectTypes.find(d => d.id === defectId);
            if (defect) {
                // สร้างออบเจกต์ใหม่ที่มีค่าเริ่มต้นสำหรับแต่ละล็อต
                const newDefect = {
                    ...defect,
                    counts: { 1: 0, 2: 0, 3: 0, 4: 0 }
                };
                
                // กำหนดค่าเริ่มต้นเป็น 1 สำหรับล็อตที่เลือก
                newDefect.counts[selectedLot] = 1;
                
                // เพิ่มเข้าในรายการ
                activeDefects.push(newDefect);
                
                // แสดงผลอีกครั้ง
                renderActiveDefects();
                
                // แสดงข้อความแจ้งเตือนสำเร็จ
                showAlert('success', `เพิ่มข้อบกพร่อง "${defect.name}" ในล็อต ${selectedLot} เรียบร้อยแล้ว`);
            }
        } else {
            // ถ้ามีแล้ว ให้เพิ่มจำนวนในล็อตที่เลือก
            updateDefectCount(defectId, selectedLot, (activeDefects.find(d => d.id === defectId).counts[selectedLot] || 0) + 1);
            showAlert('info', `เพิ่มจำนวนข้อบกพร่อง "${defectTypes.find(d => d.id === defectId).name}" ในล็อต ${selectedLot}`);
        }
    }
    
    // ลบข้อบกพร่องจากรายการที่เลือก
    function removeDefect(defectId) {
        const defectToRemove = activeDefects.find(d => d.id === defectId);
        if (defectToRemove) {
            activeDefects = activeDefects.filter(d => d.id !== defectId);
            renderActiveDefects();
            
            // แสดงข้อความแจ้งเตือนลบสำเร็จ
            showAlert('info', `ลบข้อบกพร่อง "${defectToRemove.name}" เรียบร้อยแล้ว`);
        }
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
        
        // อัพเดทผลรวม
        calculateDefectTotals();
    }
    
    // แสดงข้อความแจ้งเตือน
    function showAlert(type, message) {
        // ซ่อนการแจ้งเตือนเดิม
        $('#defect-alert').remove();
        
        // สร้างอิลิเมนต์ alert
        const alertHtml = `
            <div id="defect-alert" class="alert alert-${type} alert-dismissible fade show mt-2 mb-3" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        // เพิ่ม alert เข้าไปที่ส่วนบนของ defects section
        $('#defects-section').prepend(alertHtml);
        
        // ลบ alert หลังจาก 3 วินาที
        setTimeout(() => {
            $('#defect-alert').fadeOut(function() {
                $(this).remove();
            });
        }, 3000);
    }
    
    // เพิ่ม event listeners
    $('#defect-search').on('keyup', function() {
        searchTerm = $(this).val().trim();
        renderDefectList();
    });
    
    $('#clear-defect-search').on('click', function(e) {
        e.preventDefault(); // ป้องกันการเลื่อนหน้า
        $('#defect-search').val('');
        searchTerm = '';
        renderDefectList();
    });
    
    $('#defect-category').on('change', function() {
        selectedCategory = parseInt($(this).val());
        renderDefectList();
    });
    
    $('#lot-selector').on('change', function() {
        selectedLot = parseInt($(this).val());
    });
    
    // เริ่มต้นแสดงรายการข้อบกพร่อง
    renderDefectList();
    renderActiveDefects();
}

// ฟังก์ชันคำนวณผลรวมข้อบกพร่อง
function calculateDefectTotals() {
    // คำนวณผลรวมสำหรับแต่ละล็อต
    for (let lot = 1; lot <= 4; lot++) {
        let total = 0;
        
        // ใช้ข้อมูลจาก activeDefects
        activeDefects.forEach(defect => {
            total += parseInt(defect.counts[lot]) || 0;
        });
        
        $(`#total-defects-${lot}`).text(total);
    }
}

// ฟังก์ชันล้างฟอร์ม
function clearForm() {
    if (confirm('คุณต้องการล้างข้อมูลทั้งหมดในฟอร์มนี้ใช่หรือไม่?')) {
        $('#quality-form')[0].reset();
        
        // ล้างข้อมูลข้อบกพร่อง
        activeDefects = [];
        $('#active-defects').empty();
        calculateDefectTotals();
        
        // ซ่อนข้อความแจ้งเตือน
        $('#validation-errors').hide();
        
        // ตั้งค่าล็อตกลับเป็นค่าเริ่มต้น
        $('#lot-selector').val(1);
        selectedLot = 1;
        
        // รีเซ็ตการค้นหาข้อบกพร่อง
        $('#defect-search').val('');
        $('#defect-category').val(0);
        
        // รีโหลดรายการข้อบกพร่อง
        initDefectsSection();
        
        // แสดงข้อความแจ้งเตือน
        showAlert('info', 'ล้างข้อมูลแบบฟอร์มเรียบร้อยแล้ว');
    }
}

// แสดงข้อความแจ้งเตือนทั่วไป
function showAlert(type, message) {
    // ซ่อนการแจ้งเตือนเดิม
    $('#alert-message').remove();
    
    // สร้างอิลิเมนต์ alert
    const alertHtml = `
        <div id="alert-message" class="alert alert-${type} alert-dismissible fade show mt-3 mb-3" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // เพิ่ม alert เข้าไปที่ส่วนบนของ form
    $('#quality-form').prepend(alertHtml);
    
    // ลบ alert หลังจาก 3 วินาที
    setTimeout(() => {
        $('#alert-message').fadeOut(function() {
            $(this).remove();
        });
    }, 3000);
}

// ฟังก์ชันบันทึกข้อมูลจากฟอร์ม
function saveFormData() {
    // แสดงข้อความกำลังบันทึกข้อมูล
    const saveStatus = $('<div class="alert alert-info mt-3" id="save-status">กำลังบันทึกข้อมูล...</div>');
    $('#save-status').remove(); // ลบข้อความเดิม (ถ้ามี)
    $('#quality-form').append(saveStatus);
    
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
        if ($(`#lot-number-${i}`).val()) {
            const lotData = {
                lotNumber: `lot${i}`,
                piecesPerLot: $(`#pieces-per-lot-${i}`).val() || 0,
                description: $(`#description-${i}`).val() || '',
                palletNo: $(`#pallet-no-${i}`).val() || '',
                strainStd: $(`#strain-std-${i}`).val() || null,
                firstSampleSize: $(`#first-sample-size-${i}`).val() || null,
                firstSampleAcRe: $(`#first-sample-ac-re-${i}`).val() || '',
                secondSampleSize: $(`#second-sample-size-${i}`).val() || null,
                secondSampleAcRe: $(`#second-sample-ac-re-${i}`).val() || '',
                result: $(`input[name="result-${i}"]:checked`).val() || '',
                qp: $(`#qp-${i}`).val() || '',
                strainResult: $(`input[name="strain-result-${i}"]:checked`).val() || ''
            };
            
            formData.lots.push(lotData);
        }
    }
    
    // เก็บข้อมูลข้อบกพร่องจาก activeDefects
    if (activeDefects && activeDefects.length > 0) {
        // วนลูปผ่านแต่ละข้อบกพร่องที่เลือก
        activeDefects.forEach(defect => {
            // วนลูปผ่านแต่ละล็อต (1-4)
            for (let lot = 1; lot <= 4; lot++) {
                // ดึงจำนวนข้อบกพร่องในล็อตนี้
                const count = parseInt(defect.counts[lot]) || 0;
                // บันทึกเฉพาะกรณีที่มีจำนวนมากกว่า 0
                if (count > 0) {
                    formData.defects.push({
                        lot: lot,
                        defectCode: defect.id,
                        count: count
                    });
                }
            }
        });
    }
    
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
    
    // Log ข้อมูลที่จะส่งไป
    console.log("ข้อมูลที่จะส่งไปบันทึก:", JSON.stringify(formData));
    
    // ตรวจสอบว่ามีล็อตข้อมูลหรือไม่
    if (formData.lots.length === 0) {
        $('#save-status').removeClass('alert-info').addClass('alert-danger')
            .html(`
                <strong>เกิดข้อผิดพลาด!</strong><br>
                กรุณาระบุข้อมูลล็อตอย่างน้อย 1 ล็อต<br>
                <button class="btn btn-outline-danger mt-2" onclick="$('#save-status').remove()">
                    <i class="fas fa-times"></i> ปิด
                </button>
            `);
        return;
    }
    
    // ส่งข้อมูลไปยัง API ด้วย AJAX
    $.ajax({
        url: 'api/api.php?action=save_inspection',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        timeout: 30000, // เพิ่มค่า timeout เป็น 30 วินาที
        success: function(response) {
            console.log("การตอบกลับจาก API:", response);
            
            try {
                // ตรวจสอบว่า response เป็น object หรือ string
                const result = typeof response === 'object' ? response : JSON.parse(response);
                
                if (result.status === 'success') {
                    // แสดงข้อความสำเร็จ
                    $('#save-status').removeClass('alert-info').addClass('alert-success')
                        .html(`
                            <strong>บันทึกข้อมูลเรียบร้อย!</strong><br>
                            หมายเลขการตรวจสอบ: ${result.id}<br>
                            <div class="mt-3">
                                <a href="view.html?id=${result.id}" class="btn btn-primary">
                                    <i class="fas fa-eye"></i> ดูข้อมูลที่บันทึก
                                </a>
                                <button class="btn btn-secondary ms-2" onclick="clearForm()">
                                    <i class="fas fa-plus"></i> เริ่มบันทึกใหม่
                                </button>
                            </div>
                        `);
                    
                    // เลื่อนไปยังข้อความสำเร็จ
                    $('html, body').animate({
                        scrollTop: $('#save-status').offset().top - 100
                    }, 500);
                } else {
                    // แสดงข้อความผิดพลาด
                    $('#save-status').removeClass('alert-info').addClass('alert-danger')
                        .html(`
                            <strong>เกิดข้อผิดพลาด!</strong><br>
                            ${result.message}<br>
                            <button class="btn btn-outline-danger mt-2" onclick="$('#save-status').remove()">
                                <i class="fas fa-times"></i> ปิด
                            </button>
                        `);
                    
                    console.error('Error response:', result);
                }
            } catch (e) {
                // กรณีเกิดข้อผิดพลาดในการแปลง JSON
                console.error('Error parsing response:', e);
                console.log('Raw response:', response);
                
                $('#save-status').removeClass('alert-info').addClass('alert-danger')
                    .html(`
                        <strong>เกิดข้อผิดพลาด!</strong><br>
                        ไม่สามารถรับข้อมูลจากเซิร์ฟเวอร์ได้<br>
                        <div class="mt-2">
                            <p class="text-monospace small">ข้อความผิดพลาด: ${e.message}</p>
                            <div class="alert alert-secondary p-2 small">
                                <code>${response?.substr(0, 500) || 'ไม่มีข้อมูลตอบกลับ'}</code>
                                ${response?.length > 500 ? '...' : ''}
                            </div>
                        </div>
                        <button class="btn btn-outline-danger mt-2" onclick="$('#save-status').remove()">
                            <i class="fas fa-times"></i> ปิด
                        </button>
                    `);
            }
        },
        error: function(xhr, status, error) {
            // กรณีเกิด error จาก AJAX
            console.error('AJAX Error:', status, error);
            console.log('XHR Response:', xhr.responseText);
            
            if (status === 'timeout') {
                $('#save-status').removeClass('alert-info').addClass('alert-danger')
                    .html(`
                        <strong>เกิดข้อผิดพลาด!</strong><br>
                        การเชื่อมต่อหมดเวลา กรุณาลองอีกครั้ง<br>
                        <button class="btn btn-outline-danger mt-2" onclick="$('#save-status').remove()">
                            <i class="fas fa-times"></i> ปิด
                        </button>
                    `);
            } else {
                $('#save-status').removeClass('alert-info').addClass('alert-danger')
                    .html(`
                        <strong>เกิดข้อผิดพลาด!</strong><br>
                        ${error || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์'}<br>
                        <div class="mt-2">
                            <p class="text-monospace small">สถานะ: ${status}</p>
                            <div class="alert alert-secondary p-2 small">
                                <code>${xhr.responseText?.substr(0, 500) || 'ไม่มีข้อมูลตอบกลับ'}</code>
                                ${xhr.responseText?.length > 500 ? '...' : ''}
                            </div>
                        </div>
                        <button class="btn btn-outline-danger mt-2" onclick="$('#save-status').remove()">
                            <i class="fas fa-times"></i> ปิด
                        </button>
                    `);
            }
        }
    });
}