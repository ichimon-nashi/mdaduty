import { useState } from 'react';
import toast from 'react-hot-toast';
import { approvedUsers } from '../component/DataRoster.js';

const Login = ({ onLoginSuccess }) => {
    const [loginDetails, setLoginDetails] = useState({
        employeeID: "",
        password: ""
    });

    const handleLoginSubmit = (event) => {
        event.preventDefault();

        const userExists = approvedUsers.find(
            (u) => u.id === loginDetails.employeeID && u.password === loginDetails.password
        );

        if (userExists) {
            toast.success("Login successful");
            // Pass complete user data to parent component
            onLoginSuccess({
                employeeID: userExists.id,
                name: userExists.name,
                rank: userExists.rank,
                base: userExists.base
            });
        } else {
            toast("你是哪根蔥?!", {icon: '🤨', duration: 3000,});
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setLoginDetails(prevLoginDetails => ({
            ...prevLoginDetails,
            [name]: value,
        }));
    };

    return (
        <>
            <form onSubmit={handleLoginSubmit}>
                <div className="login">
                    <h1>豪神任務互換APP</h1>
                    <div className="input">
                        <input
                            type="text"
                            name="employeeID"
                            onChange={handleChange}
                            value={loginDetails.employeeID}
                            placeholder="員編 Employee ID"
                            autoComplete="off"
                        />
                    </div>
                    <div className="input">
                        <input
                            type="password"
                            name="password"
                            onChange={handleChange}
                            value={loginDetails.password}
                            placeholder="密碼 Password"
                            autoComplete="off"
                        />
                    </div>
                    <button>Sign in</button>
                </div>
            </form>
        </>
    );
};

export default Login;