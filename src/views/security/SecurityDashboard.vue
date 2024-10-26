<template>
    <div>
      <!-- Fixed Sidebar on the left -->
      <SecuritySidebar/>
  
      <!-- Main content on the right -->
      <div class="main-content">
        <div class="container">
            <div class="dashboard-grid">
                <div class="profile">
                    <h2>My Profile 👤</h2>
                    <div class="profile-info">
                      <div class="profile-details">
                        <p><strong>Name:</strong> {{  user.firstName }} {{ user.lastName }}</p>
                        <p><strong>Role:</strong> {{  user.role }}</p>
                        <p><strong>Account created:</strong> {{ accountCreated }}</p>
                        <p><strong>Email:</strong> {{ user.email }}</p>
                      </div>
                    </div>
                </div>
                <br>
                <div class="system-alerts">
                    <h2>System Alerts</h2>
                    <span class="icon">⚠️</span>
                </div>
            </div>

            <div class="recent-activities">
                <h2>Gate Logs</h2>
                <span class="icon">📊</span>
            </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import SecuritySidebar from '@/components/securityComp/SecuritySidebar.vue'
  import { ref, onMounted } from 'vue';
  import { db } from '@/firebase';
  import { doc, getDoc } from 'firebase/firestore';
  import { getAuth, onAuthStateChanged } from 'firebase/auth';
  
  export default {
    components: { 
      SecuritySidebar,
    },
    setup() {
      const user = ref({});
      const accountCreated = ref('');
      const auth = getAuth();
  
      const fetchUserProfile = async (uid) => {
        if (uid) {
          const docRef = doc(db, 'users', uid);
          const docSnap = await getDoc(docRef);
  
          if (docSnap.exists()) {
            user.value = docSnap.data();
            // Convert Firestore timestamp to a readable date
            if (user.value.createdAt) {
              accountCreated.value = new Date(user.value.createdAt.seconds * 1000).toLocaleDateString();
            } else {
              accountCreated.value = "No creation date available";
            }
          } else {
            console.error('User document does not exist');
          }
        }
      };
  
      // Use onAuthStateChanged to detect authentication state changes
      onMounted(() => {
        onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            // Fetch the user profile once we confirm the user is authenticated
            fetchUserProfile(currentUser.uid);
          } else {
            console.error('No user is signed in');
          }
        });
      });
  
      return {
        user,
        accountCreated,
      };
    },
  };
  </script>
  
  
  <style>
  /* General reset to avoid padding/margin issues */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  /* Style for the container */
  body {
    font-family: Arial, sans-serif;
  }
  
  /* Sidebar styles */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 300px; /* Fixed width of the sidebar */
    height: 100vh; /* Full viewport height */
    background-color: #2c3e50;
    color: white;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 1000; /* Keeps the sidebar above the main content */
  }
  
  /* Main content area */
  .main-content {
    margin-left: 250px; /* Make room for the fixed sidebar */
    padding: 20px;
    background-color: #00bfa5;
    height:100vh;
  }
  
  h1 {
    font-size: 36px;
    color: #333;
  }
  
  /* Additional styling for responsiveness */
  @media (max-width: 768px) {
    .sidebar {
      width: 200px; /* Adjust sidebar width on smaller screens */
    }
  
    .main-content {
      margin-left: 200px; /* Adjust content margin accordingly */
    }
  }
  </style>
  