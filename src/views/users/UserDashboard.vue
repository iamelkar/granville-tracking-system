<template>
    <div>
      <!-- Fixed Sidebar on the left -->
      <UserSideNav/>
  
      <!-- Main content on the right -->
      <div class="main-content">
        <!-- <h1>THIS IS THE USER DASHBOARD</h1> -->
        <div class="container">
            <div class="dashboard-grid">
                <div class="profile">
                    <h2>My Profile 👤</h2>
                    <div class="profile-info">
                      <div class="profile-details">
                        <p><strong>Name:</strong> {{  user.firstName }} {{ user.lastName }}</p>
                        <p><strong>Address:</strong> {{ user.address }}</p>
                        <p><strong>Account created:</strong> {{ accountCreated }}</p>
                        <p><strong>Email:</strong> {{  user.email }}</p>
                      </div>
                    </div>
                </div>
                <br>
                <div class="system-alerts">
                    <h2>System Alerts ⚠️</h2>
                </div>
            </div>

            <div class="recent-activities">
                <h2>Recent Activity 📊</h2>
            </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import UserSideNav from '@/components/user/UserSideNav.vue';
  import { ref, onMounted } from 'vue';
  import { db } from '@/firebase';
  import { doc, getDoc } from 'firebase/firestore';
  import { getAuth, onAuthStateChanged } from 'firebase/auth';
  
  export default {
    components: {
      UserSideNav,
    },
    setup() {
      const user = ref({});
      const accountCreated = ref('');
      const auth = getAuth();
      const currentUser = auth.currentUser;
  
      const fetchUserProfile = async () => {
        if (currentUser) {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
  
          if (docSnap.exists()) {
            user.value = docSnap.data();
            accountCreated.value = new Date(user.value.createdAt.seconds * 1000).toLocaleDateString();
          }
        }
      };
  
      onMounted(() => {
        fetchUserProfile();
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

  .profile-info {
    display: flex; /* Flexbox to align items in a row */
    flex-direction: column; /* Stack items vertically */
    align-items: flex-start; /* Align items to the left */
    justify-content: center; /* Center content within the profile */
    padding: 10px; /* Padding for spacing inside the container */
  }

  .profile-details {
    background-color: white; /* White background for details */
    padding: 15px; /* Padding for a clean look */
    border-radius: 8px; /* Rounded corners */
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow for a card-like effect */
    width: 100%; /* Take full width inside profile */
    margin-top: 10px; /* Add space between the heading and details */
    text-align: left;
  }

  .profile-details p {
    margin: 8px 0; /* Space between paragraphs */
    font-size: 16px; /* Slightly larger font for readability */
  }

  .profile-details strong {
    font-weight: bold;
    color: #333; /* Darker color for strong labels */
  }

  .profile {
    padding: 20px;
    background-color: #f0f0f0; /* Light background for clarity */
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Add subtle shadow */
    height: auto; /* Let it adjust based on content */
    margin-bottom: 20px; /* Add space between profile and other elements */
  }

  h2 {
    display: flex;
    align-items: center; /* Center-align icon and text */
    font-size: 24px;
    margin-bottom: 15px; /* Space under the heading */
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
  