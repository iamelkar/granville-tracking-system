<template>
    <div>
      <UserSideNav />
  
      <div class="main-content">
        <h2>Your Generated QR Codes</h2>
  
        <div v-if="qrCodes.length === 0">
          <p>You have not generated any QR codes yet.</p>
        </div>
  
        <div v-else>
          <table class="qr-codes-table">
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Category</th>
                <th>Expiration Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(qrCode, index) in qrCodes" :key="index">
                <td>
                <!-- Make the guest name clickable to view the QR code -->
                <a href="#" @click.prevent="viewQRCode(qrCode)">
                    {{ qrCode.guestName }}
                </a>
                </td>
                <td>{{ qrCode.category }}</td>
                <td>{{ new Date(qrCode.expirationTime.seconds * 1000).toLocaleString() }}</td>
                <td>
                  <button @click="openEditModal(qrCode)">Edit</button>
                  <button @click="deleteQRCode(qrCode.id)" class="delete-button">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <!-- Edit Modal -->
        <div v-if="showEditModal" class="modal-overlay">
          <div class="modal">
            <h3>Edit QR Code</h3>
            <form @submit.prevent="updateQRCode">
              <div class="form-group">
                <label for="guestName">Guest Name:</label>
                <input type="text" v-model="selectedQRCode.guestName" id="guestName" required />
              </div>
  
              <div class="form-group">
                <label for="category">Category:</label>
                <select v-model="selectedQRCode.category" id="category" required>
                  <option value="guest">Guest</option>
                  <option value="worker">Worker</option>
                </select>
              </div>
  
              <div class="form-group">
                <label for="validityDuration">Validity Duration (hours):</label>
                <input type="number" v-model="selectedQRCode.validityDuration" id="validityDuration" required />
              </div>
  
              <div class="form-actions">
                <button type="submit">Save</button>
                <button type="button" @click="closeEditModal">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- QR Code Modal -->
        <div v-if="showQRCodeModal" class="modal-overlay">
            <div class="modal">
                <h3>QR Code for {{ selectedQRCode.guestName }}</h3>
                <img :src="selectedQRCode.qrCodeUrl" alt="Generated QR Code" />
                <div class="modal-actions">
                    <a :href="selectedQRCode.qrCodeUrl" :download="selectedQRCode.guestName + '-QRCode.png'" class="download-button">
                    Download QR Code
                    </a>
                    <button @click="closeQRCodeModal">Close</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import UserSideNav from '@/components/user/UserSideNav.vue';
  import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
  import { db } from '@/firebase'; // Firestore setup
  import { getAuth } from 'firebase/auth';
  
  export default {
    components: { UserSideNav },
    data() {
      return {
        qrCodes: [], // List of QR codes fetched from Firestore
        showEditModal: false,
        selectedQRCode: null, // QR code selected for editing
        showQRCodeModal: false
      };
    },
    async created() {
      await this.fetchUserQRCodes();
    },
    methods: {
      async fetchUserQRCodes() {
        const auth = getAuth();
        const currentUser = auth.currentUser;
  
        if (!currentUser) {
          alert('Please log in to view your QR codes.');
          return;
        }
  
        try {
          // Fetch all QR codes created by the logged-in user
          const q = query(
            collection(db, 'guest_qrcodes'),
            where('createdBy', '==', currentUser.email) // Filter by the logged-in user's email
          );
  
          const querySnapshot = await getDocs(q);
          this.qrCodes = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch (error) {
          console.error('Error fetching QR codes:', error);
        }
      },
      viewQRCode(qrCode) {
      this.selectedQRCode = qrCode;
      this.showQRCodeModal = true;
    },
    closeQRCodeModal() {
      this.selectedQRCode = null;
      this.showQRCodeModal = false;
    },
    openEditModal(qrCode) {
        this.selectedQRCode = { ...qrCode }; // Create a copy to edit
        this.showEditModal = true;
    },
     closeEditModal() {
        this.selectedQRCode = null;
        this.showEditModal = false;
    },
    async updateQRCode() {
        if (this.selectedQRCode) {
          try {
            const qrCodeRef = doc(db, 'guest_qrcodes', this.selectedQRCode.id)

            // Calculate the new expiration time based on the validity duration (in hours)
            const currentTime = new Date();
            const expirationTime = new Date(currentTime.getTime() + this.selectedQRCode.validityDuration * 60 * 60 * 1000); // Add hours in milliseconds

            await updateDoc(qrCodeRef, {
              guestName: this.selectedQRCode.guestName,
              category: this.selectedQRCode.category,
              validityDuration: this.selectedQRCode.validityDuration,
              expirationTime: expirationTime
            });
            
            console.log("Expiration Time:", expirationTime);
            alert('QR Code updated successfully!');
            this.closeEditModal();
            await this.fetchUserQRCodes(); // Refresh the list of QR codes
          } catch (error) {
            console.error('Error updating QR code:', error);
          }
        }
      },
      async deleteQRCode(qrCodeId) {
        if (confirm('Are you sure you want to delete this QR code?')) {
          try {
            await deleteDoc(doc(db, 'guest_qrcodes', qrCodeId));
            alert('QR Code deleted successfully!');
            await this.fetchUserQRCodes(); // Refresh the list of QR codes
          } catch (error) {
            console.error('Error deleting QR code:', error);
          }
        }
      },
    },
  };
  </script>
  
  <style>
  /* Table styling */
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  th {
    background-color: #f4f4f4;
  }
  
  /* Button styling */
  button {
    padding: 5px 10px;
    margin-right: 5px;
    background-color: #3498db;
    color: white;
    border: none;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #2980b9;
  }
  
  /* Main content area */
.main-content {
  margin-left: 300px; /* Add margin to the left to avoid overlap with the sidebar */
  padding: 20px; /* A light background color for contrast */
  min-height: 100vh;
  box-sizing: border-box; /* Ensure padding is included in the total width */
}

/* QR codes table */
.qr-codes-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Add slight shadow for visual separation */
}

.qr-codes-table td a {
  color: #2c3e50; /* Dark gray color for a sophisticated look */
  font-weight: bold; /* Make text bold */
  text-transform: uppercase; /* Make text all caps */
  text-decoration: none; /* Remove underline */
  transition: color 0.3s ease, text-decoration 0.3s ease; /* Smooth transition on hover */
}

.qr-codes-table td a:hover {
  color: #e67e22; /* Orange for hover state */
  text-decoration: underline; /* Underline on hover */
}

.qr-codes-table td a:focus {
  outline: none; /* Remove focus outline */
  border-bottom: 2px solid #e67e22; /* Add bottom border when focused */
}

.qr-codes-table th, .qr-codes-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #000000;
}

.qr-codes-table th {
  background-color: #3498db;
  color: white;
}

.qr-codes-table tr:nth-child(even) {
  background-color: #f2f2f2;
}

.qr-codes-table button {
  padding: 8px 12px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
}

.qr-codes-table button:hover {
  background-color: #27ae60;
}

.qr-codes-table .delete-button {
  background-color: #e74c3c;
}

.qr-codes-table .delete-button:hover {
  background-color: #c0392b;
}

/* Add some responsiveness */
@media (max-width: 768px) {
  .sidebar {
    width: 250px;
  }
  .main-content {
    margin-left: 270px;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 200px;
  }
  .main-content {
    margin-left: 220px;
  }
}

  /* Modal styling */
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
  }

  .modal img {
  width: 100%;
  height: auto;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal .download-button {
  background-color: #3498db; /* Classy blue background */
  color: white;
  padding: 10px 20px;
  text-decoration: none; /* Remove default link underline */
  font-size: 16px;
  font-weight: 500; /* Slightly bolder text */
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Subtle shadow */
  transition: background-color 0.3s, box-shadow 0.3s; /* Smooth hover transition */
}

.modal .download-button:hover {
  background-color: #2980b9; /* Darken the blue on hover */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); /* Enhance the shadow on hover */
}

.modal button {
  padding: 10px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
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
  
  .form-actions button:first-of-type {
    background-color: #3498db;
    color: white;
  }
  
  .form-actions button:last-of-type {
    background-color: #e74c3c;
    color: white;
  }
  </style>
  