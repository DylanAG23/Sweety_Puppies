// Debugging script to isolate the API issue
// Save this as debug_citas_api.js and run it from the browser console

// Configuration
const API_URL = 'http://localhost:3000/api';
const DEBUG = true;

// Utility functions
function logMessage(message, type = 'info') {
  const styles = {
    info: 'color: #4b77be; font-weight: bold;',
    error: 'color: #e74c3c; font-weight: bold;',
    success: 'color: #27ae60; font-weight: bold;',
    warning: 'color: #f39c12; font-weight: bold;'
  };
  
  console.log(`%c[DEBUG] ${message}`, styles[type]);
}

// Test individual API endpoints
async function testEndpoint(endpoint, method = 'GET', body = null) {
  logMessage(`Testing endpoint: ${endpoint} with method: ${method}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}/${endpoint}`, options);
    const statusOk = response.ok;
    const statusCode = response.status;
    let responseData = null;
    
    try {
      responseData = await response.json();
    } catch (e) {
      logMessage(`Failed to parse JSON response: ${e.message}`, 'error');
    }
    
    return {
      success: statusOk,
      status: statusCode,
      data: responseData,
      endpoint
    };
  } catch (error) {
    logMessage(`Connection error for ${endpoint}: ${error.message}`, 'error');
    return {
      success: false,
      status: -1,
      error: error.message,
      endpoint
    };
  }
}

// Run tests on all relevant endpoints
async function runAPITests() {
  logMessage('Starting API endpoint tests...', 'info');
  
  // Test basic endpoints first to isolate issue
  const results = [];
  
  // Test server status
  results.push(await testEndpoint(''));
  
  // Test individual entity endpoints
  results.push(await testEndpoint('clientes'));
  results.push(await testEndpoint('mascotas'));
  results.push(await testEndpoint('servicios'));
  results.push(await testEndpoint('citas'));
  
  // Display test results
  logMessage('API Test Results:', 'info');
  results.forEach(result => {
    const statusText = result.success ? 'SUCCESS' : 'FAILED';
    const messageType = result.success ? 'success' : 'error';
    logMessage(`${result.endpoint}: ${statusText} (${result.status})`, messageType);
    
    if (DEBUG && result.data) {
      console.log('Response data sample:', result.data.length > 0 ? result.data[0] : result.data);
    }
    
    if (!result.success && result.error) {
      logMessage(`Error: ${result.error}`, 'error');
    }
  });
  
  // Check for database connection issues
  const allFailed = results.every(result => !result.success);
  if (allFailed) {
    logMessage('All endpoints failed - likely server or database connection issue', 'warning');
  }
  
  // Check specifically for citas issue
  const citasResult = results.find(r => r.endpoint === 'citas');
  if (citasResult && !citasResult.success) {
    if (citasResult.status === 500) {
      logMessage('Citas endpoint returning 500 - likely SQL query or database schema issue', 'warning');
    }
  }
  
  return results;
}

// Execute tests
runAPITests().then(results => {
  logMessage('API testing completed', 'info');
  
  // Provide troubleshooting guidance based on results
  const citasResult = results.find(r => r.endpoint === 'citas');
  if (citasResult && !citasResult.success) {
    logMessage('TROUBLESHOOTING STEPS FOR CITAS API:', 'warning');
    
    if (citasResult.status === -1) {
      logMessage('1. Verify the Express server is running on port 3000', 'info');
      logMessage('2. Check for CORS configuration issues', 'info');
      logMessage('3. Ensure network connectivity to the server', 'info');
    } else if (citasResult.status === 500) {
      logMessage('1. Check server logs for SQL errors', 'info');
      logMessage('2. Verify database connection is working', 'info');
      logMessage('3. Validate that the "citas" table exists and has the expected schema', 'info');
      logMessage('4. Check for JOIN issues in the SQL query in citas.js', 'info');
    } else if (citasResult.status === 404) {
      logMessage('1. Verify the route is correctly defined in citas.js', 'info');
      logMessage('2. Ensure the route is properly exported and imported in your main app', 'info');
    }
  }
});