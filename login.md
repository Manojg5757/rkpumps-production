Integrate Firebase Email Authentication into this app with ADMIN-ONLY access.

Requirements:

1. Login Only
- No signup page
- No public registration
- Only existing Firebase users can log in
- Use Firebase Email/Password Authentication

2. Login Popup Modal
- Show login form inside a modern popup/modal
- Fields:
  - Email
  - Password
- Buttons:
  - Login
  - Close modal
- Show loading state while logging in
- Show proper error messages for invalid credentials

3. Session Management
- Keep admin logged in for 1 day
- Save login timestamp in localStorage after successful login
- On app load:
  - Check if session exists
  - If session expired after 24 hours:
    - Automatically logout
    - Clear localStorage
    - Redirect/show login popup again
- If admin manually logs out:
  - Clear session immediately

4. Protected App Access
- Entire app should be protected
- If user is not authenticated:
  - Blur or block app content
  - Show login popup
- Only authenticated admin can access dashboard/features

5. Logout Feature
- Add logout button in navbar/header
- On logout:
  - Firebase signOut()
  - Clear localStorage session
  - Return to login popup

6. Firebase Setup
Use Firebase modular SDK.

Create:
- firebase.js
- auth functions
- auth state listener

Use:
- signInWithEmailAndPassword
- onAuthStateChanged
- signOut

7. Persistence
Use browserLocalPersistence so login survives refresh until:
- manual logout
- session expiry (24h)

8. UI Requirements
 keep same color patterns already used

9. Security
- No hardcoded credentials
- Protect routes/pages
- Only authenticated users can access Firestore data
