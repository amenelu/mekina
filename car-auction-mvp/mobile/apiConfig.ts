/**
 * Centralized API configuration.
 */

// 1. Find your computer's local IP address.
//    - Windows: Open Command Prompt and type `ipconfig`. Look for the "IPv4 Address".
//    - macOS: Open Terminal and type `ifconfig`. Look for the "inet" address under `en0` or `en1`.
// 2. Make sure your mobile device or emulator is connected to the same Wi-Fi network.
// 3. Replace the IP address below with your computer's local IP.

const API_IP_ADDRESS = "192.168.100.9"; // <-- IMPORTANT: REPLACE THIS

const API_PORT = 5001;

export const API_BASE_URL = `http://${API_IP_ADDRESS}:${API_PORT}`;

// Example endpoint: `${API_BASE_URL}/api/all_listings`
