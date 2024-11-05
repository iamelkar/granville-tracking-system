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
                <a href="#" @click.prevent="viewQRCode(qrCode)">
                  {{ qrCode.mainName || qrCode.guestName }}
                </a>
              </td>
              <td>{{ qrCode.category }}</td>
              <td>{{ formatExpirationTime(qrCode.expirationTime) }}</td>
              <td>
                <button @click="openEditModal(qrCode)">Edit</button>
                <button @click="deleteQRCode(qrCode.id)" class="delete-button">
                  Delete
                </button>
                <button @click="openHistoryModal(qrCode)">View History</button>
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
              <label for="guestName">Main Guest Name:</label>
              <input
                type="text"
                v-model="selectedQRCode.mainName"
                id="guestName"
                required
              />
            </div>

            <div
              v-if="
                selectedQRCode.category === 'guest' ||
                selectedQRCode.category === 'renter'
              "
              class="form-group"
            >
              <label for="entryType">Entry Type:</label>
              <select v-model="selectedQRCode.entryType" id="entryType">
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>
            </div>

            <!-- Conditional field for groups to edit guest list names -->
            <div v-if="selectedQRCode.entryType === 'group'" class="form-group">
              <label for="guestList">List of Names (Separate by line):</label>
              <textarea
                v-model="selectedQRCode.names"
                id="guestList"
                placeholder="Enter one name per line"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="newImage">Update Image:</label>
              <input
                type="file"
                @change="uploadNewImage"
                id="newImage"
                accept="image/*"
              />
              <small v-if="selectedQRCode.imageUrl"
                >Current Image:
                <img
                  :src="selectedQRCode.imageUrl"
                  alt="Current Image"
                  class="current-image"
              /></small>
            </div>

            <!-- <div class="form-group">
              <label for="validityDuration"
                >Extend Validity Duration (hours):</label
              >
              <input
                type="number"
                v-model="selectedQRCode.validityDuration"
                id="validityDuration"
                required
              />
            </div> -->

            <div class="form-group">
              <label for="expirationTime">Expiration Time:</label>
              <input
                type="datetime-local"
                v-model="newExpirationTime"
                id="expirationTime"
                required
              />
            </div>

            <div class="form-actions">
              <button type="submit">Save</button>
              <button type="button" @click="closeEditModal">Cancel</button>
              <button
                type="button"
                @click="expireQRCodeNow"
                class="expire-button"
              >
                Expire Now
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit History Modal -->
      <div v-if="showHistoryModal" class="modal-overlay">
        <div class="modal">
          <h3>
            Edit History for
            {{ selectedQRCode.mainName || selectedQRCode.guestName }}
          </h3>
          <table class="history-table">
            <thead>
              <tr>
                <th>Previous Name</th>
                <th>Category</th>
                <th>Previous Expiration</th>
                <th>Edit Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(history, index) in editHistory" :key="index">
                <td>{{ history.mainName }}</td>
                <td>{{ history.category }}</td>
                <td>{{ formatExpirationTime(history.expirationTime) }}</td>
                <td>{{ formatExpirationTime(history.editTimestamp) }}</td>
              </tr>
            </tbody>
          </table>
          <button @click="closeHistoryModal">Close</button>
        </div>
      </div>

      <!-- QR Code Modal -->
      <div v-if="showQRCodeModal" class="modal-overlay">
        <div class="modal">
          <h3>
            QR Code for
            {{ selectedQRCode.mainName || selectedQRCode.guestName }}
          </h3>
          <img :src="selectedQRCode.qrCodeUrl" alt="Generated QR Code" />
          <div class="modal-actions">
            <a
              :href="selectedQRCode.qrCodeUrl"
              :download="
                (selectedQRCode.mainName || selectedQRCode.guestName) +
                '-QRCode.png'
              "
              class="download-button"
            >
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
import UserSideNav from "@/components/user/UserSideNav.vue";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, storage } from "@/firebase";
import { getAuth } from "firebase/auth";
import { ref } from "vue";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default {
  components: { UserSideNav },
  data() {
    return {
      qrCodes: [],
      showEditModal: false,
      selectedQRCode: null,
      showQRCodeModal: false,
      showHistoryModal: false,
      editHistory: [],
      newImageUrl: null, // Use newImageUrl as a simple data property instead of a ref
      editHistoryCollection: collection(db, "edit_history"),
      newExpirationTime: null, // Added field to manage expiration time editing
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
        alert("Please log in to view your QR codes.");
        return;
      }

      try {
        const q = query(
          collection(db, "guest_qrcodes"),
          where("createdBy", "==", currentUser.email)
        );

        const querySnapshot = await getDocs(q);
        this.qrCodes = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Error fetching QR codes:", error);
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
      this.selectedQRCode = { ...qrCode };
      this.newExpirationTime = qrCode.expirationTime
        ? new Date(qrCode.expirationTime.seconds * 1000)
            .toISOString()
            .slice(0, 16)
        : null; // Pre-fill expiration time
      this.showEditModal = true;
    },
    closeEditModal() {
      this.selectedQRCode = null;
      this.newExpirationTime = null; // Clear expiration time when closing modal
      this.showEditModal = false;
    },
    async uploadNewImage(event) {
      const file = event.target.files[0];
      if (file && this.selectedQRCode) {
        try {
          const imageRef = storageRef(
            storage,
            `guestImages/${this.selectedQRCode.id}/${file.name}`
          );
          await uploadBytes(imageRef, file);
          this.newImageUrl = await getDownloadURL(imageRef); // Set as a regular data property
          console.log("Image uploaded successfully:", this.newImageUrl);
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }
    },
    async updateQRCode() {
      if (this.selectedQRCode) {
        try {
          const qrCodeRef = doc(db, "guest_qrcodes", this.selectedQRCode.id);
          const updatedData = {
            guestName: this.selectedQRCode.guestName || null,
            names: this.selectedQRCode.names || null,
            validityDuration: this.selectedQRCode.validityDuration || null,
          };

          // Update expiration time if changed
          if (this.newExpirationTime) {
            updatedData.expirationTime = new Date(this.newExpirationTime);
          }

          // Include new image URL if uploaded
          if (this.newImageUrl) {
            updatedData.imageUrl = this.newImageUrl;
          }

          // Save edit history before updating
          const originalData = (await getDoc(qrCodeRef)).data();

          // Filter out undeefined fields from originalData and updatedData for edit history
          const sanitizedOriginalData = this.sanitizeData(originalData)
          const sanitizedUpdatedData = this.sanitizeData(updatedData)

          // Store edit history
          await addDoc(this.editHistoryCollection, {
            qrCodeId: this.selectedQRCode.id,
            previousData: sanitizedOriginalData,
            newData: sanitizedUpdatedData,
            editedAt: serverTimestamp(),
            editedBy: getAuth().currentUser.email,
          });

          // Update the Firestore document with new data
          await updateDoc(qrCodeRef, sanitizedUpdatedData);

          alert("QR Code updated successfully!");
          this.closeEditModal();
          await this.fetchUserQRCodes();
        } catch (error) {
          console.error("Error updating QR code:", error);
        }
      }
    },
    async deleteQRCode(qrCodeId) {
      if (confirm("Are you sure you want to delete this QR code?")) {
        try {
          await deleteDoc(doc(db, "guest_qrcodes", qrCodeId));
          alert("QR Code deleted successfully!");
          await this.fetchUserQRCodes();
        } catch (error) {
          console.error("Error deleting QR code:", error);
        }
      }
    },
    // async openHistoryModal(qrCode) {
    //   this.selectedQRCode = qrCode;
    //   const qrCodeRef = doc(db, "guest_qrcodes", qrCode.id);
    //   const historySnapshot = await getDocs(
    //     collection(qrCodeRef, "edit_history")
    //   );
    //   this.editHistory = historySnapshot.docs.map((doc) => doc.data());
    //   this.showHistoryModal = true;
    // },
    async openHistoryModal(qrCode) {
      try {
        this.selectedQRCode = qrCode;
        const qrCodeRef = doc(db, "guest_qrcodes", qrCode.id);

        console.log("Attempting to access edit_history for QR Code ID:", qrCode.id);

        // Fetch the edit history documents
        const historySnapshot = await getDocs(
            collection(qrCodeRef, "edit_history")
        );

        if (historySnapshot.empty) {
            console.log("No edit history found for this QR Code.");
            this.editHistory = [];
        } else {
            // Map history and log each entry for debugging
            this.editHistory = historySnapshot.docs.map((doc) => {
                const data = doc.data();
                console.log("Fetched edit history entry:", data);

                // Log the editedBy field to verify it matches the current user
                if (data.editedBy) {
                    console.log("Edit history entry edited by:", data.editedBy);
                } else {
                    console.warn("Edit history entry missing editedBy field.");
                }
                
                return data;
            });
        }

        this.showHistoryModal = true;

      } catch (error) {
        console.error("Error opening history modal:", error.message);
        alert("Unable to load edit history. Please check your permissions or try again later.");
      }
    },

    closeHistoryModal() {
      this.editHistory = [];
      this.showHistoryModal = false;
    },
    async expireQRCodeNow() {
      const qrCodeRef = doc(db, "guest_qrcodes", this.selectedQRCode.id);
      await updateDoc(qrCodeRef, { expirationTime: new Date() });
      alert("QR Code expired successfully!");
      this.closeEditModal();
      await this.fetchUserQRCodes();
    },
    formatExpirationTime(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    },
    sanitizeData(data){
      return Object.fromEntries(Object.entries(data).filter(([_, v]) => v != null))
    }
  },
};
</script>

<style>
/* Table styling */

.main-content {
  margin-left: 300px; /* Add margin to the left to avoid overlap with the sidebar */
  padding: 20px; /* A light background color for contrast */
  min-height: 100vh;
  box-sizing: border-box; /* Ensure padding is included in the total width */
}

.qr-codes-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.qr-codes-table th,
.qr-codes-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.qr-codes-table th {
  background-color: #3498db;
  color: white;
}

.qr-codes-table tr:nth-child(even) {
  background-color: #f9f9f9;
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

.modal .download-button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.modal .download-button:hover {
  background-color: #2980b9;
}

.modal button {
  padding: 10px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.expire-button {
  background-color: #e74c3c;
  color: white;
}

.current-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  margin-top: 10px;
}
</style>
