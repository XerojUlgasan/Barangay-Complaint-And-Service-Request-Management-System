import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './login.css';

const Login = () => {
  const [isSignIn, setIsSignIn] = useState(true);
  const navigate = useNavigate();

  const handleSignInClick = (e) => {
    e.preventDefault();
    setIsSignIn(true);
  };

  const handleNewUserClick = (e) => {
    e.preventDefault();
    setIsSignIn(false);
  };

  const handleSignInSubmit = (e) => {
    e.preventDefault();
    console.log('Sign in submitted');
    navigate('/dashboard'); // Navigate to UserLanding
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    console.log('Verification submitted');
    navigate('/dashboard'); // Navigate to UserLanding
  };

  return (
    <div className="login-page">
      {/* Sign In Container */}
      <div 
        className="container-fluid sign-in-container" 
        style={{ display: isSignIn ? 'flex' : 'none' }} 
      >
        <a className="shield-button">
          <svg className="shield-icon" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </a>
        
        <h5>Barangay Portal</h5>
        <p>Welcome Back! Please sign in to continue.</p>
         
        <div className="container">
          <button 
            type="button" 
            className={`btn btn-success ${isSignIn ? 'active-toggle' : 'inactive-toggle'}`}
            onClick={handleSignInClick}
          >
            Sign in
          </button>
          <button 
            type="button" 
            className={`btn btn-success ${!isSignIn ? 'active-toggle' : 'inactive-toggle'}`}
            onClick={handleNewUserClick}
          >
            New User
          </button>
        </div>

        <form onSubmit={handleSignInSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              id="username"
              placeholder="Enter your username"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              id="password" 
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="btn btn-success">
            Sign in
          </button>

          <a className="forgot" href="/">Forgot password?</a>
        </form>
      </div>

      {/* New User Container */}
      <div 
        className="container-fluid new-user-container" 
        id="container2"
        style={{ display: !isSignIn ? 'flex' : 'none' }}
      >
        <a className="shield-button">
          <svg className="shield-icon" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </a>
        
        <h5>Barangay Portal</h5>
        <p>Welcome Back! Please sign in to continue.</p>
         
        <div className="container">
          <button 
            type="button" 
            className={`btn btn-success ${isSignIn ? 'active-toggle' : 'inactive-toggle'}`}
            onClick={handleSignInClick}
          >
            Sign in
          </button>
          <button 
            type="button" 
            className={`btn btn-success ${!isSignIn ? 'active-toggle' : 'inactive-toggle'}`}
            onClick={handleNewUserClick}
          >
            New User
          </button>
        </div>
          
        <div className="d-flex justify-content-center align-items-center mt-4">
          <div className="step-circle active">1</div>
          <div className="step-line"></div>
          <div className="step-circle">2</div>
        </div>

        <div className="identity-section mt-4">
          <h6 className="text-center">Identity Verification</h6>
          <p className="text-center text-muted">
            Enter details matching barangay records
          </p>

          <form onSubmit={handleVerifySubmit}>
            <div className="mb-3">
              <label htmlFor="householdId" className="form-label">Household ID</label>
              <input 
                type="text" 
                className="form-control" 
                id="householdId"
                placeholder="e.g., BRG-2026-123456"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="fullName" className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-control" 
                id="fullName" 
                placeholder="Enter complete name"
              />
            </div>
            <button type="submit" className="btn btn-success">
              Verify & Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;