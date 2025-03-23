// state.js - Manages application state
const STATE = {
    // Constants
    FORM_STATE_KEY: 'oceanGlassQA_formState',
    FORM_TIMESTAMP_KEY: 'oceanGlassQA_formTimestamp',
    FORM_VERSION_KEY: 'oceanGlassQA_formVersion',
    CSRF_TOKEN_KEY: 'oceanGlassQA_csrfToken',
    
    // Current state
    formVersion: 1,
    isFormDirty: false,
    lastSaveTime: null,
    isSubmitting: false,
    
    // CSRF token
    generateCsrfToken: function() {
        const token = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
        localStorage.setItem(this.CSRF_TOKEN_KEY, token);
        return token;
    },
    
    getCsrfToken: function() {
        let token = localStorage.getItem(this.CSRF_TOKEN_KEY);
        if (!token) {
            token = this.generateCsrfToken();
        }
        return token;
    },
    
    // Form state management
    saveFormState: function(formData) {
        if (!this.isFormDirty) return;
        
        localStorage.setItem(this.FORM_STATE_KEY, JSON.stringify(formData));
        localStorage.setItem(this.FORM_TIMESTAMP_KEY, new Date().toISOString());
        localStorage.setItem(this.FORM_VERSION_KEY, this.formVersion.toString());
        
        this.lastSaveTime = new Date();
        this.isFormDirty = false;
        
        console.log('Form state saved to localStorage at', this.lastSaveTime);
    },
    
    loadFormState: function() {
        try {
            const savedState = localStorage.getItem(this.FORM_STATE_KEY);
            if (savedState) {
                this.formVersion = parseInt(localStorage.getItem(this.FORM_VERSION_KEY) || '1');
                return JSON.parse(savedState);
            }
        } catch (e) {
            console.error('Error loading form state:', e);
        }
        return null;
    },
    
    clearFormState: function() {
        localStorage.removeItem(this.FORM_STATE_KEY);
        localStorage.removeItem(this.FORM_TIMESTAMP_KEY);
        localStorage.removeItem(this.FORM_VERSION_KEY);
        console.log('Saved form state cleared');
    },
    
    setFormDirty: function(isDirty = true) {
        this.isFormDirty = isDirty;
    }
};

// Export the STATE object
window.STATE = STATE;