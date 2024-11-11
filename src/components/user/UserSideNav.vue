<template>
  <!-- Sidebar Toggle Button for Mobile -->
  <button ref="toggleButton" class="sidebar-toggle" @click="toggleSidebar">
    ☰
  </button>

  <div
    :class="['sidebar', { active: isSidebarVisible }]"
    ref="sidebar"
    @click.stop
  >
    <!-- Welcome message -->
    <div class="welcome">
      <h2>Welcome!</h2>
    </div>

    <!-- Navigation buttons -->
    <nav class="nav">
      <ul>
        <li>
          <router-link to="/user-dashboard">Dashboard</router-link>
        </li>
        <li>
          <router-link to="/generate-qr">QR Code Generate</router-link>
        </li>
        <li>
          <router-link to="/my-logs">My Logs</router-link>
        </li>
        <li>
          <router-link to="/my-guest-logs">Guest Logs</router-link>
        </li>
        <!-- <li>
          <router-link to="/user-notification">Notifications</router-link>
        </li> -->
        <li>
          <router-link to="/contact-us">Report</router-link>
        </li>
      </ul>
    </nav>

    <!-- Add new resident button -->
    <div class="log-out">
      <button @click="handleSignOut">Log Out</button>
    </div>
  </div>
</template>

<script>
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";

export default {
  // props: ['showSidebar'],
  setup() {
    const isSidebarVisible = ref(false);
    const sidebar = ref(null);
    const toggleButton = ref(null);
    const router = useRouter();

    const toggleSidebar = () => {
      isSidebarVisible.value = !isSidebarVisible.value;
      console.log("Toggled sidebar:", isSidebarVisible.value);

      // Add or remove the outside click event listener
      if (isSidebarVisible.value) {
        document.addEventListener("click", handleOutsideClick);
        console.log("Added outside click listener");
      } else {
        document.removeEventListener("click", handleOutsideClick);
        console.log("Removed outside click listener");
      }
    };

    // Handle clicks outside of the sidebar
    const handleOutsideClick = (event) => {
      console.log("Outside click detected");
      if (
        sidebar.value &&
        toggleButton.value &&
        !sidebar.value.contains(event.target) &&
        !toggleButton.value.contains(event.target)
      ) {
        console.log("Clicked outside the sidebar");
        isSidebarVisible.value = false;
        document.removeEventListener("click", handleOutsideClick);
        console.log("Sidebar closed");
      }
    };

    const handleSignOut = async () => {
      try {
        await signOut(auth);
        router.push({ name: "home" });
        console.log("Successful resident logout");
      } catch (error) {
        console.error("Error signing out:", error);
        alert(`Error signing out: ${error.message}`);
      }
    };

    onBeforeUnmount(() => {
      document.removeEventListener("click", handleOutsideClick);
      console.log("Cleaned up event listeners on unmount");
    });

    onMounted(() => {
      console.log("UserSideNav mounted");
    });

    return {
      isSidebarVisible,
      sidebar,
      toggleButton,
      toggleSidebar,
      handleSignOut,
    };
  },
};
</script>

<style scoped>
.sidebar {
  width: 300px;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  transition: transform 0.3s ease-in-out;
}

.sidebar.active {
  transform: translateX(0);
}

.sidebar-toggle {
  display: none;
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: #3498db;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
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
  background-color: skyblue;
  color: white;
  width: 100%;
  display: block;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 20px;
}

.log-out {
  margin-top: auto;
  text-align: center;
  padding: 0;
}

.log-out button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #e74c3c;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.log-out button:hover {
  background-color: #c0392b;
}

@media (max-width: 768px) {
  .sidebar-toggle {
    display: block;
  }
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.active {
    transform: translateX(0);
  }
}
</style>
