// list-view.js - Controller for the inspection list page
const ListView = {
    // DataTable instance
    dataTable: null,
    
    // All inspections data
    allInspections: [],
    
    // Initialize the list view
    init: function() {
        // Check if we're on the list page
        if ($('#inspection-table').length === 0) return;
        
        // Set default date range
        this.setDefaultDateRange();
        
        // Load inspections
        this.loadInspections();
        
        // Add event listeners
        this.addEventListeners();
        
        console.log('List view initialized');
    },
    
    // Set default date range (current month)
    setDefaultDateRange: function() {
        const dateRange = UTILS.setDefaultDateRange();
        $('#date-range-start').val(dateRange.startDate);
        $('#date-range-end').val(dateRange.endDate);
    },
    
    // Load inspection data
    loadInspections: function() {
        $('#loading-overlay').show();
        
        API.getInspections()
            .then(response => {
                if (response.status === 'success') {
                    this.allInspections = response.data;
                    
                    // Populate machine filter
                    this.populateMachineFilter(this.allInspections);
                    
                    // Initialize DataTable
                    this.initializeDataTable(this.allInspections);
                    
                    // Update summary data
                    this.updateSummaryData(this.allInspections);
                } else {
                    AlertComponent.error(`เกิดข้อผิดพลาด: ${response.message}`);
                }
            })
            .catch(error => {
                console.error('Error loading inspections:', error);
                AlertComponent.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            })
            .finally(() => {
                $('#loading-overlay').hide();
            });
    },
    
    // Populate machine filter dropdown
    populateMachineFilter: function(inspections) {
        const machines = new Set();
        
        // Collect all unique machine numbers
        inspections.forEach(inspection => {
            if (inspection.machine_no) {
                machines.add(inspection.machine_no);
            }
        });
        
        // Sort machines alphabetically
        const sortedMachines = Array.from(machines).sort();
        
        // Add options to the dropdown
        sortedMachines.forEach(machine => {
            $('#machine-filter').append(`<option value="${machine}">${machine}</option>`);
        });
    },
    
    // Initialize DataTable
    initializeDataTable: function(data) {
        if (this.dataTable) {
            this.dataTable.destroy();
        }
        
        // Prepare data for the table
        const tableData = this.prepareTableData(data);
        
        // Initialize DataTable
        this.dataTable = $('#inspection-table').DataTable({
            data: tableData,
            columns: [
                { data: 'id' },
                { data: 'doc_pt' },
                { data: 'production_date' },
                { data: 'shift' },
                { data: 'item_number' },
                { data: 'machine_no' },
                { data: 'total_product' },
                { data: 'result' },
                { data: 'defects' },
                { data: 'created_at' },
                { data: 'actions' }
            ],
            order: [[0, 'desc']], // Sort by ID descending
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn btn-success',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5, 6, 7, 9]
                    },
                    title: 'รายการการตรวจสอบคุณภาพ Ocean Glass'
                },
                {
                    extend: 'csv',
                    text: '<i class="fas fa-file-csv"></i> CSV',
                    className: 'btn btn-info',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5, 6, 7, 9]
                    }
                },
                {
                    extend: 'print',
                    text: '<i class="fas fa-print"></i> พิมพ์',
                    className: 'btn btn-secondary',
                    exportOptions: {
                        columns: [0, 1, 2, 3, 4, 5, 6, 7, 9]
                    }
                }
            ],
            language: {
                "lengthMenu": "แสดง _MENU_ รายการต่อหน้า",
                "zeroRecords": "ไม่พบข้อมูล",
                "info": "แสดงหน้า _PAGE_ จาก _PAGES_",
                "infoEmpty": "ไม่มีข้อมูลที่แสดง",
                "infoFiltered": "(กรองจาก _MAX_ รายการทั้งหมด)",
                "search": "ค้นหา:",
                "paginate": {
                    "first": "หน้าแรก",
                    "last": "หน้าสุดท้าย",
                    "next": "ถัดไป",
                    "previous": "ก่อนหน้า"
                }
            }
        });
        
        // Add event listener for defect details
        $('#inspection-table tbody').on('click', '.defect-details-btn', event => {
            const id = $(event.currentTarget).data('id');
            this.showDefectDetails(id);
        });
    },
    
    // Prepare data for DataTable
    prepareTableData: function(inspections) {
        return inspections.map(inspection => {
            // Format dates
            const productionDate = new Date(inspection.production_date).toLocaleDateString('th-TH');
            const createdAt = new Date(inspection.created_at).toLocaleDateString('th-TH');
            
            // Format shift
            let shiftText;
            switch(inspection.shift) {
                case 'M': shiftText = 'M (เช้า)'; break;
                case 'A': shiftText = 'A (บ่าย)'; break;
                case 'N': shiftText = 'N (ดึก)'; break;
                default: shiftText = inspection.shift;
            }
            
            // Determine result status
            let resultText = 'รอผล';
            let resultClass = 'status-pending';
            
            if (typeof inspection.result !== 'undefined') {
                resultText = inspection.result === 'Accept' ? 'ผ่าน' : 'ไม่ผ่าน';
                resultClass = inspection.result === 'Accept' ? 'status-accept' : 'status-reject';
            }
            
            // Create action buttons
            const actions = `
                <a href="view.html?id=${inspection.id}" class="btn btn-sm btn-info" title="ดูรายละเอียด">
                    <i class="fas fa-eye"></i>
                </a>
                <a href="print.html?id=${inspection.id}" class="btn btn-sm btn-secondary" title="พิมพ์">
                    <i class="fas fa-print"></i>
                </a>
            `;
            
            // Create defect button
            const defects = `
                <button class="btn btn-sm btn-outline-warning defect-details-btn" data-id="${inspection.id}" title="ดูข้อบกพร่อง">
                    <i class="fas fa-exclamation-triangle"></i> แสดง
                </button>
            `;
            
            return {
                id: inspection.id,
                doc_pt: inspection.doc_pt,
                production_date: productionDate,
                shift: shiftText,
                item_number: inspection.item_number,
                machine_no: inspection.machine_no,
                total_product: inspection.total_product,
                result: `<span class="status-badge ${resultClass}">${resultText}</span>`,
                defects: defects,
                created_at: createdAt,
                actions: actions,
                // Raw data for filtering
                raw_production_date: inspection.production_date,
                raw_shift: inspection.shift,
                raw_machine: inspection.machine_no,
                raw_result: inspection.result
            };
        });
    },
    
    // Show defect details in modal
    showDefectDetails: function(id) {
        $('#loading-overlay').show();
        
        API.getInspection(id)
            .then(response => {
                if (response.status === 'success') {
                    this.renderDefectModalContent(response.data);
                    $('#defectModal').modal('show');
                } else {
                    AlertComponent.error(`เกิดข้อผิดพลาด: ${response.message}`);
                }
            })
            .catch(error => {
                console.error('Error loading defect details:', error);
                AlertComponent.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            })
            .finally(() => {
                $('#loading-overlay').hide();
            });
    },
    
    // Render defect modal content
    renderDefectModalContent: function(data) {
        let hasDefects = false;
        let modalContent = `
            <div class="mb-3">
                <h6>ข้อมูลทั่วไป</h6>
                <table class="table table-bordered">
                    <tr>
                        <th width="150">Doc PT</th>
                        <td>${data.doc_pt}</td>
                        <th width="150">วันที่ผลิต</th>
                        <td>${new Date(data.production_date).toLocaleDateString('th-TH')}</td>
                    </tr>
                    <tr>
                        <th>Item Number</th>
                        <td>${data.item_number}</td>
                        <th>Machine No</th>
                        <td>${data.machine_no}</td>
                    </tr>
                </table>
            </div>
        `;
        
        // Check if there are lots with defects
        if (data.lots && data.lots.length > 0) {
            const defectsByLot = {};
            
            data.lots.forEach(lot => {
                if (lot.defects && lot.defects.length > 0) {
                    hasDefects = true;
                    defectsByLot[lot.lot_number] = lot.defects;
                }
            });
            
            if (hasDefects) {
                modalContent += `<h6>รายการข้อบกพร่องที่พบ</h6>`;
                
                // Show defects by lot
                Object.keys(defectsByLot).forEach(lotNumber => {
                    const defects = defectsByLot[lotNumber];
                    
                    modalContent += `
                        <div class="mb-3">
                            <h6 class="text-primary">ล็อต: ${lotNumber}</h6>
                            <table class="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th width="40%">รหัสข้อบกพร่อง</th>
                                        <th width="30%">จำนวน</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    
                    defects.forEach(defect => {
                        modalContent += `
                            <tr>
                                <td>${defect.defect_code}</td>
                                <td>${defect.defect_count}</td>
                            </tr>
                        `;
                    });
                    
                    // Calculate total defects in this lot
                    const totalDefects = defects.reduce((sum, defect) => sum + parseInt(defect.defect_count), 0);
                    
                    modalContent += `
                                <tr class="table-secondary">
                                    <th>รวมทั้งหมด</th>
                                    <th>${totalDefects}</th>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                });
            } else {
                modalContent += `<div class="alert alert-info">ไม่พบข้อบกพร่องในการตรวจสอบนี้</div>`;
            }
        } else {
            modalContent += `<div class="alert alert-info">ไม่พบข้อมูลล็อตในการตรวจสอบนี้</div>`;
        }
        
        $('#defect-modal-content').html(modalContent);
    },
    
    // Update summary data
    updateSummaryData: function(inspections) {
        // Total inspections
        $('#total-inspections').text(inspections.length);
        
        // Accepted inspections
        const acceptCount = inspections.filter(item => item.result === 'Accept').length;
        $('#accept-inspections').text(acceptCount);
        
        // Rejected inspections
        const rejectCount = inspections.filter(item => item.result === 'Reject').length;
        $('#reject-inspections').text(rejectCount);
        
        // Today's inspections
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const todayCount = inspections.filter(item => item.created_at.startsWith(today)).length;
        $('#today-inspections').text(todayCount);
    },
    
    // Apply filters to table
    applyFilters: function() {
        $('#loading-overlay').show();
        
        // Get filter values
        const startDate = $('#date-range-start').val();
        const endDate = $('#date-range-end').val();
        const shift = $('#shift-filter').val();
        const machine = $('#machine-filter').val();
        const result = $('#result-filter').val();
        
        // Filter data
        let filteredData = this.allInspections;
        
        // Filter by date range
        if (startDate && endDate) {
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.production_date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59); // Set to end of day
                
                return itemDate >= start && itemDate <= end;
            });
        }
        
        // Filter by shift
        if (shift) {
            filteredData = filteredData.filter(item => item.shift === shift);
        }
        
        // Filter by machine
        if (machine) {
            filteredData = filteredData.filter(item => item.machine_no === machine);
        }
        
        // Filter by result
        if (result) {
            filteredData = filteredData.filter(item => item.result === result);
        }
        
        // Update table with filtered data
        this.updateTableWithFilteredData(filteredData);
        
        // Update summary with filtered data
        this.updateSummaryData(filteredData);
        
        $('#loading-overlay').hide();
    },
    
    // Update table with filtered data
    updateTableWithFilteredData: function(filteredData) {
        if (this.dataTable) {
            this.dataTable.clear();
            
            if (filteredData.length > 0) {
                const tableData = this.prepareTableData(filteredData);
                this.dataTable.rows.add(tableData);
            }
            
            this.dataTable.draw();
        }
    },
    
    // Add event listeners
    addEventListeners: function() {
        // Filter button click
        $('#filter-button').on('click', () => this.applyFilters());
    }
};

// Export the ListView
window.ListView = ListView;