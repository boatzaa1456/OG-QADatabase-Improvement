// ตรวจสอบ jQuery ก่อน
if (typeof jQuery === 'undefined') {
    throw new Error('jQuery is not loaded. Please include jQuery library.');
}

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
            
            <!-- ส่วนที่ 2: ข้อมูลล็อตและการสุ่มตัวอย่าง -->
            <div class="form-section">
                <h3>ข้อมูลล็อตและการสุ่มตัวอย่าง</h3>
                
                <!-- แท็บเมนูสำหรับเลือกล็อต -->
                <ul class="nav nav-tabs mb-3" id="lot-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="lot1-tab" data-bs-toggle="tab" data-bs-target="#lot1" type="button" role="tab" aria-controls="lot1" aria-selected="true">ล็อต 1</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="lot2-tab" data-bs-toggle="tab" data-bs-target="#lot2" type="button" role="tab" aria-controls="lot2" aria-selected="false">ล็อต 2</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="lot3-tab" data-bs-toggle="tab" data-bs-target="#lot3" type="button" role="tab" aria-controls="lot3" aria-selected="false">ล็อต 3</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="lot4-tab" data-bs-toggle="tab" data-bs-target="#lot4" type="button" role="tab" aria-controls="lot4" aria-selected="false">ล็อต 4</button>
                    </li>
                </ul>
                
                <!-- เนื้อหาแท็บ -->
                <div class="tab-content" id="lot-tab-content">
                    <!-- ล็อต 1 -->
                    <div class="tab-pane fade show active" id="lot1" role="tabpanel" aria-labelledby="lot1-tab">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="lot-number-1" class="form-label">LOT</label>
                                <input type="text" class="form-control" id="lot-number-1" placeholder="เช่น 1-11">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="pieces-per-lot-1" class="form-label">จำนวนต่อล็อต (pcs/lot)</label>
                                <input type="number" class="form-control" id="pieces-per-lot-1">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="description-1" class="form-label">DESCRIPTION</label>
                                <input type="text" class="form-control" id="description-1">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="pallet-no-1" class="form-label">Pallet No.</label>
                                <input type="text" class="form-control" id="pallet-no-1">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="strain-std-1" class="form-label">Strain Std.</label>
                                <input type="number" step="0.01" class="form-control" id="strain-std-1">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="first-sample-size-1" class="form-label">1st Sample Size</label>
                                <input type="number" class="form-control" id="first-sample-size-1">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="first-sample-ac-re-1" class="form-label">1st Sample Ac. Re.</label>
                                <input type="text" class="form-control" id="first-sample-ac-re-1">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="second-sample-size-1" class="form-label">2nd Sample Size</label>
                                <input type="number" class="form-control" id="second-sample-size-1">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="second-sample-ac-re-1" class="form-label">2nd Sample Ac. Re.</label>
                                <input type="text" class="form-control" id="second-sample-ac-re-1">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Result</label>
                                <div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-1" id="accept-1" value="Accept">
                                        <label class="form-check-label" for="accept-1">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-1" id="reject-1" value="Reject">
                                        <label class="form-check-label" for="reject-1">Reject</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-12 mb-3">
                                <label for="qp-1" class="form-label">QP.</label>
                                <input type="text" class="form-control" id="qp-1">
                            </div>
                        </div>
                    </div>
                    
                    <!-- ล็อต 2 -->
                    <div class="tab-pane fade" id="lot2" role="tabpanel" aria-labelledby="lot2-tab">
                        <!-- โครงสร้างเหมือนล็อต 1 (เปลี่ยน ID จาก -1 เป็น -2) -->
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="lot-number-2" class="form-label">LOT</label>
                                <input type="text" class="form-control" id="lot-number-2" placeholder="เช่น 9-22">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="pieces-per-lot-2" class="form-label">จำนวนต่อล็อต (pcs/lot)</label>
                                <input type="number" class="form-control" id="pieces-per-lot-2">
                            </div>
                        </div>
                        
                        <!-- ข้อมูลเพิ่มเติมของล็อต 2 (เหมือนล็อต 1) -->
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="description-2" class="form-label">DESCRIPTION</label>
                                <input type="text" class="form-control" id="description-2">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="pallet-no-2" class="form-label">Pallet No.</label>
                                <input type="text" class="form-control" id="pallet-no-2">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="strain-std-2" class="form-label">Strain Std.</label>
                                <input type="number" step="0.01" class="form-control" id="strain-std-2">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="first-sample-size-2" class="form-label">1st Sample Size</label>
                                <input type="number" class="form-control" id="first-sample-size-2">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="first-sample-ac-re-2" class="form-label">1st Sample Ac. Re.</label>
                                <input type="text" class="form-control" id="first-sample-ac-re-2">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="second-sample-size-2" class="form-label">2nd Sample Size</label>
                                <input type="number" class="form-control" id="second-sample-size-2">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="second-sample-ac-re-2" class="form-label">2nd Sample Ac. Re.</label>
                                <input type="text" class="form-control" id="second-sample-ac-re-2">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Result</label>
                                <div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-2" id="accept-2" value="Accept">
                                        <label class="form-check-label" for="accept-2">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-2" id="reject-2" value="Reject">
                                        <label class="form-check-label" for="reject-2">Reject</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-12 mb-3">
                                <label for="qp-2" class="form-label">QP.</label>
                                <input type="text" class="form-control" id="qp-2">
                            </div>
                        </div>
                    </div>
                    
                    <!-- ล็อต 3 -->
                    <div class="tab-pane fade" id="lot3" role="tabpanel" aria-labelledby="lot3-tab">
                        <!-- โครงสร้างเหมือนล็อต 1 (เปลี่ยน ID จาก -1 เป็น -3) -->
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="lot-number-3" class="form-label">LOT</label>
                                <input type="text" class="form-control" id="lot-number-3">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="pieces-per-lot-3" class="form-label">จำนวนต่อล็อต (pcs/lot)</label>
                                <input type="number" class="form-control" id="pieces-per-lot-3">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="description-3" class="form-label">DESCRIPTION</label>
                                <input type="text" class="form-control" id="description-3">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="pallet-no-3" class="form-label">Pallet No.</label>
                                <input type="text" class="form-control" id="pallet-no-3">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="strain-std-3" class="form-label">Strain Std.</label>
                                <input type="number" step="0.01" class="form-control" id="strain-std-3">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="first-sample-size-3" class="form-label">1st Sample Size</label>
                                <input type="number" class="form-control" id="first-sample-size-3">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="first-sample-ac-re-3" class="form-label">1st Sample Ac. Re.</label>
                                <input type="text" class="form-control" id="first-sample-ac-re-3">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="second-sample-size-3" class="form-label">2nd Sample Size</label>
                                <input type="number" class="form-control" id="second-sample-size-3">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="second-sample-ac-re-3" class="form-label">2nd Sample Ac. Re.</label>
                                <input type="text" class="form-control" id="second-sample-ac-re-3">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Result</label>
                                <div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-3" id="accept-3" value="Accept">
                                        <label class="form-check-label" for="accept-3">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-3" id="reject-3" value="Reject">
                                        <label class="form-check-label" for="reject-3">Reject</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-12 mb-3">
                                <label for="qp-3" class="form-label">QP.</label>
                                <input type="text" class="form-control" id="qp-3">
                            </div>
                        </div>
                    </div>
                    
                    <!-- ล็อต 4 -->
                    <div class="tab-pane fade" id="lot4" role="tabpanel" aria-labelledby="lot4-tab">
                        <!-- โครงสร้างเหมือนล็อต 1 (เปลี่ยน ID จาก -1 เป็น -4) -->
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="lot-number-4" class="form-label">LOT</label>
                                <input type="text" class="form-control" id="lot-number-4">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="pieces-per-lot-4" class="form-label">จำนวนต่อล็อต (pcs/lot)</label>
                                <input type="number" class="form-control" id="pieces-per-lot-4">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="description-4" class="form-label">DESCRIPTION</label>
                                <input type="text" class="form-control" id="description-4">
                            </div>
                            <div class="col-md-6 mb-3">
                                <label for="pallet-no-4" class="form-label">Pallet No.</label>
                                <input type="text" class="form-control" id="pallet-no-4">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="strain-std-4" class="form-label">Strain Std.</label>
                                <input type="number" step="0.01" class="form-control" id="strain-std-4">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="first-sample-size-4" class="form-label">1st Sample Size</label>
                                <input type="number" class="form-control" id="first-sample-size-4">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="first-sample-ac-re-4" class="form-label">1st Sample Ac. Re.</label>
                                <input type="text" class="form-control" id="first-sample-ac-re-4">
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <label for="second-sample-size-4" class="form-label">2nd Sample Size</label>
                                <input type="number" class="form-control" id="second-sample-size-4">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label for="second-sample-ac-re-4" class="form-label">2nd Sample Ac. Re.</label>
                                <input type="text" class="form-control" id="second-sample-ac-re-4">
                            </div>
                            <div class="col-md-4 mb-3">
                                <label class="form-label">Result</label>
                                <div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-4" id="accept-4" value="Accept">
                                        <label class="form-check-label" for="accept-4">Accept</label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="result-4" id="reject-4" value="Reject">
                                        <label class="form-check-label" for="reject-4">Reject</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-12 mb-3">
                                <label for="qp-4" class="form-label">QP.</label>
                                <input type="text" class="form-control" id="qp-4">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ส่วนที่ 3: ข้อมูลข้อบกพร่อง -->
            <div class="form-section">
                <h3>ข้อมูลข้อบกพร่อง</h3>
                
                <div class="table-responsive">
                    <table class="table table-bordered defect-table">
                        <thead>
                            <tr>
                                <th>รหัส</th>
                                <th>ข้อบกพร่อง</th>
                                <th>ล็อต 1</th>
                                <th>ล็อต 2</th>
                                <th>ล็อต 3</th>
                                <th>ล็อต 4</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1047</td>
                                <td>Rocker bottom</td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="1" data-defect="1047" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="2" data-defect="1047" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="3" data-defect="1047" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="4" data-defect="1047" value="0"></td>
                            </tr>
                            <tr>
                                <td>1106</td>
                                <td>Wrong Joint</td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="1" data-defect="1106" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="2" data-defect="1106" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="3" data-defect="1106" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="4" data-defect="1106" value="0"></td>
                            </tr>
                            <tr>
                                <td>1019</td>
                                <td>Dirty body</td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="1" data-defect="1019" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="2" data-defect="1019" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="3" data-defect="1019" value="0"></td>
                                <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="4" data-defect="1019" value="0"></td>
                           </tr>
                           <tr>
                               <td>1052</td>
                               <td>Scratch</td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="1" data-defect="1052" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="2" data-defect="1052" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="3" data-defect="1052" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="4" data-defect="1052" value="0"></td>
                           </tr>
                           <tr>
                               <td>1024</td>
                               <td>Blister</td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="1" data-defect="1024" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="2" data-defect="1024" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="3" data-defect="1024" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="4" data-defect="1024" value="0"></td>
                           </tr>
                           <tr>
                               <td>Cold Mark</td>
                               <td>Cold Mark</td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="1" data-defect="Cold Mark" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="2" data-defect="Cold Mark" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="3" data-defect="Cold Mark" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="4" data-defect="Cold Mark" value="0"></td>
                           </tr>
                           <tr>
                               <td>Cold Glass</td>
                               <td>Cold Glass</td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="1" data-defect="Cold Glass" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="2" data-defect="Cold Glass" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="3" data-defect="Cold Glass" value="0"></td>
                               <td><input type="number" min="0" class="form-control form-control-sm defect-input" data-lot="4" data-defect="Cold Glass" value="0"></td>
                           </tr>
                           <tr class="table-secondary">
                               <th colspan="2">TOTAL</th>
                               <td id="total-defects-1">0</td>
                               <td id="total-defects-2">0</td>
                               <td id="total-defects-3">0</td>
                               <td id="total-defects-4">0</td>
                           </tr>
                       </tbody>
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
   
   // Event listener สำหรับการคำนวณผลรวมข้อบกพร่อง
   $('.defect-input').on('change', function() {
       calculateDefectTotals();
   });
   
   // Event listener สำหรับการล้างฟอร์ม
   $('#clear-form').on('click', function() {
       clearForm();
   });
   
   // คำนวณผลรวมเริ่มต้น
   calculateDefectTotals();
}

// ฟังก์ชันคำนวณผลรวมข้อบกพร่อง
function calculateDefectTotals() {
   // คำนวณผลรวมสำหรับแต่ละล็อต
   for (let lot = 1; lot <= 4; lot++) {
       let total = 0;
       $(`.defect-input[data-lot="${lot}"]`).each(function() {
           total += parseInt($(this).val()) || 0;
       });
       $(`#total-defects-${lot}`).text(total);
   }
}

// ฟังก์ชันล้างฟอร์ม
function clearForm() {
   if (confirm('คุณต้องการล้างข้อมูลทั้งหมดในฟอร์มนี้ใช่หรือไม่?')) {
       $('#quality-form')[0].reset();
       $('.defect-input').val(0);
       calculateDefectTotals();
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
       rework: $('#rework').is(':checked'),
       destroy: $('#destroy').is(':checked'),
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
   
   // เก็บข้อมูลข้อบกพร่อง
   $('.defect-input').each(function() {
       const lot = $(this).data('lot');
       const defect = $(this).data('defect');
       const count = parseInt($(this).val()) || 0;
       
       if (count > 0) {
           formData.defects.push({
               lot: lot,
               defectCode: defect,
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
    
    // เพิ่ม console.log เพื่อดูข้อมูลที่ส่ง
    console.log("ข้อมูลที่กำลังส่ง:", data);
    
    // ส่งข้อมูลไปยัง API ด้วย AJAX
    $.ajax({
        url: 'api/api.php?action=save_inspection',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            // เพิ่ม console.log เพื่อดูการตอบกลับดิบๆ
            console.log("การตอบกลับดิบ:", response);
            
            try {
                const result = JSON.parse(response);
                
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
                    .html('เกิดข้อผิดพลาดในการรับข้อมูลจากเซิร์ฟเวอร์: ' + e.message + '<br>การตอบกลับ: ' + response.substring(0, 200));
                console.error('Error parsing JSON response:', e);
            }
        },
        error: function(xhr, status, error) {
            // เพิ่มการแสดงข้อมูลการตอบกลับมากขึ้น
            console.log("xhr response:", xhr.responseText);
            
            // กรณีเกิดข้อผิดพลาดในการส่งข้อมูล
            $('#save-status').removeClass('alert-info').addClass('alert-danger')
                .html(`เกิดข้อผิดพลาดในการส่งข้อมูล: ${error}<br>สถานะ: ${status}<br>ข้อความ: ${xhr.responseText.substring(0, 200)}`);
            console.error('AJAX Error:', status, error);
        }
    });
 }