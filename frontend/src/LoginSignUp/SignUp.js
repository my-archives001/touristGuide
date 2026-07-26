import React, { useState } from "react";
import "./LoginSignUp.css";
import { toast } from 'react-toastify';
import back from '../images/left-arrow.png';
import { authService } from '../services/apiService';

const SignUp = ({ setIsSignUp }) => {

    // State to store user input for signup
    const [enteredUserInfo, setEnteredUserInfo] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: ""
    })

    // Toast for successful signup
    const signUpSuccessToast = () => {
        toast.dismiss();
        toast.success(
            <div>
                <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
                    Signed Up Successfully!
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

    // Toast for signup error (e.g., user already exists)
    const signUpErrorToast = (message) => {
        toast.dismiss();
        toast.error(
            <div>
                <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
                    {message || 'Sign up failed!'}
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

    // Update state on input change
    const handleChange = (e) => {
        setEnteredUserInfo({ ...enteredUserInfo, [e.target.name]: e.target.value });
    }

    // Handle form submission and API call
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Client-side validation
        if (enteredUserInfo.password.length < 8) {
            signUpErrorToast('Security PIN must be at least 8 characters');
            return;
        }

        try {
            await authService.signup({
                firstName: enteredUserInfo.firstName,
                lastName: enteredUserInfo.lastName,
                email: enteredUserInfo.email,
                securityPin: enteredUserInfo.password,
            });

            signUpSuccessToast();
            setIsSignUp(false);
        } catch (error) {
            console.error('SignUp Error: ', error);
            const msg = error.response?.data?.message || 'Failed to create account.';
            signUpErrorToast(msg);
        }
    }

    return (
        <div className="signup-container">
            {/* Header with back button and title */}
            <header>
                <div className="head">
                    <div className="backBtn-h2">
                        <button onClick={() => setIsSignUp(false)} ><img src={back} alt="nav-back" /></button>
                        <h2>Sign Up</h2>
                    </div>
                    <p>Create your account securely</p>
                </div>
            </header>

            {/* Main signup form */}
            <main>
                <div className="signup">
                    <form onSubmit={handleSubmit}>
                        <div className="name">
                            <input
                                type="text"
                                name="firstName"
                                placeholder="First name"
                                value={enteredUserInfo.firstName}
                                onChange={handleChange}
                                required
                            />
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Last name"
                                value={enteredUserInfo.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <input
                            type="email"
                            name="email"
                            placeholder="Enter email"
                            value={enteredUserInfo.email}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Create security PIN (min 8 chars)"
                            value={enteredUserInfo.password}
                            onChange={handleChange}
                            minLength={8}
                            required
                        />

                        <input type="submit" value="Sign Up" />
                    </form>
                </div>
            </main>
        </div>
    );
};

export default SignUp;