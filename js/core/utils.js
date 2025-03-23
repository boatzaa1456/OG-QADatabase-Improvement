// utils.js - Utility functions
const UTILS = {
    // Date utilities
    formatDate: function(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    },
    
    formatDateTime: function(date) {
        if (!date) return '';
        
        const d = new Date(date);
        return d.toLocaleString('th-TH');
    },
    
    // UI utilities
    setDefaultDateRange: function() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        
        return {
            startDate: this.formatDate(firstDay),
            endDate: this.formatDate(now)
        };
    },
    
    // Browser feature detection
    isMobile: function() {
        return window.innerWidth < 768;
    },
    
    isOnline: function() {
        return navigator.onLine;
    },
    
    // Resource locking for optimistic concurrency
    acquireResourceLock: function(resourceType, resourceId, timeout = 10) {
        // This would be an API call in a real implementation
        return true;
    },
    
    releaseResourceLock: function(resourceType, resourceId) {
        // This would be an API call in a real implementation
        return true;
    }
};

// Export the UTILS object
window.UTILS = UTILS;