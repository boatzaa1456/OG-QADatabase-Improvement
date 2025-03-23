// form.js - Form handling utilities
const FormComponent = {
    // Auto-save interval reference
    autoSaveInterval: null,
    
    // Start auto-save functionality
    startAutoSave: function(saveCallback, interval = 30000) {
        // Clear any existing interval
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // Set up new auto-save interval
        this.autoSaveInterval = setInterval(function() {
            if (STATE.isFormDirty && typeof saveCallback === 'function') {
                saveCallback();
                
                // Show auto-save notification if it's been a while since last save
                if (!STATE.lastSaveTime || new Date() - STATE.lastSaveTime > 60000) {
                    AlertComponent.show('info', 'บันทึกข้อมูลอัตโนมัติเรียบร้อยแล้ว', 2000, true);
                }
            }
        }, interval);
    },
    
    // Stop auto-save
    stopAutoSave: function() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    },
    
    // Clear form data
    clearForm: function(formId) {
        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด?')) {
            // Reset the form
            $(formId)[0].reset();
            
            // Clear localStorage
            STATE.clearFormState();
            
            // Reset form version
            STATE.formVersion = 1;
            
            // Reset form dirty flag
            STATE.setFormDirty(false);
            
            // Clear any active defects
            InspectionModel.activeDefects = [];
            
            AlertComponent.success('ล้างข้อมูลเรียบร้อยแล้ว');
            
            return true;
        }
        
        return false;
    },
    
    // Save form data to localStorage
    saveFormStateToStorage: function() {
        const formData = InspectionModel.collectFormData();
        STATE.saveFormState(formData);
    },
    
    // Handle form submission
    handleSubmit: function(event, validateCallback, submitCallback) {
        event.preventDefault();
        
        // Hide any previous validation errors
        $('#validation-errors').hide();
        
        // Don't allow multiple submissions
        if (STATE.isSubmitting) {
            AlertComponent.warning('กำลังประมวลผล โปรดรอสักครู่...');
            return false;
        }
        
        // Validate form
        if (typeof validateCallback === 'function' && !validateCallback()) {
            return false;
        }
        
        // Show loading overlay
        STATE.isSubmitting = true;
        $('#loading-overlay').css('display', 'flex');
        
        // Submit form
        if (typeof submitCallback === 'function') {
            submitCallback();
        }
        
        return true;
    },
    
    // Populate form with data
    populateForm: function(data) {
        if (!data) return;
        
        // Clear any existing form data
        $('#quality-form')[0].reset();
        InspectionModel.activeDefects = [];
        
        // Basic information
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
        
        // Lot data
        if (data.lots && data.lots.length > 0) {
            data.lots.forEach((lot, index) => {
                const lotNum = index + 1;
                
                $(`#lot-number-${lotNum}`).val(lot.lot_number);
                $(`#pieces-per-lot-${lotNum}`).val(lot.pieces_per_lot);
                $(`#description-${lotNum}`).val(lot.description);
                $(`#pallet-no-${lotNum}`).val(lot.pallet_no);
                $(`#strain-std-${lotNum}`).val(lot.strain_std);
                $(`#first-sample-size-${lotNum}`).val(lot.first_sample_size);
                $(`#first-sample-ac-re-${lotNum}`).val(lot.first_sample_ac_re);
                $(`#second-sample-size-${lotNum}`).val(lot.second_sample_size);
                $(`#second-sample-ac-re-${lotNum}`).val(lot.second_sample_ac_re);
                $(`#qp-${lotNum}`).val(lot.qp);
                
                if (lot.result) {
                    $(`input[name="result-${lotNum}"][value="${lot.result}"]`).prop('checked', true);
                }
                
                if (lot.strain_result) {
                    $(`input[name="strain-result-${lotNum}"][value="${lot.strain_result}"]`).prop('checked', true);
                }
                
                // Defects
                if (lot.defects && lot.defects.length > 0) {
                    lot.defects.forEach(defect => {
                        const defectType = DefectModel.getTypeById(defect.defect_code);
                        if (defectType) {
                            const existingDefect = InspectionModel.activeDefects.find(d => d.id === defect.defect_code);
                            if (existingDefect) {
                                existingDefect.counts[lotNum] = parseInt(defect.defect_count) || 0;
                            } else {
                                const newDefect = {
                                    ...defectType,
                                    counts: { 1: 0, 2: 0, 3: 0, 4: 0 }
                                };
                                newDefect.counts[lotNum] = parseInt(defect.defect_count) || 0;
                                InspectionModel.activeDefects.push(newDefect);
                            }
                        }
                    });
                }
                // Strain measurements
                if (lot.strainMeasurements && lot.strainMeasurements.length > 0) {
                    lot.strainMeasurements.forEach(measurement => {
                        $(`.strain-input[data-lot="${lotNum}"][data-position="${measurement.position}"]`)
                            .val(measurement.value);
                    });
                }
            });
        }
        
        // Approval data
        $('#inspector').val(data.inspector);
        $('#supervisor').val(data.supervisor);
        $('#remarks').val(data.remarks);
        
        // Set form version
        STATE.formVersion = data.version || 1;
        
        // Reset form dirty state
        STATE.setFormDirty(false);
        
        return true;
    }
};

// Export the FormComponent
window.FormComponent = FormComponent;