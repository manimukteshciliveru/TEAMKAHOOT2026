// Test script to verify backend authentication is working
// Run this with: node test-auth.js

const axios = require('axios');

const API_URL = 'http://localhost:5000/api/auth';

async function testAuth() {
    console.log('🧪 Testing Authentication System...\n');

    // Test 1: Register a new user
    console.log('Test 1: Registering new user...');
    try {
        const registerRes = await axios.post(`${API_URL}/register`, {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('✅ Registration successful!');
        console.log('Token:', registerRes.data.token.substring(0, 20) + '...');
        console.log('Role:', registerRes.data.role);

        const token = registerRes.data.token;

        // Test 2: Get user info
        console.log('\nTest 2: Getting user info...');
        const meRes = await axios.get(`${API_URL}/me`, {
            headers: { 'x-auth-token': token }
        });
        console.log('✅ User info retrieved!');
        console.log('Username:', meRes.data.username);
        console.log('Email:', meRes.data.email);
        console.log('Role:', meRes.data.role);

        // Test 3: Login
        console.log('\nTest 3: Testing login...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('✅ Login successful!');
        console.log('Token:', loginRes.data.token.substring(0, 20) + '...');

        console.log('\n✅ All authentication tests passed!');
        console.log('\n📝 Backend is working correctly.');
        console.log('If you still can\'t login from the frontend, the issue is likely:');
        console.log('1. Frontend not running (check http://localhost:5173)');
        console.log('2. CORS issue (check browser console)');
        console.log('3. Network error (check if backend is on port 5000)');

    } catch (error) {
        console.error('❌ Test failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else if (error.request) {
            console.error('❌ No response from server!');
            console.error('Make sure the backend is running on http://localhost:5000');
        } else {
            console.error('Error:', error.message);
        }
    }
}

testAuth();
