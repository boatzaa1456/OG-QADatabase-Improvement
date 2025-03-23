// inspection-form.js - Controller for the inspection form page
const InspectionForm = {
    // Initialize the form
    init: function() {
        // Check if we're on the inspection form page
        if ($('#quality-form').length === 0) return;
        
        // Check for inspection ID in URL
        const urlParams = new URLSearchParams(window.location.search);
        const inspectionId = urlParams.get('id');
        
        if (inspectionId) {
            this.loadExistingInspection(inspectionId);
        } else {
            // Check if there's saved data in localStorage
            this.checkForSavedFormState();
            
            // Display the form
            this.displayQAForm();
        }
        
        // Add event listeners
        this.addFormEventListeners();
        
        // Start auto-save
        FormComponent.startAutoSave(() => this.saveDraft(true));
        
        // Add window events
        $(window).on('beforeunload', this.handleBeforeUnload);
        $(window).on('resize', this.handleResize);
        $(window).on('online', this.handleOnlineStatus);
        $(window).on('offline', this.handleOfflineStatus);
        
        console.log('Inspection form initialized');
    },
    
    // Load existing inspection data
    loadExistingInspection: function(id) {
        $('#loading-overlay').css('display', 'flex');
        
        API.getInspection(id)
            .then(response => {
                if (response.status === 'success') {
                    // Display form
                    this.displayQAForm();
                    
                    // Populate form with data
                    FormComponent.populateForm(response.data);
                    
                    // Update defect display
                    this.renderActiveDefects();
                    
                    AlertComponent.info('โหลดข้อมูลเรียบร้อยแล้ว คุณสามารถแก้ไขและบันทึกได้');
                } else {
                    AlertComponent.error(`เกิดข้อผิดพลาด: ${response.message}`);
                }
            })
            .catch(error => {
                console.error('Error loading inspection:', error);
                AlertComponent.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                
                // Display empty form anyway
                this.displayQAForm();
            })
            .finally(() => {
                $('#loading-overlay').hide();
            });
    },
    
    // Check if there's saved form state
    checkForSavedFormState: function() {
        const savedState = localStorage.getItem(STATE.FORM_STATE_KEY);
        const savedTimestamp = localStorage.getItem(STATE.FORM_TIMESTAMP_KEY);
        
        if (savedState && savedTimestamp) {
            const now = new Date();
            const savedTime = new Date(savedTimestamp);
            const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
            
            // If data is less than 24 hours old, offer to restore
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
                
                restoreDialog.find('.restore-btn').on('click', () => {
                    this.restoreFormState();
                    restoreDialog.alert('close');
                });
                
                restoreDialog.find('.discard-btn').on('click', () => {
                    STATE.clearFormState();
                    restoreDialog.alert('close');
                });
                
                $('#qa-form').prepend(restoreDialog);
            }
        }
    },
    
    // Restore form state from localStorage
    restoreFormState: function() {
        try {
            const savedStateJSON = localStorage.getItem(STATE.FORM_STATE_KEY);
            if (!savedStateJSON) return;
            
            const formData = JSON.parse(savedStateJSON);
            STATE.formVersion = parseInt(localStorage.getItem(STATE.FORM_VERSION_KEY) || '1');
            
            // Populate form
            FormComponent.populateForm(formData);
            
            // Update defect display
            this.renderActiveDefects();
            
            AlertComponent.success('กู้คืนข้อมูลเรียบร้อยแล้ว');
            
        } catch (e) {
            console.error('Error restoring form state:', e);
            AlertComponent.error('เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + e.message);
            STATE.clearFormState();
        }
    },
    
    // Display the QA form
    displayQAForm: function() {
        // Generate HTML for the form (This would include the entire HTML structure)
        const formHTML = this.createQAFormHTML();
        
        // Update the DOM
        $('#qa-form').html(formHTML);
        
        // Initialize form components
        this.initDefectsSection();
        
        // Calculate defect totals
        this.calculateDefectTotals();
        
        // Adjust layout for screen size
        this.adjustLayoutForScreenSize();
    },
    
    // Create the HTML for the QA form
    createQAFormHTML: function() {
        // This would be the entire form HTML that's currently in your script.js
        // For brevity, I'm not including the complete HTML here
        return `
            <h2 class="mb-3">QA QUALITY DATA</h2>
            <form id="quality-form">
                <!-- Form sections would go here - General info, lots, defects, etc. -->
                
                <!-- Bottom buttons -->
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
    },
    
    // Add event listeners to the form
    addFormEventListeners: function() {
        // Form submission
        $('#quality-form').on('submit', event => 
            FormComponent.handleSubmit(event, 
                () => this.validateForm(), 
                () => this.saveFormData()
            )
        );
        
        // Save draft button
        $('#save-draft-btn').on('click', () => this.saveDraft());
        
        // Clear form button
        $('#clear-form').on('click', () => FormComponent.clearForm('#quality-form'));
        
        // Track form changes
        $('input, select, textarea').on('change input', () => STATE.setFormDirty(true));
    },
    
    // Initialize defects section
    initDefectsSection: function() {
        // Initialize defect filtering
        let searchTerm = '';
        let selectedCategory = 0;
        
        // Render initial defect list
        this.renderDefectList();
        
        // Render active defects
        this.renderActiveDefects();
        
        // Category filter change
        $('#defect-category').on('change', function() {
            selectedCategory = parseInt($(this).val());
            InspectionForm.renderDefectList(selectedCategory, searchTerm);
        });
        
        // Search input change
        $('#defect-search').on('input', function() {
            searchTerm = $(this).val().trim();
            InspectionForm.renderDefectList(selectedCategory, searchTerm);
        });
        
        // Clear search button
        $('#clear-defect-search').on('click', function() {
            $('#defect-search').val('');
            searchTerm = '';
            InspectionForm.renderDefectList(selectedCategory, '');
        });
        
        // Lot selector change
        $('#lot-selector').on('change', function() {
            InspectionModel.setSelectedLot($(this).val());
        });
    },
    
    // Render defect list based on filters
    renderDefectList: function(categoryId = 0, searchQuery = '') {
        // Filter defects
        let filteredDefects = DefectModel.types;
        
        if (categoryId > 0) {
            filteredDefects = filteredDefects.filter(defect => defect.categoryId === categoryId);
        }
        
        if (searchQuery) {
            const term = searchQuery.toLowerCase();
            filteredDefects = filteredDefects.filter(
                defect => defect.id.toLowerCase().includes(term) || 
                          defect.name.toLowerCase().includes(term)
            );
        }
        
        // Generate HTML for defect list
        let defectsHtml = '';
        
        // Group by category if showing all
        if (categoryId === 0) {
            DefectModel.categories.forEach(category => {
                const categoryDefects = filteredDefects.filter(d => d.categoryId === category.id);
                
                if (categoryDefects.length > 0) {
                    defectsHtml += `<div class="col-12 mb-2"><h6 class="mt-2">${category.name}</h6></div>`;
                    
                    categoryDefects.forEach(defect => {
                        const severityClass = DefectModel.getSeverityClass(defect.severity);
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
            // Show just the filtered defects
            filteredDefects.forEach(defect => {
                const severityClass = DefectModel.getSeverityClass(defect.severity);
                defectsHtml += `
                    <div class="col-md-6 col-lg-4 mb-2">
                        <button type="button" class="btn btn-outline-primary w-100 text-start add-defect-btn ${severityClass}" data-id="${defect.id}">
                            <span class="badge bg-secondary">${defect.id}</span> ${defect.name}
                        </button>
                    </div>
                `;
            });
        }
        
        // If no results
        if (!defectsHtml) {
            defectsHtml = '<div class="col-12 text-center py-3"><em>ไม่พบข้อบกพร่องที่ตรงกับเงื่อนไข</em></div>';
        }
        
        $('#defect-list').html(defectsHtml);
        
        // Add click handlers to add defect buttons
        $('.add-defect-btn').on('click', function() {
            const defectId = $(this).data('id');
            if (InspectionModel.addDefect(defectId)) {
                InspectionForm.renderActiveDefects();
                AlertComponent.success(`เพิ่มข้อบกพร่อง ${$(this).text().trim()} แล้ว`, 2000);
            } else {
                AlertComponent.info('ข้อบกพร่องนี้ถูกเพิ่มไว้แล้ว', 2000);
            }
        });
    },
    
    // Render active defects in the table
    renderActiveDefects: function() {
        const activeDefects = InspectionModel.activeDefects;
        
        if (activeDefects.length === 0) {
            $('#active-defects').html('<tr><td colspan="7" class="text-center text-muted py-3">ยังไม่มีข้อบกพร่องที่เลือก กรุณาเลือกข้อบกพร่องจากรายการด้านบน</td></tr>');
            this.calculateDefectTotals();
            return;
        }
        
        const activeDefectsHtml = activeDefects.map(defect => {
            const severityClass = DefectModel.getSeverityClass(defect.severity);
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
        
        // Add event handlers for defect count inputs
        $('.defect-count-input').on('change', function() {
            const defectId = $(this).data('defect');
            const lot = $(this).data('lot');
            const count = parseInt($(this).val()) || 0;
            
            InspectionModel.updateDefectCount(defectId, lot, count);
            InspectionForm.calculateDefectTotals();
        });
        
        // Add event handlers for remove buttons
        $('.remove-defect-btn').on('click', function() {
            const defectId = $(this).data('defect');
            const defectName = InspectionModel.activeDefects.find(d => d.id === defectId)?.name || '';
            
            if (InspectionModel.removeDefect(defectId)) {
                InspectionForm.renderActiveDefects();
                AlertComponent.success(`ลบข้อบกพร่อง ${defectName} แล้ว`, 2000);
            }
        });
        
        // Calculate totals
        this.calculateDefectTotals();
    },
    
    // Calculate and display defect totals
    calculateDefectTotals: function() {
        const totals = InspectionModel.calculateDefectTotals();
        
        // Update the total displays
        for (let lot = 1; lot <= 4; lot++) {
            $(`#total-defects-${lot}`).text(totals[lot]);
        }
    },
    
    // Validate the form
    validateForm: function() {
        const formData = InspectionModel.collectFormData();
        const errors = VALIDATOR.validateForm(formData);
        
        if (errors.length > 0) {
            AlertComponent.showValidationErrors(errors);
            return false;
        }
        
        return true;
    },
    
    // Save draft version of the form
    saveDraft: function(isAutoSave = false) {
        // Check minimum requirements
        if (!VALIDATOR.validateMinimumRequirements(InspectionModel.collectFormData())) {
            if (!isAutoSave) {
                AlertComponent.warning('กรุณากรอกข้อมูลพื้นฐานอย่างน้อย Doc PT, วันที่ผลิต และ Item Number');
            }
            return false;
        }
        
        // If it's an auto-save, just save to localStorage
        if (isAutoSave) {
            FormComponent.saveFormStateToStorage();
            return true;
        }
        
        // Otherwise, do a full save to the server
        const formData = InspectionModel.collectFormData();
        formData.status = 'draft';
        
        $('#loading-overlay').css('display', 'flex');
        
        API.saveInspection(formData)
            .then(response => {
                if (response.status === 'success') {
                    // Update version
                    STATE.formVersion = response.version || (STATE.formVersion + 1);
                    
                    AlertComponent.success('บันทึกฉบับร่างเรียบร้อยแล้ว รหัสการตรวจสอบ: ' + response.id);
                    
                    // Clear localStorage
                    STATE.clearFormState();
                    
                    // Reset form dirty flag
                    STATE.setFormDirty(false);
                    
                    // Update last save time
                    STATE.lastSaveTime = new Date();
                    $('#last-save-time').text(STATE.lastSaveTime.toLocaleString('th-TH'));
                    $('#last-save-info').show();
                } else {
                    AlertComponent.error('เกิดข้อผิดพลาด: ' + response.message);
                }
            })
            .catch(error => {
                console.error('Error saving draft:', error);
                
                if (error.name === 'TimeoutError') {
                    AlertComponent.warning('การเชื่อมต่อหมดเวลา ข้อมูลถูกบันทึกในเครื่องชั่วคราว');
                    FormComponent.saveFormStateToStorage();
                } else if (error.status === 409) {
                    this.handleConcurrencyError();
                } else {
                    AlertComponent.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
                }
            })
            .finally(() => {
                $('#loading-overlay').hide();
                STATE.isSubmitting = false;
            });
            
        return true;
    },
    
    // Save form data to the server
    saveFormData: function() {
        const formData = InspectionModel.collectFormData();
        
        API.saveInspection(formData)
            .then(response => {
                if (response.status === 'success') {
                    // Update version
                    STATE.formVersion = response.version || (STATE.formVersion + 1);
                    
                    AlertComponent.success('บันทึกข้อมูลเรียบร้อยแล้ว');
                    
                    // Clear localStorage
                    STATE.clearFormState();
                    
                    // Reset form dirty flag
                    STATE.setFormDirty(false);
                    
                    // Show success screen
                    this.showSuccessScreen(response.id);
                } else {
                    AlertComponent.error('เกิดข้อผิดพลาด: ' + response.message);
                }
            })
            .catch(error => {
                console.error('Error saving data:', error);
                
                if (error.name === 'TimeoutError') {
                    AlertComponent.warning('การเชื่อมต่อหมดเวลา ข้อมูลถูกบันทึกในเครื่องชั่วคราว');
                    FormComponent.saveFormStateToStorage();
                } else if (error.status === 409) {
                    this.handleConcurrencyError();
                } else {
                    AlertComponent.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
                }
            })
            .finally(() => {
                $('#loading-overlay').hide();
                STATE.isSubmitting = false;
            });
    },
    
    // Handle concurrency error (when the record was modified by someone else)
    handleConcurrencyError: function() {
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
        
        // Show alert and add event handlers
        const alertBox = $(message);
        
        alertBox.find('.refresh-data-btn').on('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const inspectionId = urlParams.get('id');
            
            if (inspectionId) {
                this.loadExistingInspection(inspectionId);
            } else {
                location.reload();
            }
            
            alertBox.alert('close');
        });
        
        alertBox.find('.force-save-btn').on('click', () => {
            const formData = InspectionModel.collectFormData();
            formData.forceSave = true;
            
            $('#loading-overlay').css('display', 'flex');
            STATE.isSubmitting = true;
            
            API.saveInspection(formData)
                .then(response => {
                    if (response.status === 'success') {
                        STATE.formVersion = response.version || (STATE.formVersion + 1);
                        AlertComponent.success('บันทึกข้อมูลเรียบร้อยแล้ว');
                        this.showSuccessScreen(response.id);
                    } else {
                        AlertComponent.error('เกิดข้อผิดพลาด: ' + response.message);
                    }
                })
                .catch(error => {
                    AlertComponent.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
                })
                .finally(() => {
                    $('#loading-overlay').hide();
                    STATE.isSubmitting = false;
                });
            
            alertBox.alert('close');
        });
        
        $('#quality-form').prepend(alertBox);
    },
    
    // Show success screen after form submission
    showSuccessScreen: function(id) {
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
        
        $('#quality-form').html(successHtml);
        window.scrollTo(0, 0);
    },
    
    // Adjust layout based on screen size
    adjustLayoutForScreenSize: function() {
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            $('.table-responsive').addClass('mobile-enhanced');
            $('.defect-list-container').addClass('mobile-scrollable');
            $('.form-section').addClass('mobile-compact');
        } else {
            $('.table-responsive').removeClass('mobile-enhanced');
            $('.defect-list-container').removeClass('mobile-scrollable');
            $('.form-section').removeClass('mobile-compact');
        }
    },
    
    // Handle window resize
    handleResize: function() {
        InspectionForm.adjustLayoutForScreenSize();
    },
    
    // Handle browser's online status
    handleOnlineStatus: function() {
        AlertComponent.success('กลับมาออนไลน์แล้ว คุณสามารถบันทึกข้อมูลได้ตามปกติ', 3000);
        
        // Try to send any pending data
        if (STATE.isSubmitting) {
            InspectionForm.saveFormData();
        }
    },
    
    // Handle browser's offline status
    handleOfflineStatus: function() {
        AlertComponent.warning('คุณกำลังออฟไลน์ ข้อมูลจะถูกบันทึกในเครื่องชั่วคราว', 5000);
    },
    
    // Handle page unload event
    handleBeforeUnload: function(e) {
        if (STATE.isFormDirty) {
            // Save before leaving
            FormComponent.saveFormStateToStorage();
            
            // Show confirmation dialog
            const message = 'คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?';
            e.returnValue = message;
            return message;
        }
    }
};

// Export the InspectionForm
window.InspectionForm = InspectionForm;