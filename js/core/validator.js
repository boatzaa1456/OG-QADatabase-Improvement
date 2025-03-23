// validator.js - Form validation utilities
const VALIDATOR = {
    validateForm: function(formData) {
        const errors = [];
        
        // General information validation
        if (!formData.docPT) errors.push('กรุณาระบุ Doc: PT');
        if (!formData.productionDate) errors.push('กรุณาระบุวันที่ผลิต');
        if (!formData.shift) errors.push('กรุณาเลือกกะ');
        if (!formData.itemNumber) errors.push('กรุณาระบุ Item Number');
        if (!formData.machineNo) errors.push('กรุณาระบุ Machine No.');
        if (!formData.totalProduct) errors.push('กรุณาระบุจำนวนสินค้าทั้งหมด');
        if (!formData.samplingDate) errors.push('กรุณาระบุวันที่สุ่มตัวอย่าง');
        if (!formData.workOrder) errors.push('กรุณาระบุ Work Order');
        
        // Lot validation - must have at least one lot
        let hasLot = false;
        if (formData.lots && formData.lots.length > 0) {
            formData.lots.forEach((lot, index) => {
                if (lot.lotNumber) {
                    if (!lot.piecesPerLot) {
                        errors.push(`กรุณาระบุจำนวนต่อล็อตของล็อต ${index + 1}`);
                    } else {
                        hasLot = true;
                    }
                }
            });
        }
        
        if (!hasLot) {
            errors.push('กรุณาระบุข้อมูลล็อตอย่างน้อย 1 ล็อต (LOT และจำนวน)');
        }
        
        // Approval validation
        if (!formData.inspector) errors.push('กรุณาเลือกผู้ตรวจสอบ');
        if (!formData.supervisor) errors.push('กรุณาเลือกผู้ตรวจทาน');
        
        return errors;
    },
    
    validateMinimumRequirements: function(formData) {
        return formData.docPT && formData.productionDate && formData.itemNumber;
    },
    
    sanitizeInput: function(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
};

// Export the VALIDATOR object
window.VALIDATOR = VALIDATOR;