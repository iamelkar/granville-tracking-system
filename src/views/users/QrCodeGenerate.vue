<template>
  <div>
    <!-- Sidebar based on user role -->
    <SidebarNav v-if="userRole === 'admin'" />
    <UserSideNav v-else-if="userRole === 'resident'" />
    <SecuritySidebar v-else-if="userRole === 'security'" />

    <div class="main-content">
      <div class="qr-generator scrollable-container">
        <h2>Generate QR Code for non-resident entry</h2>

        <form @submit.prevent="generateQRCode">
          <div class="form-group">
            <label for="category">Category: </label>
            <select v-model="guestDetails.category" id="category" required>
              <option value="guest">Guest</option>
              <option value="worker">Worker</option>
              <option value="renter">Renter</option>
            </select>
          </div>

          <!-- Guest/Renter Options -->
          <div
            v-if="
              guestDetails.category === 'guest' ||
              guestDetails.category === 'renter' ||
              guestDetails.category === 'worker'
            "
          >
            <label>Entry Type:</label>
            <div>
              <label>
                <input
                  type="radio"
                  value="individual"
                  v-model="guestDetails.entryType"
                />
                Walk-in (Individual)
              </label>
              <label>
                <input
                  type="radio"
                  value="group"
                  v-model="guestDetails.entryType"
                />
                Car (Group)
              </label>
            </div>

            <!-- Individual Entry -->
            <div
              v-if="guestDetails.entryType === 'individual'"
              class="form-group"
            >
              <label for="guestName">Name:</label>
              <input
                type="text"
                v-model="guestDetails.guestName"
                id="guestName"
                required
              />
              <label for="individualImage">Upload Image:</label>
              <input
                type="file"
                @change="uploadImage('individual')"
                id="individualImage"
                accept="image/*"
                required
              />
            </div>

            <!-- Group Entry -->
            <div
              v-else-if="guestDetails.entryType === 'group'"
              class="form-group"
            >
              <label for="guestName">Guest Name (Main):</label>
              <input
                type="text"
                v-model="guestDetails.guestName"
                id="guestName"
                required
              />
              <label for="names">Names of Passengers (Separate by line):</label>
              <textarea
                v-model="guestDetails.names"
                id="names"
                placeholder="Enter one name per line"
                required
              ></textarea>
              <label for="driverImage">Upload Driver Image:</label>
              <input
                type="file"
                @change="uploadImage('driver')"
                id="driverImage"
                accept="image/*"
                required
              />
            </div>
          </div>

          <!-- Expiration Options -->
          <div class="form-group">
            <label>Set Expiration:</label>
            <div>
              <label>
                <input type="radio" value="duration" v-model="expirationType" />
                Set Validity Duration (in hours)
              </label>
              <label>
                <input type="radio" value="date" v-model="expirationType" />
                Set Start and End Date
              </label>
            </div>
          </div>

          <div v-if="expirationType === 'duration'" class="form-group">
            <label for="validityDuration">Validity Duration (in hours):</label>
            <input
              type="number"
              v-model="validityDuration"
              id="validityDuration"
              required
            />
          </div>

          <div v-if="expirationType === 'date'" class="form-group">
            <label for="startDate">Start Date:</label>
            <input
              type="datetime-local"
              v-model="startDate"
              id="startDate"
              required
            />
            <label for="endDate">End Date:</label>
            <input
              type="datetime-local"
              v-model="endDate"
              id="endDate"
              required
            />
          </div>

          <button type="submit">Generate QR Code</button>
        </form>

        <div v-if="qrCodeUrl" class="qr-code">
          <h3>
            QR Code for
            {{ guestDetails.guestName }}
            - {{ guestDetails.category }}
          </h3>
          <img :src="qrCodeUrl" alt="Generated QR Code" />
          <a
            :href="qrCodeUrl"
            :download="guestDetails.guestName + '-QRCode.png'"
            class="download-button"
          >
            Download QR Code
          </a>
        </div>

        <div class="manage-button-container">
          <button @click="navigateToQRCodeManagement">
            Manage Your QR Codes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SidebarNav from "@/components/SidebarNav.vue";
import UserSideNav from "@/components/user/UserSideNav.vue";
import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
import { db, storage } from "@/firebase";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import QRCode from "qrcode";

export default {
  components: { SidebarNav, UserSideNav, SecuritySidebar },
  data() {
    return {
      guestDetails: {
        category: "",
        entryType: "",
        guestName: "", // Main guest name for both individual and group entries
        names: "", // Passenger names for group entries only
        imageUrl: "", // Image URL for driver or individual
      },
      validityDuration: 1,
      qrCodeUrl: "",
      userRole: "",
      creatorName: "",
      expirationType: "duration",
      startDate: "",
      endDate: "",
    };
  },
  async created() {
    await this.getUserRole();
  },
  methods: {
    navigateToQRCodeManagement() {
      this.$router.push({ name: "manage-qr" });
    },
    async getUserRole() {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) return;

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          this.userRole = userData.role;
          this.creatorName = `${userData.firstName} ${userData.lastName}`;
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    },
    async uploadImage(type) {
      const file = event.target.files[0];
      if (file) {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const storageReference = storageRef(
          storage,
          `guestImages/${currentUser.uid}/${file.name}`
        );
        await uploadBytes(storageReference, file);
        this.guestDetails.imageUrl = await getDownloadURL(storageReference);
      }
    },
    async generateQRCode() {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) return;

      try {
        const expirationTime =
          this.expirationType === "duration"
            ? new Date(
                new Date().getTime() + this.validityDuration * 60 * 60 * 1000
              )
            : new Date(this.endDate);

        const names =
          this.guestDetails.entryType === "group"
            ? this.guestDetails.names.split("\n")
            : null;

        const qrCodeRef = await addDoc(collection(db, "guest_qrcodes"), {
          guestName: this.guestDetails.guestName, // Unified guest name for individual and main group name
          names,
          category: this.guestDetails.category,
          entryType: this.guestDetails.entryType,
          createdBy: currentUser.email,
          creatorName: this.creatorName,
          imageUrl: this.guestDetails.imageUrl,
          expirationTime,
          startDate:
            this.expirationType === "date" ? new Date(this.startDate) : null,
          createdAt: serverTimestamp(),
        });

        const qrCodeData = `localhost:8080/view-qr/${qrCodeRef.id}`;
        this.qrCodeUrl = await QRCode.toDataURL(qrCodeData, { width: 300 });

        await updateDoc(doc(db, "guest_qrcodes", qrCodeRef.id), {
          qrCodeUrl: this.qrCodeUrl,
        });

        alert("QR Code generated and stored successfully!");
      } catch (error) {
        console.error("Error generating QR code", error);
      }
    },
  },
};
</script>

<style scoped>
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
  height: 100vh;
  overflow: hidden;
}

.qr-generator {
  max-width: 500px;
  height: 85vh;
  margin: auto;
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.scrollable-container {
  overflow-y: auto;
  max-height: 100%;
  padding-right: 10px;
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
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #3498db;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

button:hover {
  background-color: #2980b9;
}

.manage-button-container {
  margin-top: 20px;
}

.manage-button-container button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.manage-button-container button:hover {
  background-color: #27ae60;
}

.qr-code img {
  margin-top: 20px;
  width: 300px;
  height: 300px;
}
/* Additional styling for responsiveness */
@media (max-width: 768px) {
  .sidebar {
    width: 200px; /* Adjust sidebar width on smaller screens */
  }

  .main-content {
    margin-left: 0px;
    width: 100%;
  }
}
</style>
