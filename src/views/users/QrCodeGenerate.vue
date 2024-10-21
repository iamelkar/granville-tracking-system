<template>
  <div>
    <!-- Conditional rendering of sidebars based on role -->
    <SidebarNav v-if="userRole === 'admin'" />
    <UserSideNav v-else-if="userRole === 'resident'" />
    <SecuritySidebar v-else-if="userRole === 'security'" />

    <div class="main-content">
      <div class="qr-generator">
        <h2>Generate QR Code for non-resident entry</h2>

        <form @submit.prevent="generateQRCode">
          <div class="form-group">
            <label for="category">Category: </label>
            <select v-model="guestDetails.category" id="category" required>
              <option value="guest">Guest</option>
              <option value="worker">Worker</option>
            </select>
          </div>

          <div class="form-group">
            <label for="guestName">Guest Name:</label>
            <input type="text" v-model="guestDetails.name" id="guestName" required />
          </div>

          <!-- Upload Guest Image -->
          <div class="form-group">
            <label for="guestImage">Upload Image:</label>
            <input type="file" @change="uploadGuestImage" id="guestImage" accept="image/*" required />
          </div>

          <!-- Worker Confirmation -->
          <div v-if="guestDetails.category === 'worker'">
            <label>Is the worker alone or from a company?</label>
            <div>
              <label>
                <input type="radio" value="alone" v-model="guestDetails.workerStatus" /> Alone
              </label>
              <label>
                <input type="radio" value="group" v-model="guestDetails.workerStatus" /> Group
              </label>
            </div>

            <!-- Show manager and workers' info if group -->
            <div v-if="guestDetails.workerStatus === 'group'">
              <div class="form-group">
                <label for="managerName"> Manager: </label>
                <input type="text" v-model="guestDetails.managerName" id="managerName" required />
              </div>
              <div class="form-group">
                <label for="workerList">List of Workers:</label>
                <textarea v-model="guestDetails.workerList" id="workerList" placeholder="Worker names separated by commas" required></textarea>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="validityDuration">Validity Duration (in hours):</label>
            <input type="number" v-model="validityDuration" id="validityDuration" required />
          </div>

          <button type="submit">Generate QR Code</button>
        </form>

        <!-- Display QR Code -->
        <div v-if="qrCodeUrl" class="qr-code">
          <h3>QR Code for {{ guestDetails.name }} - {{ guestDetails.category }}</h3>
          <img :src="qrCodeUrl" alt="Generated QR Code" />

          <!-- Download button-->
          <a :href="qrCodeUrl" :download="guestDetails.name + '-QRCode.png'" class="download-button">
            Download QR Code
          </a>
        </div>

        <div class="manage-button-container">
          <button @click="navigateToQRCodeManagement">Manage Your QR Codes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SidebarNav from '@/components/SidebarNav.vue';
import UserSideNav from '@/components/user/UserSideNav.vue';
import SecuritySidebar from '@/components/securityComp/SecuritySidebar.vue';
import { db, storage } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import QRCode from 'qrcode';

export default {
  components: {
    SidebarNav,
    UserSideNav,
    SecuritySidebar,
  },
  data() {
    return {
      guestDetails: {
        category: '',
        name: '',
        workerStatus: '',
        managerName: '',
        workerList: '',
        imageUrl: '',
      },
      validityDuration: 1,
      qrCodeUrl: '',
      currentUser: null,
      userRole: '', // Store the current user's role
    };
  },
  async created() {
    await this.getUserRole(); // Fetch the user role on component creation
  },
  methods: {
    // Method to navigate to the QR Code Management page
    navigateToQRCodeManagement() {
      this.$router.push({ name: 'manage-qr' });
    },

    // Fetch user role from Firestore
    async getUserRole() {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error("User not logged in.");
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          this.userRole = userData.role; // Set the role to determine which sidebar to show
        } else {
          console.error("User data does not exist.");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    },

    // Upload guest Image to Firebase Storage
    async uploadGuestImage(event) {
      const file = event.target.files[0];
      if (file) {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          alert("You must be logged in to upload a file.");
          return;
        }

        const storageReference = storageRef(storage, `guestImages/${currentUser.uid}/${file.name}`);
        await uploadBytes(storageReference, file);
        this.guestDetails.imageUrl = await getDownloadURL(storageReference);
        console.log("Image uploaded:", this.guestDetails.imageUrl);
      }
    },

    // Function to generate the QR code and store guest info in Firestore
    async generateQRCode() {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Please log in to generate a QR code.");
        return;
      }

      try {
        // Fetch user data to confirm their role
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("User data:", userData);

          // Check if the user has the correct role
          if (
            userData.role === "resident" ||
            userData.role === "security" ||
            userData.role === "admin"
          ) {
            const expirationTime = new Date();
            expirationTime.setHours(expirationTime.getHours() + this.validityDuration);

            // Create a new document in 'guest_qrcodes' collection
            const qrCodeRef = await addDoc(collection(db, "guest_qrcodes"), {
              guestName: this.guestDetails.name,
              category: this.guestDetails.category,
              workerStatus: this.guestDetails.workerStatus,
              managerName: this.guestDetails.managerName,
              workerList: this.guestDetails.workerList,
              createdBy: currentUser.email,
              imageUrl: this.guestDetails.imageUrl,
              validityDuration: this.validityDuration,
              expirationTime: expirationTime,
              createdAt: serverTimestamp(),
            });

            // QR Code content - Embed the Firestore document ID
            const qrCodeData = `https://granville-tracking-system.com/view-qr/${qrCodeRef.id}`;

            this.qrCodeUrl = await QRCode.toDataURL(qrCodeData, { width: 300 });

            // Update Firestore with the generated QR code URL
            await updateDoc(doc(db, "guest_qrcodes", qrCodeRef.id), {
              qrCodeUrl: this.qrCodeUrl,
            });

            alert("QR Code generated and stored successfully!");
          } else {
            alert("You do not have permission to generate a QR code.");
          }
        } else {
          console.error("User document does not exist");
        }
      } catch (error) {
        console.error("Error generating QR code", error);
      }
    },
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
  
  .qr-generator {
    max-width: 500px;
    margin: auto;
    background-color: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
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

  .form-group input {
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
      margin-left: 200px; /* Adjust content margin accordingly */
    }
  }
  </style>
  