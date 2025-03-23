// defect.js - Defect data and operations
const DefectModel = {
    // Categories of defects
    categories: [
        { id: 1, name: 'ข้อบกพร่องที่ผิว (Surface Defects)' },
        { id: 2, name: 'ข้อบกพร่องรูปทรง (Shape Defects)' },
        { id: 3, name: 'ข้อบกพร่องจากการผลิต (Manufacturing)' },
        { id: 4, name: 'ข้อบกพร่องอื่นๆ (Others)' }
    ],
    
    // Types of defects with their categories
    types: [
        // Surface Defects
        { id: 'D1019', name: 'Dirty body', categoryId: 1, severity: 'low' },
        { id: 'D1052', name: 'Scratch', categoryId: 1, severity: 'medium' },
        { id: 'D1001', name: 'Blister on surface', categoryId: 1, severity: 'medium' },
        { id: 'D1002', name: 'Stone', categoryId: 1, severity: 'high' },
        { id: 'D1003', name: 'Check', categoryId: 1, severity: 'high' },
        { id: 'D1004', name: 'Crack', categoryId: 1, severity: 'critical' },
        
        // Shape Defects
        { id: 'D2047', name: 'Rocker bottom', categoryId: 2, severity: 'high' },
        { id: 'D2012', name: 'Distorted', categoryId: 2, severity: 'medium' },
        { id: 'D2015', name: 'Thin bottom', categoryId: 2, severity: 'high' },
        { id: 'D2001', name: 'Uneven rim', categoryId: 2, severity: 'medium' },
        { id: 'D2002', name: 'Warped', categoryId: 2, severity: 'medium' },
        
        // Manufacturing Defects
        { id: 'D3106', name: 'Wrong Joint', categoryId: 3, severity: 'high' },
        { id: 'D3024', name: 'Blister', categoryId: 3, severity: 'medium' },
        { id: 'D3001', name: 'Cold Mark', categoryId: 3, severity: 'low' },
        { id: 'D3002', name: 'Cold Glass', categoryId: 3, severity: 'medium' },
        { id: 'D3003', name: 'Fold', categoryId: 3, severity: 'medium' },
        { id: 'D3004', name: 'Glass Blob', categoryId: 3, severity: 'high' },
        
        // Others
        { id: 'D4099', name: 'Others', categoryId: 4, severity: 'medium' }
    ],
    
    // Get defect type by ID
    getTypeById: function(id) {
        return this.types.find(defect => defect.id === id);
    },
    
    // Get defects by category
    getTypesByCategory: function(categoryId) {
        if (categoryId === 0) return this.types;
        return this.types.filter(defect => defect.categoryId === categoryId);
    },
    
    // Get severity class for CSS
    getSeverityClass: function(severity) {
        switch (severity) {
            case 'low': return 'defect-low';
            case 'medium': return 'defect-medium';
            case 'high': return 'defect-high';
            case 'critical': return 'defect-critical';
            default: return '';
        }
    },
    
    // Search defects by name or ID
    searchDefects: function(searchTerm) {
        if (!searchTerm) return this.types;
        
        const term = searchTerm.toLowerCase();
        return this.types.filter(defect => 
            defect.id.toLowerCase().includes(term) || 
            defect.name.toLowerCase().includes(term)
        );
    }
};

// Export the DefectModel
window.DefectModel = DefectModel;