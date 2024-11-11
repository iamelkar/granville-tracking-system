<template>
  <div>
    <!-- Sidebar Toggle Button for Mobile -->
    <button class="sidebar-toggle" @click="toggleSidebar">☰</button>

    <!-- Sidebar -->
    <div :class="['sidebar', { active: isSidebarVisible }]" @click.stop>
      <div class="welcome">
        <h2>Welcome!</h2>
      </div>

      <!-- Navigation buttons -->
      <nav class="nav">
        <ul>
          <!-- <li>
            <router-link to="/dashboard">Dashboard</router-link>
          </li> -->
          <li>
            <router-link to="/users-management">Users Management</router-link>
          </li>
          <li>
            <router-link to="/all-qr-codes">QR Codes</router-link>
          </li>
          <li>
            <router-link to="/security-logs">Resident Logs</router-link>
          </li>
          <li>
            <router-link to="/all-guest-logs">Guest Logs</router-link>
          </li>
          <li>
            <router-link to="/generate-qr">QR Code Generate</router-link>
          </li>
          <!-- <li>
            <router-link to="/system-management">System Management</router-link>
          </li> -->
        </ul>
      </nav>

      <!-- Add new resident button -->
      <div class="add-resident">
        <button @click="openModal" id="addRes">Add A New User</button>
        <br /><br />
        <button @click="handleSignOut">Log Out</button>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h2>Add New User</h2>
        <form @submit.prevent="addResident" class="modal-content">
          <div class="form-group">
            <label for="uid">User UID:</label>
            <input type="text" v-model="newResident.uid" id="uid" required />
          </div>

          <div class="form-group">
            <label for="firstName">First Name:</label>
            <input
              type="text"
              v-model="newResident.firstName"
              id="firstName"
              required
            />
          </div>
          <div class="form-group">
            <label for="lastName">Last Name:</label>
            <input
              type="text"
              v-model="newResident.lastName"
              id="lastName"
              required
            />
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input
              type="email"
              v-model="newResident.email"
              id="email"
              required
            />
          </div>
          <div class="form-group">
            <label for="role">Role:</label>
            <select v-model="newResident.role" id="role" required>
              <option value="resident">Resident</option>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <!-- Resident Specific Fields -->
          <div v-if="newResident.role === 'resident'">
            <!-- Address Fields -->
            <div class="form-group">
              <label for="phase">Phase:</label>
              <input
                type="text"
                v-model="newResident.phase"
                id="phase"
                required
              />
            </div>
            <div class="form-group">
              <label for="street">Street:</label>
              <input
                type="text"
                v-model="newResident.street"
                id="street"
                required
              />
            </div>
            <div class="form-group">
              <label for="houseLotNumber">House Lot & Block Number:</label>
              <input
                type="text"
                v-model="newResident.houseLotNumber"
                id="houseLotNumber"
                required
              />
            </div>

            <div class="form-group">
              <label for="contactNumber">Contact Number:</label>
              <input
                type="text"
                v-model="newResident.contactNumber"
                id="contactNumber"
                required
              />
            </div>

            <!-- RFID Tag Selection -->
            <div class="form-group">
              <label for="rfidTag">RFID Tag:</label>
              <select v-model="newResident.rfidTag" id="rfidTag" required>
                <option value="" disabled>Select an unassigned RFID tag</option>
                <option v-for="tag in rfidTags" :key="tag.id" :value="tag.tag">
                  {{ tag.tag }}
                </option>
              </select>
            </div>
          </div>

          <!-- Active Status -->
          <div class="form-group">
            <label for="activeStatus">Active Status:</label>
            <select
              v-model="newResident.activeStatus"
              id="activeStatus"
              required
            >
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
import { db, auth } from "@/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";

export default {
  name: "SidebarNav",
  data() {
    return {
      isSidebarVisible: false,
    };
  },
  methods: {
    toggleSidebar() {
      this.isSidebarVisible = !this.isSidebarVisible;
      if (this.isSidebarVisible) {
        document.addEventListener("click", this.handleOutsideClick);
      } else {
        document.removeEventListener("click", this.handleOutsideClick);
      }
    },
    handleOutsideClick(event) {
      const sidebar = this.$el.querySelector(".sidebar");
      const toggleButton = this.$el.querySelector(".sidebar-toggle");

      // Check if the click was outside the sidebar and toggle button
      if (
        !sidebar.contains(event.target) &&
        !toggleButton.contains(event.target)
      ) {
        this.isSidebarVisible = false;
        document.removeEventListener("click", this.handleOutsideClick);
      }
    },
  },
  beforeUnmount() {
    // Clean up the event listener when the component is unmounted
    document.removeEventListener("click", this.handleOutsideClick);
  },
  setup() {
    const showModal = ref(false);
    const rfidTags = ref([]);
    const unsubscribe = ref(null);
    const newResident = ref({
      uid: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "resident",
      phase: "",
      street: "",
      houseLotNumber: "",
      contactNumber: "",
      rfidTag: "",
      activeStatus: "true",
    });

    const router = useRouter();

    const openModal = () => {
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
    };

    const setupListener = () => {
      const unassignedTagsQuery = query(
        collection(db, "residents"),
        where("assigned", "==", false)
      );

      unsubscribe.value = onSnapshot(unassignedTagsQuery, (snapshot) => {
        rfidTags.value = snapshot.docs.map((doc) => ({
          id: doc.id,
          tag: doc.id,
        }));
      });
    };

    const cleanupListener = () => {
      if (unsubscribe.value) {
        unsubscribe.value();
        unsubscribe.value = null;
      }
    };

    // const fetchUnassignedRfidTags = async () => {
    //   const unassignedTagsQuery = query(
    //     collection(db, "residents"),
    //     where("assigned", "==", false)
    //   );

    //   const querySnapshot = await getDocs(unassignedTagsQuery);
    //   rfidTags.value = querySnapshot.docs.map((doc) => ({
    //     id: doc.id,
    //     tag: doc.id,
    //   }));
    // };

    const addResident = async () => {
      try {
        if (!newResident.value.uid) {
          alert("Please enter the UID for the new user.");
          return;
        }

        // Check if RFID tag already exists in the users collection
        const rfidQuery = query(
          collection(db, "users"),
          where("rfidTag", "==", newResident.value.rfidTag)
        );
        const rfidQuerySnapshot = await getDocs(rfidQuery);

        if (!rfidQuerySnapshot.empty) {
          alert(
            "This RFID tag is already assigned to another user. Please select a different RFID tag."
          );
          return; // Exit if the RFID tag is already in use
        }

        await setDoc(doc(db, "users", newResident.value.uid), {
          firstName: newResident.value.firstName,
          lastName: newResident.value.lastName,
          email: newResident.value.email,
          role: newResident.value.role,
          phase: newResident.value.phase,
          street: newResident.value.street,
          houseLotNumber: newResident.value.houseLotNumber,
          contactNumber: newResident.value.contactNumber,
          rfidTag: newResident.value.rfidTag,
          activeStatus: newResident.value.activeStatus === "true",
          createdAt: serverTimestamp(),
        });

        // Mark the RFID as assigned
        await updateDoc(doc(db, "residents", newResident.value.rfidTag), {
          assigned: true,
        });

        alert("User information added successfully!");

        // Refresh the page to clear the form
        window.location.reload();
      } catch (error) {
        console.error("Error adding user:", error);
        alert(`Error adding user: ${error.message}`);
      }
    };

    const handleSignOut = async () => {
      try {
        cleanupListener();
        await signOut(auth);
        router.push({ name: "home" });
        console.log("Successful sign out");
      } catch (error) {
        console.error("Error signing out:", error);
        alert(`Error signing out: ${error.message}`);
      }
    };

    onMounted(() => {
      setupListener();
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          cleanupListener();
        }
      });
    });

    onUnmounted(() => {
      cleanupListener();
    });

    return {
      showModal,
      newResident,
      rfidTags,
      openModal,
      closeModal,
      addResident,
      handleSignOut,
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
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  transition: transform 0.3s ease-in-out;
}

/* Sidebar Toggle Button */
.sidebar-toggle {
  display: none;
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: rgba(52, 152, 219, 0.4);
  color: rgba(255, 255, 255, 0.7);
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  z-index: 1100;
  transition: background-color 0.3s ease, color 0.3s ease;
  opacity: 0.8;
}

/* Hover and active state */
.sidebar-toggle:hover,
.sidebar-toggle:focus {
  background-color: rgba(52, 152, 219, 0.8);
  color: rgba(255, 255, 255, 1);
  opacity: 1;
}

/* Optional active state for when the button is clicked */
.sidebar-toggle:active {
  background-color: rgba(41, 128, 185, 0.9);
  color: white;
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
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
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

.car-plate-input {
  display: flex;
  gap: 5px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
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

/* Responsive Styles for Mobile Screens */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 250px;
  }

  .sidebar.active {
    transform: translateX(0);
  }

  .sidebar-toggle {
    display: block;
  }
}
</style>
