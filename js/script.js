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
    { id: 'D1019', name: 'Dirty body', categoryId: 1, severity: 'low' },
    { id: 'D1052', name: 'Scratch', categoryId: 1, severity: 'medium' },
    { id: 'D1001', name: 'Blister on surface', categoryId: 1, severity: 'medium' },
    { id: 'D1002', name: 'Stone', categoryId: 1, severity: 'high' },
    { id: 'D1003', name: 'Check', categoryId: 1, severity: 'high' },
    { id: 'D1004', name: 'Crack', categoryId: 1, severity: 'critical' },
    
    // กลุ่มข้อบกพร่องรูปทรง (Shape Defects)
    { id: 'D2047', name: 'Rocker bottom', categoryId: 2, severity: 'high' },
    { id: 'D2012', name: 'Distorted', categoryId: 2, severity: 'medium' },
    { id: 'D2015', name: 'Thin bottom', categoryId: 2, severity: 'high' },
    { id: 'D2001', name: 'Uneven rim', categoryId: 2, severity: 'medium' },
    { id: 'D2002', name: 'Warped', categoryId: 2, severity: 'medium' },
    
    // กลุ่มข้อบกพร่องจากการผลิต (Manufacturing Defects)
    { id: 'D3106', name: 'Wrong Joint', categoryId: 3, severity: 'high' },
    { id: 'D3024', name: 'Blister', categoryId: 3, severity: 'medium' },
    { id: 'D3001', name: 'Cold Mark', categoryId: 3, severity: 'low' },
    { id: 'D3002', name: 'Cold Glass', categoryId: 3, severity: 'medium' },
    { id: 'D3003', name: 'Fold', categoryId: 3, severity: 'medium' },
    { id: 'D3004', name: 'Glass Blob', categoryId: 3, severity: 'high' },
    
    // กลุ่มข้อบกพร่องอื่นๆ (Others)
    { id: 'D4099', name: 'Others', categoryId: 4, severity: 'medium' }
];

// ตัวแปรสำหรับเก็บข้อบกพร่องที่เลือก
let activeDefects = [];
let selectedLot = 1;
let formVersion = 1; // เพิ่มตัวแปรสำหรับ optimistic locking
let autoSaveInterval; // ตัวแปรสำหรับเก็บ interval ของการบันทึกอัตโนมัติ
let isMobile = window.innerWidth < 768; // ตรวจสอบว่าเป็นโหมดมือถือหรือไม่
let isFormDirty = false; // ตัวแปรติดตามการเปลี่ยนแปลงแบบฟอร์ม
let lastSaveTime = null; // เวลาที่บันทึกล่าสุด
let isSubmitting = false; // ป้องกันการส่งซ้ำ

// คีย์สำหรับ localStorage
const FORM_STATE_KEY = 'oceanGlassQA_formState';
const FORM_TIMESTAMP_KEY = 'oceanGlassQA_formTimestamp';
const FORM_VERSION_KEY = 'oceanGlassQA_formVersion';
const CSRF_TOKEN_KEY = 'oceanGlassQA_csrfToken';

// เมื่อเอกสารโหลดเสร็จ
$(document).ready(function() {
    // เพิ่ม CSRF token ลงในทุก AJAX request
    setupAjaxCSRF();
    
    // ตรวจสอบ URL สำหรับพารามิเตอร์ ID (ถ้ามี)
    const urlParams = new URLSearchParams(window.location.search);
    const inspectionId = urlParams.get('id');
    
    // หากมี ID ให้โหลดข้อมูลที่มีอยู่
    if (inspectionId) {
        loadExistingInspection(inspectionId);
    } else {
        // ตรวจสอบว่ามีข้อมูลที่บันทึกไว้ใน localStorage หรือไม่
        checkForSavedFormState();
        
        // เรียกฟังก์ชันเพื่อแสดงแบบฟอร์ม
        displayQAForm();
    }
    
    // เพิ่ม event listener สำหรับการเปลี่ยนแปลงขนาดหน้าจอ
    $(window).on('resize', handleResize);
    
    // เพิ่ม event listener สำหรับการออกจากหน้า
    window.addEventListener('beforeunload', handlePageUnload);
    
    // เพิ่ม event listener สำหรับการเชื่อมต่อออฟไลน์/ออนไลน์
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
});

/**
 * ตั้งค่า CSRF token สำหรับ AJAX requests
 */
function setupAjaxCSRF() {
    // รับ CSRF token จาก localStorage หรือสร้างใหม่ถ้าไม่มี
    let csrfToken = localStorage.getItem(CSRF_TOKEN_KEY);
    if (!csrfToken) {
        csrfToken = generateCSRFToken();
        localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
    }
    
    // เพิ่ม CSRF token ในทุก AJAX request
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': csrfToken
        },
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-CSRF-TOKEN', csrfToken);
        }
    });
}

/**
 * สร้าง CSRF token แบบง่าย (ในการใช้งานจริงควรรับจาก server)
 */
function generateCSRFToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

/**
 * ตรวจสอบว่ามีข้อมูลที่บันทึกไว้ใน localStorage หรือไม่
 */
function checkForSavedFormState() {
    const savedState = localStorage.getItem(FORM_STATE_KEY);
    const savedTimestamp = localStorage.getItem(FORM_TIMESTAMP_KEY);
    
    if (savedState && savedTimestamp) {
        const now = new Date();
        const savedTime = new Date(savedTimestamp);
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
        
        // ถ้าข้อมูลที่บันทึกไว้ไม่เกิน 24 ชั่วโมง ให้ถามผู้ใช้ว่าต้องการกู้คืนหรือไม่
        if (hoursDiff < 24) {
            const formattedTime = savedTime.toLocaleString('th-TH');
            
            const restoreDialog = $(`
                <div class="alert alert-info alert-dismissible fade show mb-3" role="alert">
                    <strong><i class="fas fa-save"></i> พบข้อมูลที่บันทึกไว้ล่าสุดเมื่อ ${formattedTime}</strong>
                    <p>คุณต้องการกู้คืนข้อมูลที่บันทึกไว้ล่าสุดหรือไม่?</p>
                    <div class="mt-2">
                        <button type="button" class="btn btn-primary btn-sm restore-btn">
                            <i class="fas fa-undo"></i> กู้คืนข้อมูล
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm ms-2 discard-btn">
                            <i class="fas fa-trash"></i> ใช้แบบฟอร์มใหม่
                        </button>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);
            
            restoreDialog.find('.restore-btn').on('click', function() {
                restoreFormState();
                restoreDialog.alert('close');
            });
            
            restoreDialog.find('.discard-btn').on('click', function() {
                clearSavedFormState();
                restoreDialog.alert('close');
            });
            
            $('#qa-form').prepend(restoreDialog);
        }
    }
}

/**
 * กู้คืนข้อมูลแบบฟอร์มจาก localStorage
 */
function restoreFormState() {
    try {
        const savedState = localStorage.getItem(FORM_STATE_KEY);
        if (!savedState) return;
        
        const formData = JSON.parse(savedState);
        formVersion = parseInt(localStorage.getItem(FORM_VERSION_KEY) || '1');
        
        // คืนค่าข้อมูลทั่วไป
        for (const [key, value] of Object.entries(formData.general || {})) {
            const field = $('#' + key);
            if (field.length) {
                if (field.is(':checkbox')) {
                    field.prop('checked', value);
                } else if (field.is(':radio')) {
                    $(`input[name="${field.attr('name')}"][value="${value}"]`).prop('checked', true);
                } else {
                    field.val(value);
                }
            }
        }
        
        // คืนค่าข้อมูลล็อต
        if (formData.lots) {
            for (let i = 0; i < formData.lots.length; i++) {
                const lot = formData.lots[i];
                const lotNumber = i + 1;
                
                for (const [key, value] of Object.entries(lot)) {
                    const field = $(`#${key}-${lotNumber}`);
                    if (field.length) {
                        if (field.is(':checkbox')) {
                            field.prop('checked', value);
                        } else if (field.is(':radio')) {
                            $(`input[name="${field.attr('name')}"][value="${value}"]`).prop('checked', true);
                        } else {
                            field.val(value);
                        }
                    }
                }
                
                // คืนค่าผลการตรวจสอบ
                if (lot.result) {
                    $(`input[name="result-${lotNumber}"][value="${lot.result}"]`).prop('checked', true);
                }
                
                // คืนค่าผลการวัดความเครียด
                if (lot.strainResult) {
                    $(`input[name="strain-result-${lotNumber}"][value="${lot.strainResult}"]`).prop('checked', true);
                }
            }
        }
        
        // คืนค่าข้อมูลข้อบกพร่อง
        if (formData.defects) {
            activeDefects = formData.defects;
            renderActiveDefects();
        }
        
        // คืนค่าข้อมูลการวัดความเครียด
        if (formData.strainMeasurements) {
            for (const measurement of formData.strainMeasurements) {
                $(`.strain-input[data-lot="${measurement.lot}"][data-position="${measurement.position}"]`).val(measurement.value);
            }
        }
        
        // คืนค่าข้อมูลการอนุมัติ
        if (formData.approval) {
            for (const [key, value] of Object.entries(formData.approval)) {
                const field = $('#' + key);
                if (field.length) {
                    field.val(value);
                }
            }
        }
        
        showAlert('success', 'กู้คืนข้อมูลเรียบร้อยแล้ว', 3000);
        isFormDirty = false; // รีเซ็ตสถานะการเปลี่ยนแปลง
    } catch (e) {
        console.error('Error restoring form state:', e);
        showAlert('danger', 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + e.message, 5000);
        clearSavedFormState(); // ล้างข้อมูลที่อาจเสียหาย
    }
}

/**
 * บันทึกสถานะแบบฟอร์มไปยัง localStorage
 */
function saveFormState() {
    try {
        if (!isFormDirty) return; // ไม่บันทึกถ้าไม่มีการเปลี่ยนแปลง
        
        const formData = {
            general: {
                'doc-pt': $('#doc-pt').val(),
                'production-date': $('#production-date').val(),
                'shift': $('input[name="shift"]:checked').val(),
                'item-number': $('#item-number').val(),
                'gauge-mark': $('#gauge-mark').val(),
                'production-type': $('input[name="production-type"]:checked').val(),
                'use-jig': $('#use-jig').is(':checked'),
                'no-jig': $('#no-jig').is(':checked'),
                'machine-no': $('#machine-no').val(),
                'total-product': $('#total-product').val(),
                'sampling-date': $('#sampling-date').val(),
                'work-order': $('#work-order').val(),
                'operation': $('#operation').val()
            },
            lots: [],
            defects: activeDefects,
            strainMeasurements: [],
            approval: {
                'inspector': $('#inspector').val(),
                'supervisor': $('#supervisor').val(),
                'remarks': $('#remarks').val()
            }
        };
        
        // เก็บข้อมูลล็อต
        for (let i = 1; i <= 4; i++) {
            const lotData = {
                'lot-number': $(`#lot-number-${i}`).val(),
                'pieces-per-lot': $(`#pieces-per-lot-${i}`).val(),
                'description': $(`#description-${i}`).val(),
                'pallet-no': $(`#pallet-no-${i}`).val(),
                'strain-std': $(`#strain-std-${i}`).val(),
                'first-sample-size': $(`#first-sample-size-${i}`).val(),
                'first-sample-ac-re': $(`#first-sample-ac-re-${i}`).val(),
                'second-sample-size': $(`#second-sample-size-${i}`).val(),
                'second-sample-ac-re': $(`#second-sample-ac-re-${i}`).val(),
                'qp': $(`#qp-${i}`).val(),
                'result': $(`input[name="result-${i}"]:checked`).val(),
                'strainResult': $(`input[name="strain-result-${i}"]:checked`).val()
            };
            
            formData.lots.push(lotData);
        }
        
        // เก็บข้อมูลการวัดความเครียด
        $('.strain-input').each(function() {
            const value = $(this).val();
            if (value) {
                formData.strainMeasurements.push({
                    lot: $(this).data('lot'),
                    position: $(this).data('position'),
                    value: value
                });
            }
        });
        
        // บันทึกข้อมูลลง localStorage
        localStorage.setItem(FORM_STATE_KEY, JSON.stringify(formData));
        localStorage.setItem(FORM_TIMESTAMP_KEY, new Date().toISOString());
        localStorage.setItem(FORM_VERSION_KEY, formVersion.toString());
        
        lastSaveTime = new Date();
        isFormDirty = false;
        
        console.log('Form state saved to localStorage at', lastSaveTime);
    } catch (e) {
        console.error('Error saving form state:', e);
    }
}

/**
 * ล้างข้อมูลที่บันทึกไว้ใน localStorage
 */
function clearSavedFormState() {
    localStorage.removeItem(FORM_STATE_KEY);
    localStorage.removeItem(FORM_TIMESTAMP_KEY);
    localStorage.removeItem(FORM_VERSION_KEY);
    console.log('Saved form state cleared');
}

/**
 * จัดการเมื่อขนาดหน้าจอเปลี่ยน
 */
function handleResize() {
    const wasInMobileMode = isMobile;
    isMobile = window.innerWidth < 768;
    
    // ถ้ามีการเปลี่ยนแปลงโหมด (มือถือ/เดสก์ท็อป)
    if (wasInMobileMode !== isMobile) {
        // ปรับการแสดงผลตามขนาดหน้าจอ
        adjustLayoutForScreenSize();
    }
}

/**
 * ปรับการแสดงผลตามขนาดหน้าจอ
 */
function adjustLayoutForScreenSize() {
    if (isMobile) {
        // ปรับสำหรับมือถือ
        $('.table-responsive').addClass('mobile-enhanced');
        $('.defect-list-container').addClass('mobile-scrollable');
        $('.form-section').addClass('mobile-compact');
    } else {
        // ปรับสำหรับเดสก์ท็อป
        $('.table-responsive').removeClass('mobile-enhanced');
        $('.defect-list-container').removeClass('mobile-scrollable');
        $('.form-section').removeClass('mobile-compact');
    }
}

/**
 * จัดการเมื่อออกจากหน้า
 * @param {Event} e เหตุการณ์
 */
function handlePageUnload(e) {
    if (isFormDirty) {
        // บันทึกก่อนออกจากหน้า
        saveFormState();
        
        // แสดงข้อความเตือน (ไม่รองรับในทุกเบราว์เซอร์)
        const message = 'คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?';
        e.returnValue = message;
        return message;
    }
}

/**
 * จัดการเมื่อกลับมาออนไลน์
 */
function handleOnlineStatus() {
    showAlert('success', 'กลับมาออนไลน์แล้ว คุณสามารถบันทึกข้อมูลได้ตามปกติ', 3000);
    
    // ลองส่งข้อมูลที่ค้างอยู่ถ้ามี
    if (isSubmitting) {
        saveFormData();
    }
}

/**
 * จัดการเมื่อออฟไลน์
 */
function handleOfflineStatus() {
    showAlert('warning', 'คุณกำลังออฟไลน์ ข้อมูลจะถูกบันทึกในเครื่องชั่วคราว', 5000);
}

/**
 * โหลดข้อมูลการตรวจสอบที่มีอยู่แล้ว
 * @param {string} id รหัสการตรวจสอบ
 */
function loadExistingInspection(id) {
    $('#loading-overlay').css('display', 'flex');
    
    $.ajax({
        url: `api/api.php?action=get_inspection&id=${id}`,
        type: 'GET',
        timeout: 30000, // 30 วินาที
        success: function(response) {
            try {
                const result = typeof response === 'object' ? response : JSON.parse(response);
                
                if (result.status === 'success') {
                    // แสดงแบบฟอร์ม
                    displayQAForm();
                    
                    // ตั้งค่า version สำหรับ optimistic locking
                    formVersion = result.data.version || 1;
                    
                    // นำข้อมูลมาแสดงในแบบฟอร์ม
                    populateFormWithData(result.data);
                    
                    showAlert('info', 'โหลดข้อมูลเรียบร้อยแล้ว คุณสามารถแก้ไขและบันทึกได้', 3000);
                } else {
                    showAlert('danger', `เกิดข้อผิดพลาด: ${result.message}`, 5000);
                }
            } catch (e) {
                console.error('Error parsing response:', e, response);
                showAlert('danger', 'เกิดข้อผิดพลาดในการรับข้อมูล', 5000);
            } finally {
                $('#loading-overlay').hide();
            }
        },
        error: function(xhr, status, error) {
            $('#loading-overlay').hide();
            
            if (status === 'timeout') {
                showAlert('danger', 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง', 5000);
            } else {
                showAlert('danger', `เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error}`, 5000);
            }
            
            console.error('AJAX Error:', status, error, xhr.responseText);
            
            // แสดงแบบฟอร์มเปล่า
            displayQAForm();
        }
    });
}

/**
 * นำข้อมูลการตรวจสอบมาแสดงในแบบฟอร์ม
 * @param {Object} data ข้อมูลการตรวจสอบ
 */
function populateFormWithData(data) {
    // ข้อมูลทั่วไป
    $('#doc-pt').val(data.doc_pt);
    $('#production-date').val(data.production_date);
    $(`input[name="shift"][value="${data.shift}"]`).prop('checked', true);
    $('#item-number').val(data.item_number);
    $('#gauge-mark').val(data.gauge_mark);
    $(`input[name="production-type"][value="${data.production_type}"]`).prop('checked', true);
    $('#use-jig').prop('checked', data.use_jig == 1);
    $('#no-jig').prop('checked', data.no_jig == 1);
    $('#machine-no').val(data.machine_no);
    $('#total-product').val(data.total_product);
    $('#sampling-date').val(data.sampling_date);
    $('#work-order').val(data.work_order);
    $('#operation').val(data.operation);
    
    // ข้อมูลล็อต
    if (data.lots && data.lots.length > 0) {
        data.lots.forEach((lot, index) => {
            const lotNumber = index + 1;
            
            $(`#lot-number-${lotNumber}`).val(lot.lot_number);
            $(`#pieces-per-lot-${lotNumber}`).val(lot.pieces_per_lot);
            $(`#description-${lotNumber}`).val(lot.description);
            $(`#pallet-no-${lotNumber}`).val(lot.pallet_no);
            $(`#strain-std-${lotNumber}`).val(lot.strain_std);
            $(`#first-sample-size-${lotNumber}`).val(lot.first_sample_size);
            $(`#first-sample-ac-re-${lotNumber}`).val(lot.first_sample_ac_re);
            $(`#second-sample-size-${lotNumber}`).val(lot.second_sample_size);
            $(`#second-sample-ac-re-${lotNumber}`).val(lot.second_sample_ac_re);
            $(`#qp-${lotNumber}`).val(lot.qp);
            
            // ตั้งค่าผลการตรวจสอบ
            if (lot.result) {
                $(`input[name="result-${lotNumber}"][value="${lot.result}"]`).prop('checked', true);
            }
            
            // ตั้งค่าผลการวัดความเครียด
            if (lot.strain_result) {
                $(`input[name="strain-result-${lotNumber}"][value="${lot.strain_result}"]`).prop('checked', true);
            }
            
            // ตั้งค่าข้อบกพร่อง
            if (lot.defects && lot.defects.length > 0) {
                lot.defects.forEach(defect => {
                    const defectType = defectTypes.find(d => d.id === defect.defect_code);
                    if (defectType) {
                        // ตรวจสอบว่ามีข้อบกพร่องนี้ใน activeDefects แล้วหรือไม่
                        const existingDefect = activeDefects.find(d => d.id === defect.defect_code);
                        if (existingDefect) {
                            // อัพเดทจำนวน
                            existingDefect.counts[lotNumber] = parseInt(defect.defect_count) || 0;
                        } else {
                            // เพิ่มข้อบกพร่องใหม่
                            const newDefect = {
                                ...defectType,
                                counts: { 1: 0, 2: 0, 3: 0, 4: 0 }
                            };
                            newDefect.counts[lotNumber] = parseInt(defect.defect_count) || 0;
                            activeDefects.push(newDefect);
                        }
                    }
                });
            }
            
            // ตั้งค่าการวัดความเครียด
            if (lot.strainMeasurements && lot.strainMeasurements.length > 0) {
                lot.strainMeasurements.forEach(measurement => {
                    $(`.strain-input[data-lot="${lotNumber}"][data-position="${measurement.position}"]`).val(measurement.value);
                });
            }
        });
    }
    
    // อัพเดทตารางข้อบกพร่อง
    renderActiveDefects();
    
    // ข้อมูลการอนุมัติ
    $('#inspector').val(data.inspector);
    $('#supervisor').val(data.supervisor);
    $('#remarks').val(data.remarks);
    
    // รีเซ็ตสถานะของฟอร์ม
    isFormDirty = false;
}

// ฟังก์ชันแสดงแบบฟอร์ม QA
function displayQAForm() {
    // สร้าง HTML สำหรับแบบฟอร์ม
    const formHTML = createQAFormHTML();
    
    // แสดงแบบฟอร์มในหน้าเว็บ
    $('#qa-form').html(formHTML);
    
    // เพิ่ม event listeners สำหรับฟังก์ชันต่างๆ ในฟอร์ม
    addFormEventListeners();
    
    // ปรับการแสดงผลตามขนาดหน้าจอ
    adjustLayoutForScreenSize();
    
    // เริ่มบันทึกอัตโนมัติทุก 30 วินาที
    startAutoSave();
}

// ฟังก์ชันเริ่มบันทึกอัตโนมัติ
function startAutoSave() {
    // ยกเลิก interval เดิมถ้ามี
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    // ตั้งค่าบันทึกอัตโนมัติทุก 30 วินาที
    autoSaveInterval = setInterval(function() {
        if (isFormDirty) {
            saveFormState();
            
            // แสดงข้อความแจ้งเตือนการบันทึกอัตโนมัติเฉพาะครั้งแรก
            if (!lastSaveTime || new Date() - lastSaveTime > 60000) {
                showAlert('info', 'บันทึกข้อมูลอัตโนมัติเรียบร้อยแล้ว', 2000, true);
            }
        }
    }, 30000);
}

// ฟังก์ชันสร้าง HTML สำหรับแบบฟอร์ม QA
function createQAFormHTML() {
    // HTML code คงเดิมเหมือนในโค้ดเดิม แต่จะเพิ่มข้อมูลเกี่ยวกับ version
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
            
            <!-- แสดงข้อความการบันทึกล่าสุด -->
            <div id="last-save-info" class="alert alert-info mt-3" style="display: none;">
                <small>บันทึกล่าสุดเมื่อ: <span id="last-save-time"></span></small>
            </div>
            
            <!-- ฟิลด์ซ่อนสำหรับ CSRF token และ version -->
            <input type="hidden" id="form-version" value="${formVersion}">
            <input type="hidden" id="csrf-token" value="${localStorage.getItem(CSRF_TOKEN_KEY) || ''}">
            
            <!-- ปุ่มบันทึก -->
            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button type="button" class="btn btn-outline-primary me-md-2" id="save-draft-btn">
                    <i class="fas fa-save"></i> บันทึกฉบับร่าง
                </button>
                <button type="button" class="btn btn-secondary me-md-2" id="clear-form">
                    <i class="fas fa-eraser"></i> ล้างฟอร์ม
                </button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-check-circle"></i> บันทึกข้อมูล
                </button>
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
        
        // ป้องกันการส่งซ้ำ
        if (isSubmitting) {
            showAlert('warning', 'กำลังประมวลผล โปรดรอสักครู่...', 3000);
            return;
        }
        
        // ตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก
        if (validateForm()) {
            isSubmitting = true;
            $('#loading-overlay').css('display', 'flex');
            saveFormData();
        }
    });
    
    // Event listener สำหรับปุ่มบันทึกฉบับร่าง
    $('#save-draft-btn').on('click', function() {
        // ตรวจสอบข้อมูลขั้นต่ำ
        const minValidation = validateMinimumRequirements();
        if (minValidation) {
            saveDraft();
        } else {
            showAlert('warning', 'กรุณากรอกข้อมูลพื้นฐานอย่างน้อย Doc PT, วันที่ผลิต และ Item Number', 5000);
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
    
    // เพิ่ม event listener สำหรับการติดตามการเปลี่ยนแปลงในฟอร์ม
    $('input, select, textarea').on('change input', function() {
        isFormDirty = true;
    });
    
    // เพิ่ม tooltips สำหรับข้อมูลเพิ่มเติม
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // แสดงเวลาที่บันทึกล่าสุด
    if (lastSaveTime) {
        $('#last-save-time').text(lastSaveTime.toLocaleString('th-TH'));
        $('#last-save-info').show();
    }
}

/**
 * ตรวจสอบข้อมูลขั้นต่ำสำหรับการบันทึกฉบับร่าง
 */
function validateMinimumRequirements() {
    const docPt = $('#doc-pt').val().trim();
    const prodDate = $('#production-date').val();
    const itemNumber = $('#item-number').val().trim();
    
    return docPt !== '' && prodDate !== '' && itemNumber !== '';
}

/**
 * บันทึกฉบับร่าง
 */
function saveDraft() {
    try {
        // เตรียมข้อมูลสำหรับบันทึก
        const formData = collectFormData();
        formData.status = 'draft';
        
        $('#loading-overlay').css('display', 'flex');
        
        $.ajax({
            url: 'api/api.php?action=save_inspection',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            timeout: 30000,
            success: function(response) {
                $('#loading-overlay').hide();
                
                try {
                    const result = typeof response === 'object' ? response : JSON.parse(response);
                    
                    if (result.status === 'success') {
                        // อัพเดท version
                        formVersion = result.version || (formVersion + 1);
                        $('#form-version').val(formVersion);
                        
                        showAlert('success', 'บันทึกฉบับร่างเรียบร้อยแล้ว รหัสการตรวจสอบ: ' + result.id, 5000);
                        
                        // ล้างข้อมูลใน localStorage
                        clearSavedFormState();
                        
                        // รีเซ็ตสถานะของฟอร์ม
                        isFormDirty = false;
                        
                        // อัพเดทเวลาบันทึกล่าสุด
                        lastSaveTime = new Date();
                        $('#last-save-time').text(lastSaveTime.toLocaleString('th-TH'));
                        $('#last-save-info').show();
                    } else {
                        showAlert('danger', 'เกิดข้อผิดพลาด: ' + result.message, 5000);
                    }
                } catch (e) {
                    console.error('Error parsing response:', e, response);
                    showAlert('danger', 'เกิดข้อผิดพลาดในการประมวลผลการตอบกลับ', 5000);
                }
            },
            error: function(xhr, status, error) {
                $('#loading-overlay').hide();
                
                if (status === 'timeout') {
                    showAlert('danger', 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง', 5000);
                } else if (xhr.status === 409) {
                    // ข้อผิดพลาดจาก Concurrency
                    handleConcurrencyError();
                } else {
                    showAlert('danger', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error, 5000);
                }
                
                console.error('AJAX Error:', status, error, xhr.responseText);
            },
            complete: function() {
                isSubmitting = false;
            }
        });
    } catch (e) {
        $('#loading-overlay').hide();
        isSubmitting = false;
        console.error('Error in saveDraft:', e);
        showAlert('danger', 'เกิดข้อผิดพลาด: ' + e.message, 5000);
    }
}

/**
 * เก็บรวบรวมข้อมูลจากฟอร์ม
 */
function collectFormData() {
    // เก็บข้อมูลพื้นฐาน
    const formData = {
        // เพิ่ม version สำหรับ optimistic locking
        version: formVersion,
        
        // ข้อมูลทั่วไป
        docPT: sanitizeInput($('#doc-pt').val()),
        productionDate: $('#production-date').val(),
        shift: $('input[name="shift"]:checked').val(),
        itemNumber: sanitizeInput($('#item-number').val()),
        gaugeMark: $('#gauge-mark').val(),
        productionType: $('input[name="production-type"]:checked').val(),
        useJig: $('#use-jig').is(':checked'),
        noJig: $('#no-jig').is(':checked'),
        machineNo: sanitizeInput($('#machine-no').val()),
        totalProduct: $('#total-product').val(),
        samplingDate: $('#sampling-date').val(),
        workOrder: sanitizeInput($('#work-order').val()),
        operation: sanitizeInput($('#operation').val()),
        
        // เพิ่ม CSRF token
        csrfToken: $('#csrf-token').val(),
        
        // ข้อมูลล็อต (จะเก็บเป็นอาร์เรย์)
        lots: [],
        
        // ข้อมูลข้อบกพร่อง (จะเก็บเป็นอาร์เรย์)
        defects: [],
        
        // ข้อมูลการวัดความเครียด (จะเก็บเป็นอาร์เรย์)
        strainMeasurements: [],
        
        // ข้อมูลการอนุมัติ
        inspector: $('#inspector').val(),
        supervisor: $('#supervisor').val(),
        remarks: sanitizeInput($('#remarks').val())
    };
    
    // เก็บข้อมูลล็อต
    for (let i = 1; i <= 4; i++) {
        const lotNumber = $(`#lot-number-${i}`).val();
        if (lotNumber) {
            formData.lots.push({
                lotNumber: `lot${i}`,
                piecesPerLot: $(`#pieces-per-lot-${i}`).val() || 0,
                description: sanitizeInput($(`#description-${i}`).val()) || '',
                palletNo: sanitizeInput($(`#pallet-no-${i}`).val()) || '',
                strainStd: $(`#strain-std-${i}`).val() || null,
                firstSampleSize: $(`#first-sample-size-${i}`).val() || null,
                firstSampleAcRe: sanitizeInput($(`#first-sample-ac-re-${i}`).val()) || '',
                secondSampleSize: $(`#second-sample-size-${i}`).val() || null,
                secondSampleAcRe: sanitizeInput($(`#second-sample-ac-re-${i}`).val()) || '',
                result: $(`input[name="result-${i}"]:checked`).val() || '',
                qp: sanitizeInput($(`#qp-${i}`).val()) || '',
                strainResult: $(`input[name="strain-result-${i}"]:checked`).val() || ''
            });
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
    
    return formData;
}

/**
 * ล้างข้อมูลและสถานะที่ป้อนไว้
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // ล้างอักขระพิเศษที่อาจใช้ในการโจมตี XSS
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * จัดการข้อผิดพลาดเรื่อง Concurrency
 */
function handleConcurrencyError() {
    const message = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
            <strong><i class="fas fa-exclamation-triangle"></i> ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น</strong>
            <p>ข้อมูลนี้ถูกแก้ไขโดยผู้ใช้อื่นในระหว่างที่คุณกำลังแก้ไข คุณต้องการดำเนินการอย่างไร?</p>
            <div class="mt-2">
                <button class="btn btn-warning btn-sm refresh-data-btn">
                    <i class="fas fa-sync"></i> รีเฟรชข้อมูล
                </button>
                <button class="btn btn-outline-secondary btn-sm ms-2 force-save-btn">
                    <i class="fas fa-save"></i> บังคับบันทึกข้อมูลของฉัน
                </button>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // แสดงข้อความและเพิ่ม event listeners
    const alertBox = $(message);
    
    alertBox.find('.refresh-data-btn').on('click', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const inspectionId = urlParams.get('id');
        
        if (inspectionId) {
            loadExistingInspection(inspectionId);
        } else {
            location.reload();
        }
        
        alertBox.alert('close');
    });
    
    alertBox.find('.force-save-btn').on('click', function() {
        const formData = collectFormData();
        // เพิ่มเฉพาะตัวบอกว่าเป็นการบังคับบันทึก
        formData.forceSave = true;
        
        $('#loading-overlay').css('display', 'flex');
        isSubmitting = true;
        
        $.ajax({
            url: 'api/api.php?action=save_inspection',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            timeout: 30000,
            success: function(response) {
                $('#loading-overlay').hide();
                isSubmitting = false;
                
                try {
                    const result = typeof response === 'object' ? response : JSON.parse(response);
                    
                    if (result.status === 'success') {
                        // อัพเดท version
                        formVersion = result.version || (formVersion + 1);
                        $('#form-version').val(formVersion);
                        
                        showAlert('success', 'บันทึกข้อมูลเรียบร้อยแล้ว', 3000);
                        showSuccessScreen(result.id);
                    } else {
                        showAlert('danger', 'เกิดข้อผิดพลาด: ' + result.message, 5000);
                    }
                } catch (e) {
                    console.error('Error parsing response:', e, response);
                    showAlert('danger', 'เกิดข้อผิดพลาดในการประมวลผลการตอบกลับ', 5000);
                }
            },
            error: function(xhr, status, error) {
                $('#loading-overlay').hide();
                isSubmitting = false;
                
                showAlert('danger', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error, 5000);
                console.error('AJAX Error:', status, error, xhr.responseText);
            }
        });
        
        alertBox.alert('close');
    });
    
    $('#quality-form').prepend(alertBox);
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

/**
 * เตรียมข้อมูลในส่วนข้อบกพร่อง
 */
function initDefectsSection() {
    // ตั้งค่าตัวแปรเริ่มต้น
    let searchTerm = '';
    let selectedCategory = 0;
    selectedLot = 1; // ค่าเริ่มต้นเป็นล็อต 1
    
    // แสดงรายการข้อบกพร่องเริ่มต้น
    renderDefectList();
    
    // แสดงข้อบกพร่องที่เลือกไว้เริ่มต้น
    renderActiveDefects();
    
    // เพิ่ม event listener สำหรับตัวกรองประเภทข้อบกพร่อง
    $('#defect-category').on('change', function() {
        selectedCategory = parseInt($(this).val());
        renderDefectList();
    });
    
    // เพิ่ม event listener สำหรับการค้นหาข้อบกพร่อง
    $('#defect-search').on('input', function() {
        searchTerm = $(this).val().trim();
        renderDefectList();
    });
    
    // เพิ่ม event listener สำหรับปุ่มล้างการค้นหา
    $('#clear-defect-search').on('click', function() {
        $('#defect-search').val('');
        searchTerm = '';
        renderDefectList();
    });
    
    // เพิ่ม event listener สำหรับตัวเลือกล็อต
    $('#lot-selector').on('change', function() {
        selectedLot = parseInt($(this).val());
    });
    
    /**
     * แสดงรายการข้อบกพร่องตามเงื่อนไขการกรองปัจจุบัน
     */
    function renderDefectList() {
        // กรองข้อบกพร่องตามเงื่อนไข
        let filteredDefects = defectTypes;
        
        if (selectedCategory > 0) {
            filteredDefects = filteredDefects.filter(defect => defect.categoryId === selectedCategory);
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredDefects = filteredDefects.filter(
                defect => defect.id.toLowerCase().includes(term) || 
                          defect.name.toLowerCase().includes(term)
            );
        }
        
        // สร้าง HTML สำหรับรายการข้อบกพร่อง
        let defectsHtml = '';
        
        // แบ่งกลุ่มตามหมวดหมู่ถ้าแสดงทั้งหมด
        if (selectedCategory === 0) {
            // กรณีแสดงทั้งหมด แยกตามหมวดหมู่
            defectCategories.forEach(category => {
                const categoryDefects = filteredDefects.filter(d => d.categoryId === category.id);
                
                if (categoryDefects.length > 0) {
                    defectsHtml += `<div class="col-12 mb-2"><h6 class="mt-2">${category.name}</h6></div>`;
                    
                    categoryDefects.forEach(defect => {
                        const severityClass = getSeverityClass(defect.severity);
                        defectsHtml += `
                            <div class="col-md-6 col-lg-4 mb-2">
                                <button type="button" class="btn btn-outline-primary w-100 text-start add-defect-btn ${severityClass}" data-id="${defect.id}">
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
                const severityClass = getSeverityClass(defect.severity);
                defectsHtml += `
                    <div class="col-md-6 col-lg-4 mb-2">
                        <button type="button" class="btn btn-outline-primary w-100 text-start add-defect-btn ${severityClass}" data-id="${defect.id}">
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
        $('.add-defect-btn').on('click', function() {
            const defectId = $(this).data('id');
            addDefect(defectId);
        });
    }
}

/**
 * เพิ่มข้อบกพร่องในรายการที่เลือก
 * @param {string} defectId รหัสของข้อบกพร่องที่จะเพิ่ม
 */
function addDefect(defectId) {
    // ตรวจสอบว่ามีข้อบกพร่องนี้อยู่แล้วหรือไม่
    if (activeDefects.some(d => d.id === defectId)) {
        showAlert('info', 'ข้อบกพร่องนี้ถูกเพิ่มไว้แล้ว', 2000);
        return;
    }
    
    // ค้นหาข้อบกพร่องในรายการทั้งหมด
    const defect = defectTypes.find(d => d.id === defectId);
    if (!defect) return;
    
    // เพิ่มไปยังข้อบกพร่องที่เลือกโดยเริ่มต้นด้วยค่าศูนย์สำหรับแต่ละล็อต
    const newDefect = {
        ...defect,
        counts: { 1: 0, 2: 0, 3: 0, 4: 0 }
    };
    
    // ตั้งค่าจำนวนข้อบกพร่องในล็อตที่เลือกเป็น 1 ตามค่าเริ่มต้น
    newDefect.counts[selectedLot] = 1;
    
    activeDefects.push(newDefect);
    isFormDirty = true;
    
    // แสดงข้อบกพร่องใหม่ในตาราง
    renderActiveDefects();
    
    showAlert('success', `เพิ่มข้อบกพร่อง ${defect.name} แล้ว`, 2000, true);
}

/**
 * ลบข้อบกพร่องออกจากรายการที่เลือก
 * @param {string} defectId รหัสของข้อบกพร่องที่จะลบ
 */
function removeDefect(defectId) {
    const index = activeDefects.findIndex(d => d.id === defectId);
    if (index !== -1) {
        const defectName = activeDefects[index].name;
        activeDefects.splice(index, 1);
        isFormDirty = true;
        renderActiveDefects();
        showAlert('success', `ลบข้อบกพร่อง ${defectName} แล้ว`, 2000, true);
    }
}

/**
 * รับ CSS class ตามระดับความรุนแรงของข้อบกพร่อง
 * @param {string} severity ระดับความรุนแรง
 * @return {string} CSS class
 */
function getSeverityClass(severity) {
    switch (severity) {
        case 'low':
            return 'defect-low';
        case 'medium':
            return 'defect-medium';
        case 'high':
            return 'defect-high';
        case 'critical':
            return 'defect-critical';
        default:
            return '';
    }
}

/**
 * แสดงข้อบกพร่องที่เลือกไว้
 */
function renderActiveDefects() {
    if (activeDefects.length === 0) {
        $('#active-defects').html('<tr><td colspan="7" class="text-center text-muted py-3">ยังไม่มีข้อบกพร่องที่เลือก กรุณาเลือกข้อบกพร่องจากรายการด้านบน</td></tr>');
        calculateDefectTotals();
        return;
    }
    
    const activeDefectsHtml = activeDefects.map(defect => {
        const severityClass = getSeverityClass(defect.severity);
        return `
            <tr class="${severityClass}">
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
                    <button type="button" class="btn btn-sm btn-danger remove-defect-btn" data-defect="${defect.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    $('#active-defects').html(activeDefectsHtml);
    
    // เพิ่ม event listeners สำหรับ inputs จำนวนข้อบกพร่อง
    $('.defect-count-input').on('change', function() {
        const defectId = $(this).data('defect');
        const lot = $(this).data('lot');
        const count = parseInt($(this).val()) || 0;
        
        // อัพเดท activeDefects ด้วยจำนวนใหม่
        const defect = activeDefects.find(d => d.id === defectId);
        if (defect) {
            defect.counts[lot] = count;
            isFormDirty = true;
        }
        
        // คำนวณผลรวมใหม่
        calculateDefectTotals();
    });
    
    // เพิ่ม event listeners สำหรับปุ่มลบ
    $('.remove-defect-btn').on('click', function() {
        const defectId = $(this).data('defect');
        removeDefect(defectId);
    });
    
    // คำนวณผลรวมหลังการแสดงผล
    calculateDefectTotals();
}

/**
 * คำนวณผลรวมสำหรับข้อบกพร่องในแต่ละล็อต
 */
function calculateDefectTotals() {
    // กำหนดค่าเริ่มต้นของผลรวม
    const totals = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    // คำนวณผลรวมสำหรับแต่ละล็อต
    activeDefects.forEach(defect => {
        for (let lot = 1; lot <= 4; lot++) {
            totals[lot] += parseInt(defect.counts[lot] || 0);
        }
    });
    
    // อัพเดทการแสดงผลรวม
    for (let lot = 1; lot <= 4; lot++) {
        $(`#total-defects-${lot}`).text(totals[lot]);
    }
}

/**
 * Save form data to the server
 */
function saveFormData() {
    try {
        const formData = collectFormData();
        
        $.ajax({
            url: 'api/api.php?action=save_inspection',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            timeout: 30000,
            success: function(response) {
                $('#loading-overlay').hide();
                
                try {
                    const result = typeof response === 'object' ? response : JSON.parse(response);
                    
                    if (result.status === 'success') {
                        // Update version for optimistic locking
                        formVersion = result.version || (formVersion + 1);
                        $('#form-version').val(formVersion);
                        
                        showAlert('success', 'บันทึกข้อมูลเรียบร้อยแล้ว', 3000);
                        
                        // Clear saved form state in localStorage
                        clearSavedFormState();
                        
                        // Reset form dirty flag
                        isFormDirty = false;
                        
                        // Show success screen with options
                        showSuccessScreen(result.id);
                    } else {
                        showAlert('danger', 'เกิดข้อผิดพลาด: ' + result.message, 5000);
                    }
                } catch (e) {
                    console.error('Error parsing response:', e, response);
                    showAlert('danger', 'เกิดข้อผิดพลาดในการประมวลผลการตอบกลับ', 5000);
                }
            },
            error: function(xhr, status, error) {
                $('#loading-overlay').hide();
                
                if (status === 'timeout') {
                    showAlert('danger', 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง', 5000);
                    
                    // Save to localStorage as backup
                    saveFormState();
                    showAlert('info', 'บันทึกข้อมูลไว้ในเครื่องชั่วคราวแล้ว', 3000);
                } else if (xhr.status === 409) {
                    // Concurrency error
                    handleConcurrencyError();
                } else {
                    showAlert('danger', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error, 5000);
                }
                
                console.error('AJAX Error:', status, error, xhr.responseText);
            },
            complete: function() {
                isSubmitting = false;
            }
        });
    } catch (e) {
        $('#loading-overlay').hide();
        isSubmitting = false;
        console.error('Error in saveFormData:', e);
        showAlert('danger', 'เกิดข้อผิดพลาด: ' + e.message, 5000);
    }
}

/**
 * Show success screen after form submission
 * @param {string} id Inspection ID
 */
function showSuccessScreen(id) {
    // Create success screen HTML
    const successHtml = `
        <div class="text-center py-5">
            <div class="mb-4">
                <i class="fas fa-check-circle text-success" style="font-size: 64px;"></i>
            </div>
            <h3 class="mb-4">บันทึกข้อมูลเรียบร้อยแล้ว</h3>
            <p class="mb-4">รหัสการตรวจสอบ: <strong>${id}</strong></p>
            <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                <a href="view.html?id=${id}" class="btn btn-primary">
                    <i class="fas fa-eye"></i> ดูรายละเอียด
                </a>
                <a href="print.html?id=${id}" class="btn btn-info">
                    <i class="fas fa-print"></i> พิมพ์รายงาน
                </a>
                <a href="index.html" class="btn btn-outline-secondary">
                    <i class="fas fa-plus-circle"></i> สร้างรายการใหม่
                </a>
            </div>
        </div>
    `;
    
    // Replace form with success screen
    $('#quality-form').html(successHtml);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

/**
 * Clear form data
 */
function clearForm() {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด?')) {
        // Clear all form fields
        $('#quality-form')[0].reset();
        
        // Clear active defects
        activeDefects = [];
        renderActiveDefects();
        
        // Clear localStorage
        clearSavedFormState();
        
        // Reset form version
        formVersion = 1;
        $('#form-version').val(formVersion);
        
        // Reset form dirty flag
        isFormDirty = false;
        
        showAlert('success', 'ล้างข้อมูลเรียบร้อยแล้ว', 3000);
    }
}

/**
 * Show alert message
 * @param {string} type Alert type ('success', 'danger', 'warning', 'info')
 * @param {string} message Message to display
 * @param {number} duration Duration in milliseconds (0 for no auto-hide)
 * @param {boolean} isAutoSave Whether this is an auto-save notification
 */
function showAlert(type, message, duration = 5000, isAutoSave = false) {
    // Create alert element
    const alertId = 'alert-' + Date.now();
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${isAutoSave ? '<i class="fas fa-save me-2"></i>' : ''}
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Remove previous auto-save alerts if this is an auto-save notification
    if (isAutoSave) {
        $('.alert i.fa-save').closest('.alert').remove();
    }
    
    // Add alert to the page
    $('main').prepend(alertHtml);
    
    // Auto-hide alert after duration
    if (duration > 0) {
        setTimeout(function() {
            $(`#${alertId}`).alert('close');
        }, duration);
    }
}

/**
 * Handle window unload event to prevent data loss
 * @param {Event} e Unload event
 */
function handleBeforeUnload(e) {
    if (isFormDirty) {
        const message = 'คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?';
        e.returnValue = message;
        return message;
    }
}

/**
 * Export inspection data to Excel
 * @param {number} id Inspection ID 
 */
function exportToExcel(id) {
    $('#loading-overlay').css('display', 'flex');
    
    $.ajax({
        url: `api/api.php?action=get_inspection&id=${id}`,
        type: 'GET',
        success: function(response) {
            try {
                const result = typeof response === 'object' ? response : JSON.parse(response);
                
                if (result.status === 'success') {
                    // Generate Excel file using SheetJS
                    generateExcel(result.data);
                } else {
                    showAlert('danger', `เกิดข้อผิดพลาด: ${result.message}`, 5000);
                }
            } catch (e) {
                showAlert('danger', 'เกิดข้อผิดพลาดในการส่งออกข้อมูล', 5000);
                console.error('Export error:', e);
            } finally {
                $('#loading-overlay').hide();
            }
        },
        error: function(xhr, status, error) {
            $('#loading-overlay').hide();
            showAlert('danger', `เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error}`, 5000);
        }
    });
}

/**
 * Generate Excel file from inspection data
 * @param {Object} data Inspection data
 */
function generateExcel(data) {
    // This would use SheetJS library to generate Excel file
    // For demonstration purposes, we'll just show an alert
    showAlert('info', 'ฟังก์ชันการส่งออกเป็น Excel จะถูกพัฒนาในเวอร์ชันถัดไป', 5000);
}

/**
 * Initialize offline support features
 */
function initOfflineSupport() {
    // Check if browser supports service workers
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js').then(function(registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
    
    // Check online status initially
    updateOnlineStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    /**
     * Update UI based on online status
     */
    function updateOnlineStatus() {
        const isOnline = navigator.onLine;
        
        if (isOnline) {
            $('body').removeClass('offline-mode');
            
            // Try to sync any pending changes
            if (hasPendingChanges()) {
                syncPendingChanges();
            }
        } else {
            $('body').addClass('offline-mode');
            showAlert('warning', 'คุณกำลังทำงานในโหมดออฟไลน์ ข้อมูลจะถูกบันทึกในเครื่องชั่วคราว', 5000);
        }
    }
    
    /**
     * Check if there are pending changes to sync
     * @return {boolean} Whether there are pending changes
     */
    function hasPendingChanges() {
        return localStorage.getItem('pendingChanges') !== null;
    }
    
    /**
     * Sync pending changes with server
     */
    function syncPendingChanges() {
        const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
        
        if (pendingChanges.length === 0) return;
        
        showAlert('info', 'กำลังซิงค์ข้อมูลที่ค้างไว้...', 0);
        
        // Process each pending change
        let processedCount = 0;
        pendingChanges.forEach(function(change, index) {
            $.ajax({
                url: change.url,
                type: change.method,
                contentType: 'application/json',
                data: JSON.stringify(change.data),
                success: function() {
                    processedCount++;
                    
                    // If all changes processed, clear pending changes
                    if (processedCount === pendingChanges.length) {
                        localStorage.removeItem('pendingChanges');
                        showAlert('success', 'ซิงค์ข้อมูลเรียบร้อยแล้ว', 3000);
                    }
                },
                error: function() {
                    showAlert('warning', 'ไม่สามารถซิงค์ข้อมูลบางรายการได้ จะลองใหม่เมื่อมีการเชื่อมต่ออีกครั้ง', 5000);
                }
            });
        });
    }
}

/**
 * Add a pending change to be synced later
 * @param {string} url API endpoint URL
 * @param {string} method HTTP method
 * @param {Object} data Request data
 */
function addPendingChange(url, method, data) {
    const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
    
    pendingChanges.push({
        url: url,
        method: method,
        data: data,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
}

// Initialize offline support
initOfflineSupport();

// Update progress bar based on form completion
function updateProgressBar() {
    // Get all required fields
    const requiredFields = $('#quality-form input[required], #quality-form select[required]');
    
    // Count how many are filled
    let filledCount = 0;
    requiredFields.each(function() {
        if ($(this).val()) {
            filledCount++;
        }
    });
    
    // Check radio buttons
    $('#quality-form input[type="radio"][required]').each(function() {
        const name = $(this).attr('name');
        if ($(`input[name="${name}"]:checked`).length > 0) {
            filledCount++;
        }
    });
    
    // Calculate percentage
    const totalRequired = requiredFields.length;
    const completionPercentage = Math.round((filledCount / totalRequired) * 100);
    
    // Update progress bar
    $('#progress-bar').css('width', completionPercentage + '%');
    
    // Update steps
    const steps = ['general', 'lots', 'defects', 'strain', 'approval'];
    let currentStep = 0;
    
    // Determine current step based on scroll position or form completion
    const scrollPosition = $(window).scrollTop();
    
    for (let i = 0; i < steps.length; i++) {
        const sectionTop = $(`.form-section:eq(${i})`).offset().top - 200;
        if (scrollPosition >= sectionTop) {
            currentStep = i;
        }
    }
    
    // Update step indicators
    $('.progress-step').removeClass('step-active step-complete');
    
    for (let i = 0; i < steps.length; i++) {
        if (i < currentStep) {
            $(`.progress-step[data-step="${i+1}"]`).addClass('step-complete');
        } else if (i === currentStep) {
            $(`.progress-step[data-step="${i+1}"]`).addClass('step-active');
        }
    }
}

// Add event listener for scroll to update progress
$(window).on('scroll', updateProgressBar);

// Add event listener for form inputs to update progress
$('#quality-form').on('change', 'input, select, textarea', updateProgressBar);

// Call initially to set progress bar
setTimeout(updateProgressBar, 500);