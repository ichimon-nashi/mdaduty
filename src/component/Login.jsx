import { useState } from 'react';
import toast from 'react-hot-toast';
import { approvedUsers } from './DataRoster';

const Login = ({ onLoginSuccess }) => {
    const [loginDetails, setLoginDetails] = useState({
        employeeID: "",
        name: "",
        password: "",
        base: ""
    });

    const handleLoginSubmit = (event) => {
        event.preventDefault();

        const userExists = approvedUsers.find(
            (u) => u.id === loginDetails.employeeID && u.password === loginDetails.password
        );

        if (userExists) {
            toast.success("Login successful");
            // Pass user data to parent component and include any additional user info from approvedUsers
            onLoginSuccess({
                ...loginDetails,
                name: userExists.name, // Assuming name exists in approvedUsers data
                base: userExists.base, // Assuming base exists in approvedUsers data
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