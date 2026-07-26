import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import config from '../../config';
import { profileService } from '../../services/apiService';

const API_BASE = config.apiURL;

const SetProfile = ({ setProfileSet, setViewProfile, setProfileUpdated, token }) => {

    // State to hold profile fields
    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        age: "",
        gender: "",
        hometown: "",
        interests: ""
    });

    // Fetch existing user and profile data when component mounts or token changes
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch basic user info
                const userResponse = await fetch(`${API_BASE}/api/users/profile`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const userData = await userResponse.json();

                // Fetch additional profile data
                const profileResponse = await fetch(`${API_BASE}/api/profile`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    // Merge user data and profile data into state
                    setProfile({
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: userData.email,
                        phone: profileData.phone || '',
                        age: profileData.age || '',
                        gender: profileData.gender || '',
                        hometown: profileData.hometown || '',
                        interests: profileData.interests || '',
                    });
                } else {
                    // If no profile exists yet, just populate with user data
                    setProfile({
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: userData.email,
                        phone: "",
                        age: "",
                        gender: "",
                        hometown: "",
                        interests: "",
                    });
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            }
        };
        if (token) {
            fetchUserData();
        }
    }, [token]);

    // Toast to show success message after profile update
    const SuccessToast = () => {
        toast.dismiss();
        toast.success(
            <div>
                <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
                    Profile Updated Successfully!
                </div>
            </div>,
            {
                position: "top-right",
                autoClose: 2500,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                style: {
                    backgroundColor: "#d1fae5",
                    color: "#065f46",
                    borderRadius: "16px",
                    fontSize: "1rem",
                    fontWeight: "500",
                },
                containerId: "below-header",
            }
        );
    };

    // Toast to show error message when profile update fails
    const ErrorToast = (msg = 'Failed to update profile') => {
        toast.dismiss();
        toast.error(
            <div>
                <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
                    {msg}
                </div>
            </div>,
            {
                position: "top-right",
                autoClose: 2500,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                style: {
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    borderRadius: "16px",
                    fontSize: "1rem",
                    fontWeight: "500",
                },
                containerId: "below-header",
            }
        );
    };

    // Handle input changes and update state
    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    // Save profile data to backend
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await profileService.updateProfile({
                phone: profile.phone,
                age: profile.age,
                gender: profile.gender,
                hometown: profile.hometown,
                interests: profile.interests,
            });
            SuccessToast();
            setProfileSet(false);
            setViewProfile(true);
            setProfileUpdated((prev) => !prev);
        } catch (error) {
            console.error('Error saving profile:', error);
            ErrorToast();
        }
    };

    return (
        <div className="container">
            <h2>Personalize Your Profile</h2>

            {/* Profile edit form */}
            <form className="setprofile-container" onSubmit={handleSave}>
                <div className="form-grid">
                    <input name="firstName" value={profile.firstName} onChange={handleChange} placeholder="First Name" disabled />
                    <input name="lastName" value={profile.lastName} onChange={handleChange} placeholder="Last Name" disabled />
                    <input name="email" value={profile.email} onChange={handleChange} placeholder="Email" disabled />
                    <input name="phone" value={profile.phone} onChange={handleChange} placeholder="Phone Number" />
                    <input name="age" value={profile.age} onChange={handleChange} placeholder="Age" />
                    <select name="gender" value={profile.gender} onChange={handleChange}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                    <input
                        name="hometown"
                        value={profile.hometown}
                        onChange={handleChange}
                        placeholder="Hometown"
                        className="full-width"
                    />
                    <textarea
                        name="interests"
                        value={profile.interests}
                        onChange={handleChange}
                        placeholder="Your Interests"
                        className="full-width"
                    />
                </div>
                <button type="submit" className="save-btn">Save</button>
            </form>
        </div>
    );
};

export default SetProfile;