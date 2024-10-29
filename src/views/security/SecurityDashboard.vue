<template>
  <div>
    <!-- Fixed Sidebar on the left -->
    <SecuritySidebar />

    <!-- Main content on the right -->
    <div class="main-content">
      <div class="container">
        <div class="dashboard-grid">
          <div class="profile">
            <h2>My Profile 👤</h2>
            <div class="profile-info">
              <div class="profile-details">
                <p>
                  <strong>Name:</strong> {{ user.firstName }}
                  {{ user.lastName }}
                </p>
                <p class="p-role"><strong>Role:</strong> {{ user.role }}</p>
                <p><strong>Account created:</strong> {{ accountCreated }}</p>
                <p><strong>Email:</strong> {{ user.email }}</p>
              </div>
            </div>
          </div>
          <br />
          <div class="system-alerts">
            <h2>Gate Exits ⚠️</h2>
            <div v-if="showExitModal" class="modal-content-exit">
              <h2>Exited</h2>
              <br />
              <img
                :src="exitProfilePic"
                alt="Profile Picture"
                class="profile-pic-exit"
              />
              <p><strong>Resident Name:</strong> {{ exitResidentName }}</p>
              <p><strong>Phase:</strong> {{ exitResidentPhase }}</p>
              <button @click="closeExitModal">Close</button>
            </div>
          </div>
        </div>

        <div class="recent-activities">
          <h2>Gate Entries 📊</h2>
          <div v-if="showEntryGrantedModal" class="modal-content">
            <h2>Entry Granted</h2>
            <br />
            <img
              :src="residentProfilePic"
              alt="Profile Picture"
              class="profile-pic"
            />
            <p><strong>Resident Name:</strong> {{ residentName }}</p>
            <p><strong>Phase:</strong> {{ residentPhase }}</p>
            <button @click="closeEntryModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
import { ref, onMounted } from "vue";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
} from "firebase/storage";

export default {
  components: {
    SecuritySidebar,
  },
  setup() {
    const user = ref({});
    const accountCreated = ref("");
    const auth = getAuth();
    const storage = getStorage();
    const showEntryGrantedModal = ref(false);
    const residentName = ref("");
    const residentPhase = ref("");
    const residentProfilePic = ref("");

    // Separate state variables for exit modal
    const showExitModal = ref(false);
    const exitResidentName = ref("");
    const exitResidentPhase = ref("");
    const exitProfilePic = ref("");

    let initializedEntries = false;
    let initializedExits = false;

    const fetchUserProfile = async (uid) => {
      if (uid) {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          user.value = userDoc.data();

          // Convert Firestore timestamp to a readable date
          if (user.value.createdAt) {
            accountCreated.value = new Date(
              user.value.createdAt.seconds * 1000
            ).toLocaleDateString();
          } else {
            accountCreated.value = "No creation date available";
          }
        } else {
          console.error("User document does not exist");
        }
      }
    };

    const getProfilePictureUrl = async (uid) => {
      try {
        const profilePicRef = storageRef(storage, `profile_pictures/${uid}`);
        return await getDownloadURL(profilePicRef);
      } catch (error) {
        console.warn("Failed to fetch profile picture from Storage:", error);
        return new URL("@/assets/default-profile.jpg", import.meta.url).href;
      }
    };

    const listenForAcceptedEntries = () => {
      console.log("Listening for accepted entries...");

      const acceptedEntriesQuery = query(
        collection(db, "latest_accepted_entry_log"),
        where("status", "==", "accepted")
      );

      onSnapshot(acceptedEntriesQuery, async (snapshot) => {
        if (!initializedEntries) {
          // Skip the initial load, only set initialized to true
          initializedEntries = true;
          return;
        }
        snapshot.docChanges().forEach(async (change) => {
          if (change.type == "modified" || change.type == "added") {
            const entry = change.doc.data();

            if (entry && entry.rfidTag) {
              console.log("Entry with RFID tag found:", entry.rfidTag);
              try {
                // Query the users collection for the matching rfidTag
                const userQuery = query(
                  collection(db, "users"),
                  where("rfidTag", "==", entry.rfidTag)
                );

                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                  const userDoc = userSnapshot.docs[0].data();

                  residentName.value = `${userDoc.firstName} ${userDoc.lastName}`;
                  residentProfilePic.value = await getProfilePictureUrl(
                    userSnapshot.docs[0].id
                  );
                  residentPhase.value = `${userDoc.phase}`;

                  showEntryGrantedModal.value = true;
                  console.log("Modal should show now");
                } else {
                  console.warn(`No user found with RFID tag: ${entry.rfidTag}`);
                }
              } catch (error) {
                console.error("Error fetching user document:", error);
              }
            }
          } else {
            console.warn("rfidTag is undefined in entry:", entry);
          }
        });
      });
    };

    const listenForExits = () => {
      console.log("Listening for exits...");

      const acceptedExits = query(
        collection(db, "latest_exit_log"),
        where("status", "==", "accepted")
      );

      onSnapshot(acceptedExits, async (snapshot) => {
        if (!initializedExits) {
          initializedExits = true;
          return;
        }

        snapshot.docChanges().forEach(async (change) => {
          if (change.type == "modified" || change.type == "added") {
            const exit = change.doc.data();

            if (exit && exit.rfidTag) {
              try {
                // Query the users collection for the matching rfidTag
                const userQuery = query(
                  collection(db, "users"),
                  where("rfidTag", "==", exit.rfidTag)
                );

                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                  const userDoc = userSnapshot.docs[0].data();

                  exitResidentName.value = `${userDoc.firstName} ${userDoc.lastName}`;
                  exitProfilePic.value = await getProfilePictureUrl(
                    userSnapshot.docs[0].id
                  );
                  exitResidentPhase.value = `${userDoc.phase}`;

                  showExitModal.value = true;
                  console.log("Exit should show now");
                } else {
                  console.warn(`No user found with RFID tag: ${entry.rfidTag}`);
                }
              } catch (error) {
                console.error("Error fetching user document:", error);
              }
            }
          } else {
            console.warn("rfidTag is undefined in entry:", entry);
          }
        });
      });
    };

    const closeEntryModal = () => {
      showEntryGrantedModal.value = false;
    };

    const closeExitModal = () => {
      showExitModal.value = false;
    };

    // Use onAuthStateChanged to detect authentication state changes
    onMounted(() => {
      onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          // Fetch the user profile once we confirm the user is authenticated
          fetchUserProfile(currentUser.uid);
          listenForAcceptedEntries();
          listenForExits();
        } else {
          console.error("No user is signed in");
        }
      });
    });

    return {
      user,
      accountCreated,
      showEntryGrantedModal,
      showExitModal,
      residentName,
      residentPhase,
      residentProfilePic,
      exitResidentName,
      exitProfilePic,
      exitResidentPhase,
      closeEntryModal,
      closeExitModal,
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
  height: 100vh;
}

h1 {
  font-size: 36px;
  color: #333;
}

.p-role {
  text-transform: capitalize;
}

.modal-content {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  max-width: 100%;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.modal-content h2 {
  display: inline-block; /* Allows the border to wrap tightly around the text */
  padding: 8px 12px; /* Adds space inside the border */
  border: 2px solid #3498db; /* Border with specified color */
  border-radius: 5px; /* Rounds the corners (optional) */
  font-weight: bold; /* Makes the text bold (optional) */
  color: #000000; /* Text color */
  background-color: #109b45;
}

.modal-content-exit {
  background-color: #ffffff;
  padding: 20px;
  border: 2px solid #f5c6cb; /* Matches system-alerts border */
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-top: 10px;
}

.modal-content-exit h2 {
  display: inline-block;
  padding: 8px 12px;
  border: 2px solid #f1d639; /* Red border for 'Exited' text */
  border-radius: 5px;
  color: #000000; /* Match the border color */
  font-weight: bold;
  background-color: #eb7d51;
}

.profile-pic {
  width: 350px;
  height: 350px;
  border-radius: 50%;
  margin: 15px auto;
}

.profile-pic-exit {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  margin: 15px auto;
}

button {
  padding: 10px 20px;
  margin-top: 15px;
  font-size: 16px;
  cursor: pointer;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
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
