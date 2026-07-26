import React, { useState, useEffect } from 'react';
// import Spinner from '../../Essentials/Spinner';
import { profileService } from '../../services/apiService';

const ViewProfile = ({ setProfileSet, setViewProfile, profileUpdated, token }) => {

  // State to track loading status while fetching profile
  const [loading, setLoading] = useState(true);

  // State to store fetched profile data
  const [profile, setProfile] = useState(null);

  // Fetch profile data when component mounts or when token/profileUpdated changes
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const startTime = Date.now(); // Track fetch start time for consistent spinner

      try {
        const data = await profileService.getProfile();
        setProfile(data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        // Ensure spinner shows at least 3 seconds for UX consistency
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 3000 - elapsed);
        setTimeout(() => setLoading(false), remaining);
      }
    };

    fetchProfile();
  }, [token, profileUpdated]);

  // Switch to edit mode when Edit button is clicked
  const handleEditClick = () => {
    setProfileSet(true);
    setViewProfile(false);
  };

  // Show loading animation while fetching profile
  if (loading)
    return (
      <div className="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    );

  // Handle case where profile data is not available
  if (!profile) {
    return <div className='profile-card'>No profile data available.</div>;
  }

  // Render user's profile information
  return (
    <div className="profile-card">
      <h2>My Profile</h2>
      <p><strong>Name:</strong> {profile.user.firstName} {profile.user.lastName}</p>
      <p><strong>Email:</strong> {profile.user.email}</p>
      <p><strong>Phone:</strong> {profile.phone || 'N/A'}</p>
      <p><strong>Age:</strong> {profile.age || 'N/A'}</p>
      <p><strong>Gender:</strong> {profile.gender || 'N/A'}</p>
      <p><strong>Hometown:</strong> {profile.hometown || 'N/A'}</p>
      <p><strong>Interests:</strong> {profile.interests || 'N/A'}</p>
      <button onClick={handleEditClick}>Edit</button>
    </div>
  );
};

export default ViewProfile;