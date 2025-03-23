// main.js - Application entry point

// Execute when DOM is fully loaded
$(document).ready(function() {
    console.log('Application initialized');
    
    // Setup AJAX CSRF protection
    setupAjaxDefaults();
    
    // Check page type and initialize the appropriate controller
    if ($('#quality-form').length > 0) {
        // Inspection form page
        InspectionForm.init();
    } else if ($('#inspection-table').length > 0) {
        // Inspection list page
        ListView.init();
    } else if ($('#inspection-title').length > 0) {
        // Inspection view page
        // DetailView.init(); // This would be implemented similarly to other controllers
    } else if ($('#report-title').length > 0) {
        // Inspection print page
        // PrintView.init(); // This would be implemented similarly to other controllers
    }
    
    // Global event handlers
    $(window).on('resize', function() {
        // Responsive design adjustments
        adjustForScreenSize();
    });
    
    // Initialize tooltips, popovers, etc.
    initializeBootstrapComponents();
});

// Setup AJAX defaults including CSRF protection
function setupAjaxDefaults() {
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': STATE.getCsrfToken()
        },
        error: function(xhr, status, error) {
            // Global error handling for all AJAX requests
            if (status === 'timeout') {
                AlertComponent.warning('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
            } else if (xhr.status === 401) {
                AlertComponent.error('คุณไม่ได้รับอนุญาตให้เข้าถึงข้อมูลนี้ กรุณาเข้าสู่ระบบใหม่');
            } else if (xhr.status === 404) {
                AlertComponent.error('ไม่พบข้อมูลที่ร้องขอ');
            } else if (xhr.status === 500) {
                AlertComponent.error('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ');
            } else {
                AlertComponent.error('เกิดข้อผิดพลาด: ' + error);
            }
            console.error('AJAX Error:', status, error, xhr.responseText);
        }
    });
}

// Initialize Bootstrap components
function initializeBootstrapComponents() {
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize popovers
    $('[data-bs-toggle="popover"]').popover();
}

// Adjust UI for different screen sizes
function adjustForScreenSize() {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        // Mobile adjustments
        $('body').addClass('mobile-view');
    } else {
        // Desktop adjustments
        $('body').removeClass('mobile-view');
    }
}