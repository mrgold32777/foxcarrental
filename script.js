const SUPABASE_URL = 'https://yzwfldypkwqndxjchgit.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2ZsZHlwa3dxbmR4amNoZ2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjA0OTUsImV4cCI6MjA2NDg5NjQ5NX0.i3HOii7L9mJ-cBZ2us3TRmS0-GI9bylHuLe9INAu4zY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('car-form');
const carsList = document.getElementById('cars-list');
const resetBtn = document.getElementById('reset-btn');
const statusMessage = document.getElementById('status-message');

const makeSelect = document.getElementById('make-select');
const modelSelect = document.getElementById('model-select');

// Login/Logout elements
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const authForm = document.getElementById('auth-form');
const authStatusMessage = document.getElementById('auth-status-message');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// Function to show status messages
function showStatus(message, isSuccess, target = statusMessage) {
  target.textContent = message;
  target.className = isSuccess ? 'status-message success' : 'status-message error';
  
  setTimeout(() => {
    target.style.opacity = '0';
    setTimeout(() => {
      target.className = 'status-message';
      target.style.opacity = '1';
    }, 300);
  }, 3000);
}

// Reset form function
resetBtn.addEventListener('click', () => {
  document.getElementById('car-id').value = '';
  form.reset();
  // Reset dropdowns explicitly
  makeSelect.value = '';
  modelSelect.innerHTML = '<option value="">Select Model</option>';
  modelSelect.disabled = true;
  showStatus('Form has been reset', true);
});

// Fetch Makes and populate dropdown
async function fetchMakes() {
  const { data, error } = await supabaseClient.from('veh_make').select('id, make').order('make', { ascending: true });
  
  if (error) {
    console.error('Error fetching makes:', error.message);
    showStatus('Error fetching makes: ' + error.message, false);
    return;
  }
  
  makeSelect.innerHTML = '<option value="">Select Make</option>';
  data.forEach(make => {
    const option = document.createElement('option');
    option.value = make.id;
    option.textContent = make.make;
    makeSelect.appendChild(option);
  });
}

// Fetch Models based on selected Make and populate dropdown
async function fetchModels(makeId) {
  modelSelect.innerHTML = '<option value="">Select Model</option>';
  modelSelect.disabled = true; // Disable until models are loaded or no make selected

  if (!makeId) {
    return;
  }

  const { data, error } = await supabaseClient.from('veh_model').select('id, model').eq('make_id', makeId).order('model', { ascending: true });
  
  if (error) {
    console.error('Error fetching models:', error.message);
    showStatus('Error fetching models: ' + error.message, false);
    return;
  }
  
  data.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.model;
    modelSelect.appendChild(option);
  });
  modelSelect.disabled = false;
}

// Event listener for Make selection
makeSelect.addEventListener('change', (e) => {
  const selectedMakeId = e.target.value;
  fetchModels(selectedMakeId);
});

// Fetch vehicles from Supabase
async function fetchUsers() {
  // Joining 'cars' with 'veh_make' and 'veh_model' to get names instead of IDs
  const { data, error } = await supabaseClient
    .from('cars')
    .select(`
      *,
      veh_make (make),
      veh_model (model)
    `)
    .order('id', { ascending: false });
  
  if (error) {
    // This error will likely happen if the user is not the admin UID
    showStatus('Error fetching vehicles: ' + error.message, false);
    carsList.innerHTML = `
      <tr>
        <td colspan="12"> <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Access denied or no vehicles found matching your permissions.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  carsList.innerHTML = '';
  
  if (data.length === 0) {
    carsList.innerHTML = `
      <tr>
        <td colspan="12"> <div class="empty-state">
            <i class="fas fa-car"></i>
            <p>No vehicles found. Add your first vehicle!</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  data.forEach(car => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${car.veh_make ? car.veh_make.make : 'N/A'}</td>
      <td>${car.veh_model ? car.veh_model.model : 'N/A'}</td>
      <td>${car.plate_number || 'N/A'}</td>
      <td>${car.year || 'N/A'}</td> 
      <td>${car.color || 'N/A'}</td>
      <td>${car.price ? `$${car.price.toFixed(2)}` : 'N/A'}</td>
      <td>${car.status || 'N/A'}</td>
      <td>${car.features || 'N/A'}</td>
      <td>${car.fuel !== null ? `${car.fuel}%` : 'N/A'}</td>
      <td>${car.odometer_km !== null ? `${car.odometer_km} km` : 'N/A'}</td> 
      <td>
        ${car.pic_url ? `<img src="${car.pic_url}" alt="Vehicle Image" style="width: 50px; height: auto; border-radius: 5px;">` : 'No Image'}
      </td>
      <td class="actions">
        <button class="btn-edit" onclick="populateForm(
          '${car.id}', 
          '${car.make_id || ''}', 
          '${car.model_id || ''}', 
          '${car.plate_number || ''}', 
          '${car.year || ''}', 
          '${car.color || ''}', 
          '${car.price || ''}', 
          '${car.status || ''}', 
          '${car.features || ''}', 
          '${car.fuel !== null ? car.fuel : ''}', 
          '${car.odometer_km !== null ? car.odometer_km : ''}',
          '${car.pic_url || ''}'
        )">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn-delete" onclick="deleteCar('${car.id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </td>
    `;
    carsList.appendChild(row);
  });
}

// Populate form for editing
window.populateForm = async function(id, make_id, model_id, plate_number, year, color, price, status, features, fuel, odometer_km, pic_url) {
  document.getElementById('car-id').value = id;
  
  // Populate Make dropdown and then Models based on existing make_id
  await fetchMakes(); // Re-fetch makes to ensure all options are available
  makeSelect.value = make_id;
  
  if (make_id) {
    await fetchModels(make_id); // Fetch models for the selected make
    modelSelect.value = model_id; // Set the model
  } else {
    modelSelect.innerHTML = '<option value="">Select Model</option>';
    modelSelect.disabled = true;
  }

  document.getElementById('plate_number').value = plate_number;
  document.getElementById('year').value = year; 
  document.getElementById('color').value = color;
  document.getElementById('price').value = price;
  document.getElementById('status').value = status;
  document.getElementById('features').value = features;
  document.getElementById('fuel').value = fuel; 
  document.getElementById('odometer_km').value = odometer_km; 
  document.getElementById('pic_url').value = pic_url;
  showStatus('Vehicle loaded for editing', true);
}

// Delete car function
window.deleteCar = async function(id) {
  if (!confirm('Are you sure you want to delete this vehicle?')) return;
  
  const { error } = await supabaseClient.from('cars').delete().eq('id', id);
  
  if (error) {
    showStatus('Error deleting vehicle: ' + error.message, false);
  } else {
    showStatus('Vehicle deleted successfully!', true);
    fetchUsers();
  }
}

// Submit form handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('car-id').value;
  const make_id = makeSelect.value;
  const model_id = modelSelect.value;
  const plate_number = document.getElementById('plate_number').value;
  const year = document.getElementById('year').value; 
  const color = document.getElementById('color').value;
  const price = parseFloat(document.getElementById('price').value);
  const status = document.getElementById('status').value;
  const features = document.getElementById('features').value;
  const fuel = parseFloat(document.getElementById('fuel').value); 
  const odometer_km = parseFloat(document.getElementById('odometer_km').value); 
  const pic_url = document.getElementById('pic_url').value;

  if (!make_id || !model_id) {
      showStatus('Please select both Make and Model.', false);
      return;
  }

  let result;
  const carData = { make_id, model_id, plate_number, year, color, price, status, features, fuel, odometer_km, pic_url };

  if (id) {
    result = await supabaseClient.from('cars').update(carData).eq('id', id);
  } else {
    result = await supabaseClient.from('cars').insert([carData]);
  }

  if (result.error) {
    showStatus('Error: ' + result.error.message, false);
  } else {
    showStatus(id ? 'Vehicle updated successfully!' : 'Vehicle added successfully!', true);
    form.reset();
    document.getElementById('car-id').value = '';
    makeSelect.value = ''; // Reset make dropdown
    modelSelect.innerHTML = '<option value="">Select Model</option>'; // Clear models
    modelSelect.disabled = true; // Disable model dropdown
    fetchUsers();
  }
});

// --- Authentication Logic ---

// Function to handle login
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    showStatus('Login Error: ' + error.message, false, authStatusMessage);
  } else {
    // Check if the logged-in user's UID matches the allowed admin UID
    const admin_uid = '3f39694d-b3a9-48ce-96dc-89a2b9aebc7f'; // The UID from your policy
    if (data.user && data.user.id === admin_uid) {
        showStatus('Login Successful!', true, authStatusMessage);
        toggleAdminPanel(true, data.user.email);
        fetchMakes(); // Populate makes on login
        fetchUsers(); // Fetch and display cars after login
    } else {
        showStatus('Unauthorized user. Please log in with the correct admin account.', false, authStatusMessage);
        await supabaseClient.auth.signOut(); // Log out unauthorized user
        toggleAdminPanel(false);
    }
  }
});

// Function to handle logout
logoutBtn.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showStatus('Logout Error: ' + error.message, false, statusMessage);
  } else {
    showStatus('Logged out successfully!', true, authStatusMessage);
    toggleAdminPanel(false);
    // Clear car list and form on logout
    carsList.innerHTML = '';
    form.reset();
    document.getElementById('car-id').value = '';
    makeSelect.value = '';
    modelSelect.innerHTML = '<option value="">Select Model</option>';
    modelSelect.disabled = true;
  }
});

// Function to show/hide admin panel and update user info
function toggleAdminPanel(loggedIn, userEmail = '') {
  if (loggedIn) {
    loginContainer.style.display = 'none';
    adminPanel.style.display = 'block';
    userEmailSpan.textContent = userEmail;
  } else {
    loginContainer.style.display = 'flex'; // Use flex to center login card
    adminPanel.style.display = 'none';
    userEmailSpan.textContent = '';
  }
}

// Check session on page load
async function checkSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (session && session.user && session.user.id === '3f39694d-b3a9-48ce-96dc-89a2b9aebc7f') {
    toggleAdminPanel(true, session.user.email);
    fetchMakes();
    fetchUsers();
  } else {
    toggleAdminPanel(false);
  }
}

// Initial check on load
checkSession();

// Listen for auth state changes
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, 'Session:', session);
    if (event === 'SIGNED_IN' && session && session.user.id === '3f39694d-b3a9-48ce-96dc-89a2b9aebc7f') {
        toggleAdminPanel(true, session.user.email);
        fetchMakes();
        fetchUsers();
    } else if (event === 'SIGNED_OUT') {
        toggleAdminPanel(false);
        // Clear data on sign out
        carsList.innerHTML = '';
        form.reset();
        document.getElementById('car-id').value = '';
        makeSelect.value = '';
        modelSelect.innerHTML = '<option value="">Select Model</option>';
        modelSelect.disabled = true;
    }
});