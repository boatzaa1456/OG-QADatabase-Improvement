// api.js - Handles all API communication
const API = {
    baseUrl: 'api/api.php',
    
    // Generic GET request
    get: async function(endpoint, params = {}) {
        try {
            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');
                
            const url = `${this.baseUrl}?action=${endpoint}${queryString ? '&' + queryString : ''}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },
    
    // Generic POST request
    post: async function(endpoint, data = {}) {
        try {
            const url = `${this.baseUrl}?action=${endpoint}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': STATE.getCsrfToken()
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    },
    
    // Specific API endpoints
    getInspection: async function(id) {
        return this.get('get_inspection', { id });
    },
    
    getInspections: async function(filters = {}) {
        return this.get('get_inspections', filters);
    },
    
    saveInspection: async function(data) {
        return this.post('save_inspection', data);
    }
};

// Export the API object
window.API = API;