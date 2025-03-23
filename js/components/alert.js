// alert.js - Alert message system
const AlertComponent = {
    /**
     * Show an alert message
     * @param {string} type Alert type ('success', 'danger', 'warning', 'info')
     * @param {string} message Message to display
     * @param {number} duration Duration in milliseconds (0 for no auto-hide)
     * @param {boolean} isAutoSave Whether this is an auto-save notification
     */
    show: function(type, message, duration = 5000, isAutoSave = false) {
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
        
        return alertId;
    },
    
    // Success alert shorthand
    success: function(message, duration = 3000) {
        return this.show('success', message, duration);
    },
    
    // Error alert shorthand
    error: function(message, duration = 5000) {
        return this.show('danger', message, duration);
    },
    
    // Warning alert shorthand
    warning: function(message, duration = 4000) {
        return this.show('warning', message, duration);
    },
    
    // Info alert shorthand
    info: function(message, duration = 4000) {
        return this.show('info', message, duration);
    },
    
    // Show validation errors
    showValidationErrors: function(errors) {
        if (!errors || errors.length === 0) return;
        
        const errorHtml = errors.map(error => `<li>${error}</li>`).join('');
        $('#error-list').html(errorHtml);
        $('#validation-errors').show();
        
        // Scroll to error message
        $('html, body').animate({
            scrollTop: $('#validation-errors').offset().top - 100
        }, 500);
    },
    
    // Hide all alerts
    hideAll: function() {
        $('.alert').alert('close');
    }
};

// Export the AlertComponent
window.AlertComponent = AlertComponent;