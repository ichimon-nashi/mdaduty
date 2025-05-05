const Navbar = () => {
    return (
        <>
            <nav className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-40">
                <div className="w-full flex justify-between items-center px-4">
                    <div className="text-xl font-bold">豪神任務互換系統</div>
                    <div className="flex items-center space-x-4">
                        <div>
                            <span className="font-medium">Hi, {userDetails.name}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm"
                        >
                            登出
                        </button>
                    </div>
                </div>
            </nav>
        </>
    )
}

export default Navbar