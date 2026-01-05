// auth.js - Uses API_URL from state.js (loaded first)

async function handleLogin(username, password) {
    if (!username || !password) return showLoginError('Please enter username and password.');

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) return showLoginError(data.error || 'Login failed');

        STATE.currentUser = data;
        localStorage.setItem('currentUser', JSON.stringify(STATE.currentUser));
        redirectByRole(STATE.currentUser.role);
    } catch (err) {
        showLoginError('Cannot connect to server. Make sure backend is running on port 3001.');
        console.error(err);
    }
}

async function handleRegister(form) {
    const name = form.name?.value?.trim();
    const username = form.username?.value?.trim();
    const password = form.password?.value;
    const confirmPassword = form.confirmPassword?.value;

    if (!name || !username || !password) return showLoginError('All fields are required.');
    if (password !== confirmPassword) return showLoginError('Passwords do not match.');
    if (password.length < 6) return showLoginError('Password must be at least 6 characters.');

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, name })
        });
        const data = await res.json();
        if (!res.ok) return showLoginError(data.error || 'Registration failed');

        STATE.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(STATE.currentUser));
        redirectByRole('buyer');
    } catch (err) {
        showLoginError('Cannot connect to server. Make sure backend is running on port 3001.');
        console.error(err);
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError') || document.getElementById('registerError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
    console.error(message);
}

function redirectByRole(role) {
    if (role === 'employee') {
        window.location.href = '../Frontend/employee.html';
    } else if (role === 'guest') {
        window.location.href = '../Frontend/guest.html';
    } else {
        window.location.href = '../Frontend/buyer.html';
    }
}