<template>
  <div>
    <div class="sidebar" @click.self="closeSidebar">
      <!-- Welcome message -->
      <div class="welcome">
        <h2>Welcome!</h2>
      </div>
  
      <!-- Navigation buttons -->
      <nav class="nav">
        <ul>
          <li>
            <router-link to="/dashboard">Dashboard</router-link>
          </li>
          <li>
            <router-link to="/users-management">Users Management</router-link>
          </li>
          <li>
            <router-link to="/security-logs">Security Logs</router-link>
          </li>
          <li>
            <router-link to="/system-management">System Management</router-link>
          </li>
        </ul>
      </nav>
  
      <!-- Add new resident button -->
      <div class="add-resident">
        <button @click="openModal" id="addRes">Add A New User</button>
        <br><br>
        <button @click="handleSignOut">Log Out</button>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h2>Add New User</h2>
        <form @submit.prevent="addResident">
          <div class="form-group">
            <label for="firstName">First Name:</label>
            <input type="text" v-model="newResident.firstName" id="firstName" required />
          </div>
          <div class="form-group">
            <label for="lastName">Last Name:</label>
            <input type="text" v-model="newResident.lastName" id="lastName" required />
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" v-model="newResident.email" id="email" required />
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" v-model="newResident.password" id="password" required />
          </div>
          <div class="form-group">
            <label for="role">Role:</label>
            <select v-model="newResident.role" id="role" required>
              <option value="resident">Resident</option>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div v-if="newResident.role === 'resident'">
            <div class="form-group">
              <label for="address">Address:</label>
              <input type="text" v-model="newResident.address" id="address" required />
            </div>
            <div class="form-group">
              <label for="rfidTag">RFID Tag:</label>
              <input type="text" v-model="newResident.rfidTag" id="rfidTag" />
            </div>
          </div>
          <div class="form-group">
            <label for="activeStatus">Active Status:</label>
            <select v-model="newResident.activeStatus" id="activeStatus" required>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit">Add User</button>
            <button type="button" @click="closeModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { db, auth } from '@/firebase';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'SidebarNav',
  setup() {
    const showModal = ref(false);
    const newResident = ref({
      firstName: '',
      lastName: '',
      email: '', // Add email field
      password: '', // Add password field
      role: 'resident', // Default role
      address: '',
      rfidTag: '',
      activeStatus: 'true'
    });

    const router = useRouter();

    const openModal = () => {
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
    };

    const addResident = async () => {
      try { 
        if (newResident.value.rfidTag) {
          const rfidQuery = query(
            collection(db, 'users'),
            where('rfidTag', '==', newResident.value.rfidTag)
          );

          const querySnapshot = await getDocs(rfidQuery);

          if (!querySnapshot.empty) {
            alert('This RFID tag is already in use. Please use a different RFID tag.');
            return;
          }
        }

        // const auth = getAuth();
        const currentEmail = auth.currentUser.email
        const adminPassword = prompt("Please re-enter your password to continue")

        if(!adminPassword){
          throw new Error("Admin password is required to add a new user.")
        }

        // Create the new user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          newResident.value.email,
          newResident.value.password
        );

        const user = userCredential.user;

        // Store additional user information in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          firstName: newResident.value.firstName,
          lastName: newResident.value.lastName,
          email: newResident.value.email,
          role: newResident.value.role,
          address: newResident.value.role === 'resident' ? newResident.value.address : '',
          rfidTag: newResident.value.role === 'resident' ? newResident.value.rfidTag : '',
          activeStatus: newResident.value.activeStatus === 'true',
          createdAt: serverTimestamp(), // Use Firestore server timestamp for createdAt
        });

        alert('User added successfully!');

        // Sign out the new user
        await auth.signOut()

        // Re-authenticate the admin
        await signInWithEmailAndPassword(auth, currentEmail, adminPassword)
        console.log('admin re-authenticated')

        closeModal();
      } catch (error) {
        console.error('Error adding user:', error);
        alert(`Error adding user: ${error.message}`)
      }
    };

    const handleSignOut = async () => {
      try{
        await signOut(auth)
        router.push({ name: 'home' });
      } catch(error){
        console.error('Error signing out:', error);
        alert(`Error signing out: ${error.message}`);
      }
    };

    return {
      showModal,
      newResident,
      openModal,
      closeModal,
      addResident,
      handleSignOut
    };
  },
};
</script>

<style scoped>
/* Sidebar styles remain the same as before */
.sidebar {
  width: 300px;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 20px;
  align-items: center;
}

.welcome {
  margin-bottom: 30px;
  text-align: center;
  font-size: 30px;
}

.nav {
  margin: 0;
  padding: 0;
}

.nav ul {
  list-style-type: none;
  padding: 0;
}

.nav li {
  margin: 15px 0;
  padding-top: 15px;
  width: 100%;
}

.nav li a {
  color: white;
  text-decoration: none;
  font-size: 16px;
  padding: 20px;
}

.nav li a:hover {
  text-decoration: underline;
}

.nav a.router-link-exact-active {
  background-color: skyblue; /* Active background color */
  color: white; /* Active text color */
  width: 100%; /* Ensure the link fills the entire li */
  display: block; /* Block ensures the link takes full width */
  padding: 10px; /* Keep padding consistent */
  box-sizing: border-box; /* Include padding in width calculation */
  border-radius: 20px;
}

.add-resident {
  margin-top: auto;
  text-align: center;
  padding: 0;
}

#addRes {
  background: blue;
}

.add-resident button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #e74c3c;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.add-resident button:hover {
  background-color: #c0392b;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 100%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
}

.form-actions button {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.form-actions button:first-of-type {
  background-color: #3498db;
  color: white;
}

.form-actions button:last-of-type {
  background-color: #e74c3c;
  color: white;
}
</style>
