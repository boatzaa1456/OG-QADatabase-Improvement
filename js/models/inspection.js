// inspection.js - Inspection data model
const InspectionModel = {
    // Active defects in the current form
    activeDefects: [],
    selectedLot: 1,
    
    // Collect all form data into a structured object
    collectFormData: function() {
        // Basic information
        const formData = {
            version: STATE.formVersion,
            
            docPT: VALIDATOR.sanitizeInput($('#doc-pt').val()),
            productionDate: $('#production-date').val(),
            shift: $('input[name="shift"]:checked').val(),
            itemNumber: VALIDATOR.sanitizeInput($('#item-number').val()),
            gaugeMark: $('#gauge-mark').val(),
            productionType: $('input[name="production-type"]:checked').val(),
            useJig: $('#use-jig').is(':checked'),
            noJig: $('#no-jig').is(':checked'),
            machineNo: VALIDATOR.sanitizeInput($('#machine-no').val()),
            totalProduct: $('#total-product').val(),
            samplingDate: $('#sampling-date').val(),
            workOrder: VALIDATOR.sanitizeInput($('#work-order').val()),
            operation: VALIDATOR.sanitizeInput($('#operation').val()),
            
            csrfToken: STATE.getCsrfToken(),
            
            lots: [],
            defects: [],
            strainMeasurements: [],
            
            inspector: $('#inspector').val(),
            supervisor: $('#supervisor').val(),
            remarks: VALIDATOR.sanitizeInput($('#remarks').val())
        };
        
        // Collect lot data
        for (let i = 1; i <= 4; i++) {
            const lotNumber = $(`#lot-number-${i}`).val();
            if (lotNumber) {
                formData.lots.push({
                    lotNumber: `lot${i}`,
                    piecesPerLot: $(`#pieces-per-lot-${i}`).val() || 0,
                    description: VALIDATOR.sanitizeInput($(`#description-${i}`).val()) || '',
                    palletNo: VALIDATOR.sanitizeInput($(`#pallet-no-${i}`).val()) || '',
                    strainStd: $(`#strain-std-${i}`).val() || null,
                    firstSampleSize: $(`#first-sample-size-${i}`).val() || null,
                    firstSampleAcRe: VALIDATOR.sanitizeInput($(`#first-sample-ac-re-${i}`).val()) || '',
                    secondSampleSize: $(`#second-sample-size-${i}`).val() || null,
                    secondSampleAcRe: VALIDATOR.sanitizeInput($(`#second-sample-ac-re-${i}`).val()) || '',
                    result: $(`input[name="result-${i}"]:checked`).val() || '',
                    qp: VALIDATOR.sanitizeInput($(`#qp-${i}`).val()) || '',
                    strainResult: $(`input[name="strain-result-${i}"]:checked`).val() || ''
                });
            }
        }
        
        // Collect defect data
        if (this.activeDefects && this.activeDefects.length > 0) {
            this.activeDefects.forEach(defect => {
                for (let lot = 1; lot <= 4; lot++) {
                    const count = parseInt(defect.counts[lot]) || 0;
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
        
        // Collect strain measurement data
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
    },
    
    // Add a defect to the active list
    addDefect: function(defectId) {
        // Check if defect already exists
        if (this.activeDefects.some(d => d.id === defectId)) {
            return false;
        }
        
        // Find defect details
        const defect = DefectModel.getTypeById(defectId);
        if (!defect) return false;
        
        // Add to active defects with counts initialized
        const newDefect = {
            ...defect,
            counts: { 1: 0, 2: 0, 3: 0, 4: 0 }
        };
        
        // Set the count for the currently selected lot to 1
        newDefect.counts[this.selectedLot] = 1;
        
        this.activeDefects.push(newDefect);
        STATE.setFormDirty(true);
        
        return true;
    },
    
    // Remove a defect from the active list
    removeDefect: function(defectId) {
        const index = this.activeDefects.findIndex(d => d.id === defectId);
        if (index === -1) return false;
        
        this.activeDefects.splice(index, 1);
        STATE.setFormDirty(true);
        
        return true;
    },
    
    // Calculate totals for defects
    calculateDefectTotals: function() {
        const totals = { 1: 0, 2: 0, 3: 0, 4: 0 };
        
        this.activeDefects.forEach(defect => {
            for (let lot = 1; lot <= 4; lot++) {
                totals[lot] += parseInt(defect.counts[lot] || 0);
            }
        });
        
        return totals;
    },
    
    // Update defect count for a specific defect and lot
    updateDefectCount: function(defectId, lot, count) {
        const defect = this.activeDefects.find(d => d.id === defectId);
        if (!defect) return false;
        
        defect.counts[lot] = count;
        STATE.setFormDirty(true);
        
        return true;
    },
    
    // Set which lot is currently selected
    setSelectedLot: function(lotNumber) {
        this.selectedLot = parseInt(lotNumber);
    }
};

// Export the InspectionModel
window.InspectionModel = InspectionModel;