
const API_URL = 'https://booking-app-afzn.onrender.com/api';
let currentUser = null;
let authToken = null;
let allUsers = [];
let allDoctors = [];
let allAppointments = [];

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setMinDate();
});

function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('book-date');
  if (dateInput) {
    dateInput.min = today;
  }
}

// Auth functions
async function checkAuth() {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('currentUser');
  
  if (token && user) {
    authToken = token;
    currentUser = JSON.parse(user);
    showDashboard();
  }
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (response.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      closeModal('login-modal');
      document.getElementById('login-form').reset();
      showDashboard();
    } else {
      showError('login-error', data.error || 'Login failed');
    }
  } catch (err) {
    console.error('Login error:', err);
    showError('login-error', 'Connection error. Please try again.');
  }
}

async function signup(e) {
  e.preventDefault();
  const formData = {
    name: document.getElementById('signup-name').value,
    email: document.getElementById('signup-email').value,
    phone: document.getElementById('signup-phone').value,
    password: document.getElementById('signup-password').value,
    role: document.getElementById('signup-role').value
  };

  if (formData.role === 'doctor') {
    formData.specialization = document.getElementById('signup-specialization').value;
    formData.experience = document.getElementById('signup-experience').value;
    formData.bio = document.getElementById('signup-bio').value;
    formData.consultationFee = document.getElementById('signup-fee').value;
  }

  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    if (response.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      closeModal('signup-modal');
      document.getElementById('signup-form').reset();
      showDashboard();
    } else {
      showError('signup-error', data.error || 'Signup failed');
    }
  } catch (err) {
    console.error('Signup error:', err);
    showError('signup-error', 'Connection error. Please try again.');
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  document.getElementById('landing-page').classList.remove('hidden');
  document.getElementById('patient-dashboard').classList.add('hidden');
  document.getElementById('doctor-dashboard').classList.add('hidden');
  document.getElementById('admin-dashboard').classList.add('hidden');
  document.getElementById('nav-menu').classList.add('hidden');
  document.getElementById('auth-buttons').classList.remove('hidden');
}

function showDashboard() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('auth-buttons').classList.add('hidden');
  document.getElementById('nav-menu').classList.remove('hidden');
  document.getElementById('nav-menu').classList.add('flex');
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-role').textContent = currentUser.role.toUpperCase();

  if (currentUser.role === 'patient') {
    document.getElementById('patient-dashboard').classList.remove('hidden');
    loadPatientDashboard();
  } else if (currentUser.role === 'doctor') {
    document.getElementById('doctor-dashboard').classList.remove('hidden');
    loadDoctorDashboard();
  } else if (currentUser.role === 'admin') {
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadAdminDashboard();
  }
}

// Patient functions
async function loadPatientDashboard() {
  await loadProfile();
  await loadDoctors();
  await loadPatientAppointments();
}

async function loadProfile() {
  try {
    const response = await fetch(`${API_URL}/profile`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      const profileDiv = document.getElementById('profile-info');
      profileDiv.innerHTML = `
        <div>
          <p class="text-sm text-gray-600">Name</p>
          <p class="font-medium">${userData.name}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Email</p>
          <p class="font-medium">${userData.email}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Phone</p>
          <p class="font-medium">${userData.phone || 'Not provided'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Role</p>
          <p class="font-medium capitalize">${userData.role}</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Load profile error:', err);
  }
}

async function loadDoctors(specialization = '') {
  try {
    const url = specialization
      ? `${API_URL}/doctors?specialization=${encodeURIComponent(specialization)}`
      : `${API_URL}/doctors`;
    
    const response = await fetch(url);
    const doctors = await response.json();
    allDoctors = doctors;

    const doctorsDiv = document.getElementById('doctors-list');
    if (doctors.length === 0) {
      doctorsDiv.innerHTML = '<p class="text-gray-600 text-center col-span-full">No doctors found</p>';
      return;
    }

    doctorsDiv.innerHTML = doctors.map(doctor => `
      <div class="bg-white border border-gray-200 rounded-lg p-4 md:p-6 card-hover">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-base md:text-lg font-semibold text-gray-900">${doctor.name}</h3>
            <p class="text-xs md:text-sm text-blue-600 font-medium">${doctor.specialization}</p>
          </div>
          <div class="flex items-center">
            <span class="text-yellow-500">⭐</span>
            <span class="ml-1 text-sm font-medium">${doctor.rating || 0}</span>
          </div>
        </div>
        
        <div class="space-y-1 mb-3 text-xs md:text-sm">
          <p class="text-gray-600">📋 ${doctor.bio || 'No bio available'}</p>
          <p class="text-gray-600">🎓 ${doctor.experience} yrs exp</p>
          <p class="text-gray-600">💰 $${doctor.consultation_fee}</p>
          ${doctor.phone ? `<p class="text-gray-600">📞 ${doctor.phone}</p>` : ''}
          ${doctor.available_slots.length > 0 
            ? `<p class="text-gray-600">🗓️ Available Days: ${
                doctor.available_slots.map(slot => slot.day.slice(0,3)).join(', ')
              } (${doctor.available_slots[0].startTime}–${doctor.available_slots[0].endTime})</p>` 
            : ''}
        </div>
        
        <button
          onclick="showBookModal(${doctor.id}, '${doctor.name.replace(/'/g, "\\'")}')"
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          Book
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load doctors error:', err);
    showError('doctors-list', 'Failed to load doctors');
  }
}

function searchDoctors() {
  const specialization = document.getElementById('search-specialization').value.toLowerCase();
  
  if (!specialization) {
    const doctorsDiv = document.getElementById('doctors-list');
    doctorsDiv.innerHTML = allDoctors.map(doctor => `
      <div class="bg-white border border-gray-200 rounded-lg p-4 md:p-6 card-hover">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-base md:text-lg font-semibold text-gray-900">${doctor.name}</h3>
            <p class="text-xs md:text-sm text-blue-600 font-medium">${doctor.specialization}</p>
          </div>
          <div class="flex items-center">
            <span class="text-yellow-500">⭐</span>
            <span class="ml-1 text-sm font-medium">${doctor.rating || 0}</span>
          </div>
        </div>
        
        <div class="space-y-1 mb-3 text-xs md:text-sm">
          <p class="text-gray-600">📋 ${doctor.bio || 'No bio available'}</p>
          <p class="text-gray-600">🎓 ${doctor.experience} yrs exp</p>
          <p class="text-gray-600">💰 $${doctor.consultation_fee}</p>
          ${doctor.phone ? `<p class="text-gray-600">📞 ${doctor.phone}</p>` : ''}
          ${doctor.available_slots.length > 0 
            ? `<p class="text-gray-600">🗓️ Available Days: ${
                doctor.available_slots.map(slot => slot.day.slice(0,3)).join(', ')
              } (${doctor.available_slots[0].startTime}–${doctor.available_slots[0].endTime})</p>` 
            : ''}
        </div>
        
        <button
          onclick="showBookModal(${doctor.id}, '${doctor.name.replace(/'/g, "\\'")}')"
          class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          Book
        </button>
      </div>
    `).join('');
    return;
  }
  
  const filtered = allDoctors.filter(doctor => 
    doctor.specialization.toLowerCase().includes(specialization) ||
    doctor.name.toLowerCase().includes(specialization)
  );
  
  const doctorsDiv = document.getElementById('doctors-list');
  if (filtered.length === 0) {
    doctorsDiv.innerHTML = '<p class="text-gray-600 text-center col-span-full">No doctors found</p>';
    return;
  }
  
  doctorsDiv.innerHTML = filtered.map(doctor => `
    <div class="bg-white border border-gray-200 rounded-lg p-4 md:p-6 card-hover">
      <div class="flex items-start justify-between mb-3">
        <div>
          <h3 class="text-base md:text-lg font-semibold text-gray-900">${doctor.name}</h3>
          <p class="text-xs md:text-sm text-blue-600 font-medium">${doctor.specialization}</p>
        </div>
        <div class="flex items-center">
          <span class="text-yellow-500">⭐</span>
          <span class="ml-1 text-sm font-medium">${doctor.rating || 0}</span>
        </div>
      </div>
      
      <div class="space-y-1 mb-3 text-xs md:text-sm">
        <p class="text-gray-600">📋 ${doctor.bio || 'No bio available'}</p>
        <p class="text-gray-600">🎓 ${doctor.experience} yrs exp</p>
        <p class="text-gray-600">💰 $${doctor.consultation_fee}</p>
        ${doctor.phone ? `<p class="text-gray-600">📞 ${doctor.phone}</p>` : ''}
        ${doctor.available_slots.length > 0 
            ? `<p class="text-gray-600">🗓️ Available Days: ${
                doctor.available_slots.map(slot => slot.day.slice(0,3)).join(', ')
              } (${doctor.available_slots[0].startTime}–${doctor.available_slots[0].endTime})</p>` 
            : ''}
      </div>
      
      <button
        onclick="showBookModal(${doctor.id}, '${doctor.name.replace(/'/g, "\\'")}')"
        class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
      >
        Book
      </button>
    </div>
  `).join('');
}

async function loadPatientAppointments() {
  try {
    const response = await fetch(`${API_URL}/appointments`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const appointments = await response.json();

    const appointmentsDiv = document.getElementById('appointments-list');
    if (appointments.length === 0) {
      appointmentsDiv.innerHTML = '<p class="text-gray-600 text-center">No appointments yet</p>';
      return;
    }

    const now = new Date();
    const upcoming = appointments.filter(apt => new Date(apt.appointment_date) >= now);
    const past = appointments.filter(apt => new Date(apt.appointment_date) < now);

    appointmentsDiv.innerHTML = `
      ${upcoming.length > 0 ? `
        <h3 class="font-semibold text-lg mb-3">Upcoming</h3>
        ${upcoming.map(apt => renderPatientAppointment(apt)).join('')}
      ` : ''}
      
      ${past.length > 0 ? `
        <h3 class="font-semibold text-lg mb-3 mt-6">Past</h3>
        ${past.map(apt => renderPatientAppointment(apt)).join('')}
      ` : ''}
    `;
  } catch (err) {
    console.error('Load appointments error:', err);
  }
}

function renderPatientAppointment(apt) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    declined: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  const isPast = new Date(apt.appointment_date) < new Date();
  const canRate = isPast && apt.status === 'completed' && !apt.rating;

  return `
    <div class="border border-gray-200 rounded-lg p-4">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h4 class="font-semibold text-gray-900 text-sm md:text-base">${apt.doctor_name}</h4>
          <p class="text-xs md:text-sm text-gray-600">${apt.specialization}</p>
        </div>
        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}">
          ${apt.status.toUpperCase()}
        </span>
      </div>
      
      <div class="space-y-1 mb-3 text-xs md:text-sm">
        <p class="text-gray-700">📅 ${formatDate(apt.appointment_date)}</p>
        <p class="text-gray-700">🕒 ${formatTime(apt.appointment_time)}</p>
        ${apt.notes ? `<p class="text-gray-600">📝 ${apt.notes}</p>` : ''}
        ${apt.rating ? `<p class="text-yellow-600">⭐ Rated: ${apt.rating}/5</p>` : ''}
      </div>
      
      <div class="flex gap-2">
        ${apt.status === 'pending' ? `
          <button
            onclick="cancelAppointment(${apt.id})"
            class="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs md:text-sm font-medium"
          >
            Cancel
          </button>
        ` : ''}
        ${canRate ? `
          <button
            onclick="showRatingModal(${apt.id})"
            class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs md:text-sm font-medium"
          >
            Rate
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function showBookModal(doctorId, doctorName) {
  document.getElementById('book-doctor-id').value = doctorId;
  document.getElementById('book-doctor-name').value = doctorName;
  document.getElementById('book-date').value = '';
  document.getElementById('book-time').value = '';
  document.getElementById('book-notes').value = '';
  hideError('book-error');
  document.getElementById('book-modal').classList.remove('hidden');
}

async function bookAppointment(e) {
  e.preventDefault();
  const appointmentData = {
    doctorId: document.getElementById('book-doctor-id').value,
    appointmentDate: document.getElementById('book-date').value,
    appointmentTime: document.getElementById('book-time').value,
    notes: document.getElementById('book-notes').value
  };

  try {
    const response = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(appointmentData)
    });

    const data = await response.json();
    if (response.ok) {
      closeModal('book-modal');
      document.getElementById('book-form').reset();
      await loadPatientAppointments();
      showSuccess('Appointment booked successfully!');
    } else {
      showError('book-error', data.error || 'Failed to book appointment');
    }
  } catch (err) {
    console.error('Book appointment error:', err);
    showError('book-error', 'Connection error. Please try again.');
  }
}

async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;

  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'cancelled' })
    });

    if (response.ok) {
      await loadPatientAppointments();
      showSuccess('Appointment cancelled successfully');
    }
  } catch (err) {
    console.error('Cancel appointment error:', err);
    alert('Failed to cancel appointment');
  }
}

function showRatingModal(appointmentId) {
  document.getElementById('rating-appointment-id').value = appointmentId;
  document.getElementById('rating-value').value = '5';
  document.getElementById('rating-display').textContent = '5';
  hideError('rating-error');
  document.getElementById('rating-modal').classList.remove('hidden');
}

async function submitRating(e) {
  e.preventDefault();
  const appointmentId = document.getElementById('rating-appointment-id').value;
  const rating = document.getElementById('rating-value').value;

  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}/rate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ rating: parseInt(rating) })
    });

    if (response.ok) {
      closeModal('rating-modal');
      document.getElementById('rating-form').reset();
      await loadPatientAppointments();
      showSuccess('Rating submitted successfully!');
    } else {
      const data = await response.json();
      showError('rating-error', data.error || 'Failed to submit rating');
    }
  } catch (err) {
    console.error('Submit rating error:', err);
    showError('rating-error', 'Connection error. Please try again.');
  }
}

function updateRatingDisplay() {
  const value = document.getElementById('rating-value').value;
  document.getElementById('rating-display').textContent = value;
}

function showEditProfile() {
  document.getElementById('edit-name').value = currentUser.name;
  document.getElementById('edit-phone').value = currentUser.phone || '';
  hideError('edit-error');
  document.getElementById('edit-profile-modal').classList.remove('hidden');
}

async function updateProfile(e) {
  e.preventDefault();
  const profileData = {
    name: document.getElementById('edit-name').value,
    phone: document.getElementById('edit-phone').value
  };

  try {
    const response = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(profileData)
    });

    const data = await response.json();
    if (response.ok) {
      currentUser = data;
      localStorage.setItem('currentUser', JSON.stringify(data));
      closeModal('edit-profile-modal');
      document.getElementById('edit-profile-form').reset();
      await loadProfile();
      showSuccess('Profile updated successfully!');
    } else {
      showError('edit-error', data.error || 'Failed to update profile');
    }
  } catch (err) {
    console.error('Update profile error:', err);
    showError('edit-error', 'Connection error. Please try again.');
  }
}

// Doctor functions
async function loadDoctorDashboard() {
  await loadDoctorProfile();
  await loadDoctorAppointments();
}

async function loadDoctorProfile() {
  try {
    const response = await fetch(`${API_URL}/profile`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      const profileDiv = document.getElementById('doctor-profile-info');
      profileDiv.innerHTML = `
        <div>
          <p class="text-sm text-gray-600">Name</p>
          <p class="font-medium">${userData.name}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Email</p>
          <p class="font-medium">${userData.email}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Phone</p>
          <p class="font-medium">${userData.phone || 'Not provided'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Rating</p>
          <p class="font-medium">⭐ ${userData.rating}/5</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Specialization</p>
          <p class="font-medium">${userData.specialization}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Experience</p>
          <p class="font-medium">${userData.experience}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Consultation Fee</p>
          <p class="font-medium">${userData.consultation_fee}</p>
        </div>
      `;
      
      const profileDivBio = document.getElementById('doctor-profile-bio');
      profileDivBio.innerHTML = `
        <div>
          <p class="text-sm text-gray-600">Bio</p>
          <p>${userData.bio}</p>
        </div>
      `;

      if (userData.available_slots && userData.available_slots.length > 0) {
        // Set checkboxes for working days
        userData.available_slots.forEach(slot => {
          const checkbox = document.querySelector(`.day-checkbox[value="${slot.day}"]`);
          if (checkbox) checkbox.checked = true;
        });
        
        // Set time for first slot (assuming same time for all days)
        if (userData.available_slots[0].startTime) {
          document.getElementById('start-time').value = userData.available_slots[0].startTime;
        }
        if (userData.available_slots[0].endTime) {
          document.getElementById('end-time').value = userData.available_slots[0].endTime;
        }
      }
    }
  } catch (err) {
    console.error('Load doctor profile error:', err);
  }
}

async function saveAvailability() {
  const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked'))
    .map(cb => cb.value);
  const startTime = document.getElementById('start-time').value;
  const endTime = document.getElementById('end-time').value;

  if (selectedDays.length === 0) {
    alert('Please select at least one working day');
    return;
  }

  const availableSlots = selectedDays.map(day => ({
    day,
    startTime,
    endTime
  }));

  try {
    const response = await fetch(`${API_URL}/doctors/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ availableSlots })
    });

    if (response.ok) {
      showSuccess('Availability updated successfully!');
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to update availability');
    }
  } catch (err) {
    console.error('Save availability error:', err);
    alert('Connection error. Please try again.');
  }
}

async function loadDoctorAppointments() {
  try {
    const response = await fetch(`${API_URL}/appointments`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const appointments = await response.json();
    allAppointments = appointments;

    const appointmentsDiv = document.getElementById('doctor-appointments-list');
    if (appointments.length === 0) {
      appointmentsDiv.innerHTML = '<p class="text-gray-600 text-center">No appointments yet</p>';
      return;
    }

    const pending = appointments.filter(apt => apt.status === 'pending');
    const approved = appointments.filter(apt => apt.status === 'approved');
    const others = appointments.filter(apt => !['pending', 'approved'].includes(apt.status));

    appointmentsDiv.innerHTML = `
      ${pending.length > 0 ? `
        <h3 class="font-semibold text-lg mb-3">Pending Requests</h3>
        ${pending.map(apt => renderDoctorAppointment(apt)).join('')}
      ` : ''}
      
      ${approved.length > 0 ? `
        <h3 class="font-semibold text-lg mb-3 mt-6">Approved</h3>
        ${approved.map(apt => renderDoctorAppointment(apt)).join('')}
      ` : ''}
      
      ${others.length > 0 ? `
        <h3 class="font-semibold text-lg mb-3 mt-6">Other</h3>
        ${others.map(apt => renderDoctorAppointment(apt)).join('')}
      ` : ''}
    `;
  } catch (err) {
    console.error('Load doctor appointments error:', err);
  }
}

function searchDoctorAppointments() {
  const searchTerm = document.getElementById('doctor-search').value.toLowerCase();
  
  if (!searchTerm) {
    loadDoctorAppointments();
    return;
  }
  
  const filtered = allAppointments.filter(apt =>
    apt.patient_name.toLowerCase().includes(searchTerm) ||
    apt.patient_email.toLowerCase().includes(searchTerm) ||
    (apt.patient_phone && apt.patient_phone.includes(searchTerm))
  );
  
  const appointmentsDiv = document.getElementById('doctor-appointments-list');
  if (filtered.length === 0) {
    appointmentsDiv.innerHTML = '<p class="text-gray-600 text-center">No appointments found</p>';
    return;
  }
  
  appointmentsDiv.innerHTML = filtered.map(apt => renderDoctorAppointment(apt)).join('');
}

function renderDoctorAppointment(apt) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    declined: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  const isPast = new Date(apt.appointment_date) < new Date();
  const canComplete = apt.status === 'approved' && isPast;

  return `
    <div class="border border-gray-200 rounded-lg p-4">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h4 class="font-semibold text-gray-900 text-sm md:text-base">${apt.patient_name}</h4>
          <p class="text-xs md:text-sm text-gray-600">${apt.patient_email}</p>
          ${apt.patient_phone ? `<p class="text-xs md:text-sm text-gray-600">📞 ${apt.patient_phone}</p>` : ''}
        </div>
        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}">
          ${apt.status.toUpperCase()}
        </span>
      </div>
      
      <div class="space-y-1 mb-3 text-xs md:text-sm">
        <p class="text-gray-700">📅 ${formatDate(apt.appointment_date)}</p>
        <p class="text-gray-700">🕒 ${formatTime(apt.appointment_time)}</p>
        ${apt.notes ? `<p class="text-gray-600">📝 ${apt.notes}</p>` : ''}
        ${apt.rating ? `<p class="text-yellow-600">⭐ Rating: ${apt.rating}/5</p>` : ''}
      </div>
      
      ${apt.status === 'pending' ? `
        <div class="flex gap-2">
          <button
            onclick="updateAppointmentStatus(${apt.id}, 'approved')"
            class="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs md:text-sm font-medium"
          >
            Approve
          </button>
          <button
            onclick="updateAppointmentStatus(${apt.id}, 'declined')"
            class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs md:text-sm font-medium"
          >
            Decline
          </button>
        </div>
      ` : ''}
      ${canComplete ? `
        <button
          onclick="updateAppointmentStatus(${apt.id}, 'completed')"
          class="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs md:text-sm font-medium"
        >
          Mark as Completed
        </button>
      ` : ''}
    </div>
  `;
}

async function updateAppointmentStatus(appointmentId, status) {
  try {
    const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      await loadDoctorAppointments();
      showSuccess(`Appointment ${status} successfully!`);
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to update appointment');
    }
  } catch (err) {
    console.error('Update appointment status error:', err);
    alert('Failed to update appointment status');
  }
}

// Admin functions
async function loadAdminDashboard() {
  await loadAllUsers();
  await loadAdminAppointments();
}

async function loadAllUsers() {
  try {
    const response = await fetch(`${API_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    allUsers = await response.json();
    renderUsersTable(allUsers);
  } catch (err) {
    console.error('Load users error:', err);
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table');
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-600">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr class="hover:bg-gray-50">
      <td class="px-4 md:px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${user.name}</div>
        ${user.specialization ? `<div class="text-xs text-gray-500">${user.specialization}</div>` : ''}
      </td>
      <td class="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">${user.email}</td>
      <td class="px-4 md:px-6 py-4 whitespace-nowrap">
        <span class="px-2 py-1 text-xs font-medium rounded-full ${
          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
          user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'
        }">
          ${user.role.toUpperCase()}
        </span>
      </td>
      <td class="px-4 md:px-6 py-4 whitespace-nowrap">
        <span class="px-2 py-1 text-xs font-medium rounded-full ${
          user.is_blocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }">
          ${user.is_blocked ? 'BLOCKED' : 'ACTIVE'}
        </span>
      </td>
      <td class="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
        <button
          onclick="toggleUserBlock(${user.id}, ${!user.is_blocked})"
          class="px-3 py-1 ${
            user.is_blocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
          } rounded font-medium"
        >
          ${user.is_blocked ? 'Unblock' : 'Block'}
        </button>
      </td>
    </tr>
  `).join('');
}

function filterUsers() {
  const searchTerm = document.getElementById('admin-search').value.toLowerCase();
  
  if (!searchTerm) {
    renderUsersTable(allUsers);
    return;
  }
  
  const filtered = allUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm) ||
    user.email.toLowerCase().includes(searchTerm) ||
    (user.specialization && user.specialization.toLowerCase().includes(searchTerm))
  );
  renderUsersTable(filtered);
}

async function toggleUserBlock(userId, isBlocked) {
  try {
    const response = await fetch(`${API_URL}/admin/users/${userId}/block`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ isBlocked })
    });

    if (response.ok) {
      await loadAllUsers();
      showSuccess(`User ${isBlocked ? 'blocked' : 'unblocked'} successfully!`);
    }
  } catch (err) {
    console.error('Toggle user block error:', err);
    alert('Failed to update user status');
  }
}

async function loadAdminAppointments() {
  try {
    const response = await fetch(`${API_URL}/appointments`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const appointments = await response.json();
    allAppointments = appointments;

    const appointmentsDiv = document.getElementById('admin-appointments-list');
    if (appointments.length === 0) {
      appointmentsDiv.innerHTML = '<p class="text-gray-600 text-center">No appointments in the system</p>';
      return;
    }

    appointmentsDiv.innerHTML = appointments.map(apt => renderAdminAppointment(apt)).join('');
  } catch (err) {
    console.error('Load admin appointments error:', err);
  }
}

function searchAdminAppointments() {
  const searchTerm = document.getElementById('admin-appointments-search').value.toLowerCase();
  
  if (!searchTerm) {
    const appointmentsDiv = document.getElementById('admin-appointments-list');
    appointmentsDiv.innerHTML = allAppointments.map(apt => renderAdminAppointment(apt)).join('');
    return;
  }
  
  const filtered = allAppointments.filter(apt =>
    apt.patient_name.toLowerCase().includes(searchTerm) ||
    apt.patient_email.toLowerCase().includes(searchTerm) ||
    apt.doctor_name.toLowerCase().includes(searchTerm) ||
    apt.specialization.toLowerCase().includes(searchTerm)
  );
  
  const appointmentsDiv = document.getElementById('admin-appointments-list');
  if (filtered.length === 0) {
    appointmentsDiv.innerHTML = '<p class="text-gray-600 text-center">No appointments found</p>';
    return;
  }
  
  appointmentsDiv.innerHTML = filtered.map(apt => renderAdminAppointment(apt)).join('');
}

function renderAdminAppointment(apt) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    declined: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return `
    <div class="border border-gray-200 rounded-lg p-4">
      <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-500">PATIENT</p>
              <p class="font-semibold text-gray-900 text-sm">${apt.patient_name}</p>
              <p class="text-xs text-gray-600">${apt.patient_email}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">DOCTOR</p>
              <p class="font-semibold text-gray-900 text-sm">${apt.doctor_name}</p>
              <p class="text-xs text-gray-600">${apt.specialization}</p>
            </div>
          </div>
        </div>
        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}">
          ${apt.status.toUpperCase()}
        </span>
      </div>
      
      <div class="flex gap-4 text-xs md:text-sm text-gray-700">
        <span>📅 ${formatDate(apt.appointment_date)}</span>
        <span>🕒 ${formatTime(apt.appointment_time)}</span>
      </div>
      ${apt.rating ? `<p class="text-xs text-yellow-600 mt-2">⭐ Rating: ${apt.rating}/5</p>` : ''}
    </div>
  `;
}

// Utility functions
function showLogin() {
  hideError('login-error');
  document.getElementById('login-modal').classList.remove('hidden');
}

function showSignup() {
  hideError('signup-error');
  document.getElementById('signup-modal').classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function toggleDoctorFields() {
  const role = document.getElementById('signup-role').value;
  const doctorFields = document.getElementById('doctor-fields');
  if (role === 'doctor') {
    doctorFields.classList.remove('hidden');
  } else {
    doctorFields.classList.add('hidden');
  }
}

function showError(elementId, message) {
  const errorDiv = document.getElementById(elementId);
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
}

function hideError(elementId) {
  const errorDiv = document.getElementById(elementId);
  errorDiv.classList.add('hidden');
}

function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}