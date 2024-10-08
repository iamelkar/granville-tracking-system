<template>
    <div>
      <!-- Fixed Sidebar on the left -->
      <SidebarNav />
  
      <!-- Main content on the right -->
      <div class="main-content">
        <!-- <h1>Admin Dashboard</h1> -->
  
        <!-- Container for the profile, system alerts, and recent activities -->
        <div class="container">
            <div class="dashboard-grid">
                <div class="profile">
                  <h2>Users 👤</h2>

                  <!-- Filter Dropdown -->
                  <div class="filter-container">
                    <label for="filter">Sort by:</label>
                    <select v-model="selectedFilter" @change="sortUsers" id="filter">
                      <option value="role">Role</option>
                      <option value="latest">Latest Created</option>
                      <option value="first">First Created</option>
                      <option value="alphabetical">Alphabetical</option>
                    </select>
                  </div>

                  <ul class="list">
                    <li v-for="user in users" :key="user.id">
                      <p class="info">{{ user.lastName }}, {{ user.firstName }} - {{ user.role }}</p>
                    </li>
                  </ul>
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
  import { db } from '@/firebase';
  import { collection, getDocs, onSnapshot } from 'firebase/firestore';
  import SidebarNav from '@/components/SidebarNav.vue';

  export default {
    components: {
      SidebarNav,
    },
    data() {
      return {
        users: [],
        selectedFilter: 'latest'
      };
    },
    computed:{
      sortedUsers(){
        return this.users
      }
    }, 
    async created() {
    // await this.fetchUsers();
    this.listenForUsers()
    this.sortUsers()
    },
    methods: {
      // async fetchUsers() {
      //   try {
      //     const querySnapshot = await getDocs(collection(db, 'users'));
      //     this.users = querySnapshot.docs.map((doc) => ({
      //       id: doc.id,
      //       ...doc.data(),
      //       createdAt: doc.data().createdAt || new Date(), // Fallback in case createdAt is missing
      //     }));
      //   } catch (error) {
      //     console.error('Error fetching users:', error);
      //   }
      // },

      listenForUsers(){
        const usersCollection = collection(db, 'users')
        onSnapshot(usersCollection, (snapshot) => {
          this.users = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt || new Date(), // Fallback in case createdAt is missing
          }))
          this.sortUsers()
        })
      },      
      sortUsers() {
        switch(this.selectedFilter){
          case 'latest':
            this.users.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
            break;
          case 'role':
            this.users.sort((a, b) => a.role.localeCompare(b.role))
            break;
          case 'first':
            this.users.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)
            break;
          case 'alphabetical':
            this.users.sort((a, b) => a.lastName.localeCompare(b.lastName))
            break;
          default:
            break;
        }
      }
    },
  };
  </script>
  
  <style>
  /* Reset styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
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
    margin-left: 340px; /* Adjust to match sidebar width */
    padding: 20px;
    background-color: #00bfa5;
    height: 100vh;
  }
  
  h1 {
    font-size: 36px;
    color: #333;
  }
  
  h2 {
    font-size: 20px;
    color: #333;
  }

  /* Container to wrap both sections */
.container {
    display: flex;
    justify-content: space-between;
    width: 100%; 
    height: 100%;/* Full height for layout purposes */
}

/* Dashboard grid for the left side */
.dashboard-grid {
    display: flex;
    flex-direction: column;
    width: 30%; /* Left side takes 30% of the width */
    margin-left: 50px;
}

/* Profile and system-alerts classes aligned in column */
.profile, .system-alerts {
    /* margin-bottom: 20px; Add some space between items */
    padding: 20px;
    background-color: #f0f0f0; /* Light background for clarity */
    border-radius: 8px;
    height: 100%;
}

/* Style the filter container */
.filter-container {
  margin-bottom: 15px;
}

.filter-container label {
  margin-right: 10px;
  font-weight: bold;
}

.filter-container select {
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.info {
  font-family: 'Georgia', 'Times New Roman', serif; /* Classy serif font */
  font-size: 18px; /* Slightly larger font size */
  font-weight: 500; /* Medium weight for better readability */
  color: #333; /* Dark gray color for a soft contrast */
  line-height: 1.6; /* Better line spacing for readability */
  margin-bottom: 10px; /* Space between paragraphs */
  text-transform: capitalize; /* Capitalize first letter of each word */
}


/* Style the user list */
.list {
  list-style: none; /* Remove default list style */
  padding-left: 0;
  margin-top: 20px;
  max-height: 300px; /* Limit the height of the list */
  overflow-y: auto; /* Add scrolling to the list itself */
}

/* Style individual list items */
.list li {
  padding: 10px;
  margin-bottom: 10px;
  background-color: #fff; /* Background for list items */
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Add a subtle shadow */
  transition: background-color 0.3s;
}

.list li:hover {
  background-color: #e0f7fa; /* Change background color on hover */
}

/* Recent activities to take the full right side */
.recent-activities {
    width: 70%; /* Right side takes 70% of the width */
    padding: 20px;
    background-color: #f0f0f0; /* Light background for clarity */
    border-radius: 8px;
    margin-left: 20px;
}
  </style>
  