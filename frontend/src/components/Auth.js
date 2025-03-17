import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // const [isSignUp, setIsSignUp] = useState(false); // State to toggle between Login and Signup forms

    const handleAuthAction = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        setLoading(true);

        try {

                // Sign In
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

        } catch (error) {
            alert(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>Login</h2>
            <form onSubmit={handleAuthAction}>
                <div className="input-group">
                    <label htmlFor="email">Email</label> {/* Changed label to Email (or Username) */}
                    <input
                        className="inputField"
                        type="email" // or type="text" if using username
                        placeholder="Your email" // or placeholder="Username/Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                        className="inputField"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="button-group">
                    <button type="submit" disabled={loading}>
                        {loading ? 'Loading ...' : 'Login'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Auth;

//     const handleLogin = async (type) => {
//         setLoading(true);
//         try {
//             if (type === 'google') {
//                 const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
//                 if (error) throw error;
//             } else { // Email login
//                 const { error } = await supabase.auth.signInWithOtp({ email });
//                 if (error) throw error;
//                 alert('Check your email for the login link!');
//             }
//         } catch (error) {
//             alert(error.error_description || error.message);
//         } finally {
//             setLoading(false);
//         }
//     };
//
//     return (
//         <div className="auth-container">
//             <p>Sign in via magic link with your email below or with Google OAuth:</p>
//             <div>
//                 <input
//                     className="inputField"
//                     type="email"
//                     placeholder="Your email"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                 />
//                 <button onClick={() => handleLogin('email')} disabled={loading}>
//                     {loading ? 'Loading ...' : 'Send Magic Link'}
//                 </button>
//             </div>
//             <div className="oauth-login">
//                 <button onClick={() => handleLogin('google')} disabled={loading}>
//                     {loading ? 'Loading ...' : 'Sign in with Google'}
//                 </button>
//             </div>
//         </div>
//     );
// };
//
// export default Auth;