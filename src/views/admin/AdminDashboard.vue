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
                    <h2>Residents</h2>
                    <span class="icon">👤</span>
                </div>
                <br>
                <div class="system-alerts">
                    <h2>System Alerts</h2>
                    <span class="icon">⚠️</span>
                </div>
            </div>

            <div class="recent-activities">
                <h2>Recent Activity</h2>
                <span class="icon">📊</span>
            </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  // Importing SidebarNav component
  import SidebarNav from '@/components/SidebarNav.vue';
  
  export default {
    components: { 
      SidebarNav
    }
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
    font-size: 24px;
    color: #333;
  }
  
  .icon {
    font-size: 20px;
    margin-top: 10px;
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

/* Recent activities to take the full right side */
.recent-activities {
    width: 70%; /* Right side takes 70% of the width */
    padding: 20px;
    background-color: #f0f0f0; /* Light background for clarity */
    border-radius: 8px;
    margin-left: 20px;
}
  </style>
  