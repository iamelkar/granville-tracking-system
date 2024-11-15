<template>
  <div class="dashboard">
    <UserSideNav />

    <!-- Main content on the right -->
    <div class="main-content" @click="handleOutsideClick">
      <!-- <h1>THIS IS THE USER DASHBOARD</h1> -->
      <div class="container">
        <div class="dashboard-grid">
          <div class="profile">
            <h2>My Profile 👤</h2>
            <div class="profile-info">
              <div class="profile-picture">
                <img
                  :src="profilePictureUrl || defaultProfilePicture"
                  alt="Profile Picture"
                />
                <input type="file" @change="uploadProfilePicture" />
              </div>
              <div class="profile-details">
                <p>
                  <strong>Name:</strong> {{ user.firstName }}
                  {{ user.lastName }}
                </p>
                <p>
                  <strong>Address:</strong> {{ user.houseLotNumber }},
                  {{ user.street }} St., Granville
                </p>
                <p><strong>Account created:</strong> {{ accountCreated }}</p>
                <p><strong>Email:</strong> {{ user.email }}</p>
              </div>
            </div>
          </div>
          <br />

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
import UserSideNav from "@/components/user/UserSideNav.vue";
import { ref, onMounted, onBeforeUnmount } from "vue";
import { db, storage } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";

export default {
  components: {
    UserSideNav,
  },
  setup() {
    const user = ref({});
    const accountCreated = ref("");
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const profilePictureUrl = ref("");
    const defaultProfilePicture = new URL(
      "@/assets/default-profile.jpg",
      import.meta.url
    ).href;

    const fetchUserProfile = async () => {
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          user.value = docSnap.data();
          accountCreated.value = new Date(
            user.value.createdAt.seconds * 1000
          ).toLocaleDateString();
        }

        // Fetch profile picture url if available
        try {
          profilePictureUrl.value = await getDownloadURL(
            storageRef(storage, `profile_pictures/${currentUser.uid}`)
          );
        } catch (error) {
          console.warn("Profile picture not found, using default");
        }
      }
    };

    const uploadProfilePicture = async (event) => {
      const file = event.target.files[0];
      if (file && currentUser) {
        const storageReference = storageRef(
          storage,
          `profile_pictures/${currentUser.uid}`
        );
        await uploadBytes(storageReference, file);
        profilePictureUrl.value = await getDownloadURL(storageReference);
        alert("Profile picture updated successfully");
      }
    };

    onMounted(() => {
      fetchUserProfile();
    });

    return {
      user,
      accountCreated,
      profilePictureUrl,
      defaultProfilePicture,
      uploadProfilePicture,
    };
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

/* Main content area */
.main-content {
  margin-left: 250px; /* Make room for the fixed sidebar */
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  transition: margin-left 0.3s ease-in-out;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

/* Container to wrap both sections */
.container {
  display: flex;
  margin-left: 50px;
  justify-content: space-between;
  width: 100%;
  height: 100%; /* Full height for layout purposes */
}

/* Dashboard grid for the left side */
.dashboard-grid {
  display: flex;
  flex-direction: column;
  width: 30%; /* Left side takes 30% of the width */
  margin-left: 50px;
}

/* Profile and system-alerts classes aligned in column */
.profile,
.system-alerts {
  /* margin-bottom: 20px; Add some space between items */
  padding: 20px;
  background-color: #ffffff; /* Light background for clarity */
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  height: 100%;
}

/* Recent activities to take the full right side */
.recent-activities {
  width: 70%; /* Right side takes 70% of the width */
  padding: 20px;
  background-color: #ffffff; /* Light background for clarity */
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  margin-left: 20px;
}

.profile h2,
.system-alerts-card h2,
.recent-activities-card h2 {
  font-size: 1.8rem;
  margin-bottom: 15px;
}

.profile-info {
  display: flex; /* Flexbox to align items in a row */
  flex-direction: column; /* Stack items vertically */
  align-items: flex-start; /* Align items to the left */
  justify-content: center; /* Center content within the profile */
  padding: 10px;
}

.profile-picture {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%; /* Make it responsive to the parent width */
  max-width: 200px; /* Set a maximum width */
  margin: 0 auto;
}

.profile-picture img {
  width: 100%;
  height: auto;
  max-width: 120px; /* Ensure it doesn't get too large */
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.profile-picture input[type="file"] {
  display: block;
  margin-top: 10px;
  width: 80px;
}

.profile-details {
  background-color: white; /* White background for details */
  padding: 15px; /* Padding for a clean look */
  border-radius: 8px; /* Rounded corners */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow for a card-like effect */
  width: 100%; /* Take full width inside profile */
  margin-top: 10px; /* Add space between the heading and details */
  text-align: left;
  font-size: 16px; /* Default font size */
  line-height: 1.4;
}

.profile-details p {
  margin: 8px 0; /* Space between paragraphs */
  font-size: 1rem; /* Slightly larger font for readability */
}

.profile-details strong {
  font-weight: bold;
  color: #333; /* Darker color for strong labels */
}

.profile {
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: auto;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-button:hover {
  background-color: #2980b9;
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

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.active {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .container {
    margin-left: 0px;
  }

  .sidebar-toggle {
    display: block;
  }

  .profile {
    margin-bottom: 0px;
    padding: 15px;
  }
  .profile-info {
    padding: 0px;
    width: 140px;
  }

  .profile-picture {
    max-width: 100px; /* Adjust max width for mobile view */
  }

  .profile-picture img {
    max-width: 60px;
    max-height: 60px;
  }

  .dashboard-grid {
    margin-left: 0px;
    width: 49%;
  }

  .recent-activities {
    width: 49%;
    margin-left: 0;
  }

  h2 {
    font-size: 2vh;
  }

  .profile-details {
    font-size: 12px;
    padding: 8px;
  }

  .profile-details p {
    font-size: 0.8rem;
  }

  .profile-details strong {
    font-size: 0.85rem;
  }
}
</style>
