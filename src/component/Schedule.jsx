import React, { useState, useEffect } from 'react';
import { dataRoster } from "../component/DataRoster.js";
import { useNavigate } from 'react-router-dom';

const Schedule = ({ userDetails = { employeeID: '51892', name: '韓建豪', base: 'KHH' } }) => {

  const [currentMonth, setCurrentMonth] = useState(dataRoster.month);
  const [activeTab, setActiveTab] = useState('ALL');
  const navigate = useNavigate();

  // State for tracking selected duties for duty change
  const [selectedDuties, setSelectedDuties] = useState([]);

  // State for tracking highlighted dates and employees
  const [highlightedDates, setHighlightedDates] = useState({});

  // Find the logged-in user's schedule or use a default if none is found
  const userSchedule = dataRoster.crew_schedules.find(
    schedule => schedule.employeeID === userDetails?.employeeID
  ) || dataRoster.crew_schedules[0]; // Use first schedule as fallback

  // Helper function to handle selecting duties
  const handleDutySelect = (employeeId, name, date, duty) => {
    // Format empty duties as "空" for selection
    const displayDuty = duty === "" ? "空" : duty;

    const existingIndex = selectedDuties.findIndex(item =>
      item.employeeId === employeeId && item.date === date
    );

    if (existingIndex >= 0) {
      // If already selected, remove it
      const newSelectedDuties = [...selectedDuties];
      newSelectedDuties.splice(existingIndex, 1);
      setSelectedDuties(newSelectedDuties);

      // Remove highlighted date for this employee
      const newHighlightedDates = { ...highlightedDates };
      delete newHighlightedDates[date];
      setHighlightedDates(newHighlightedDates);
    } else {
      // If not selected, add it
      setSelectedDuties([...selectedDuties, {
        employeeId,
        name,
        date,
        duty: displayDuty
      }]);

      // Add highlighted date with employee ID
      setHighlightedDates({
        ...highlightedDates,
        [date]: employeeId
      });
    }
  };

  // Function to prepare data for DutyChange component
  const prepareForDutyChange = () => {
    if (selectedDuties.length === 0) {
      alert('請先選擇要換班的任務!');
      return;
    }

    // Sort selected duties by date
    const sortedDuties = [...selectedDuties].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    // Group duties by employee
    const dutiesByEmployee = {};
    sortedDuties.forEach(duty => {
      if (!dutiesByEmployee[duty.employeeId]) {
        dutiesByEmployee[duty.employeeId] = {
          id: duty.employeeId,
          name: duty.name,
          duties: []
        };
      }
      dutiesByEmployee[duty.employeeId].duties.push({
        date: duty.date,
        duty: duty.duty
      });
    });

    // If selected duties are from multiple employees, alert user
    if (Object.keys(dutiesByEmployee).length > 1) {
      alert('請只選擇一位同事的任務!');
      return;
    }

    // Get the employee data
    const selectedEmployee = Object.values(dutiesByEmployee)[0];
    const duties = selectedEmployee.duties;

    // Format dates and duties
    let secondDate = '';
    let secondTask = '';

    if (duties.length === 1) {
      // Single date
      secondDate = formatDateForForm(duties[0].date);
      secondTask = duties[0].duty;
    } else {
      // Date range
      const startDate = formatDateForForm(duties[0].date);
      const endDate = formatDateForForm(duties[duties.length - 1].date);
      secondDate = `${startDate} - ${endDate}`;

      // Join duties with comma
      secondTask = duties.map(d => d.duty).join('、');
    }

    // Get the user tasks for the corresponding dates
    const userTasks = getUserTaskForSelectedDates(duties.map(d => d.date));

    // Navigate to DutyChange component with data
    navigate('/duty-change', {
      state: {
        firstID: userDetails.employeeID,
        firstName: userDetails.name,
        firstDate: secondDate, // Same date as second person
        firstTask: userTasks, // Tasks from user's schedule for those dates
        secondID: selectedEmployee.id,
        secondName: selectedEmployee.name,
        secondDate,
        secondTask
      }
    });

    // Clear selections and highlights after submission
    setSelectedDuties([]);
    setHighlightedDates({});
  };

  // Function to get user's tasks for the selected dates
  const getUserTaskForSelectedDates = (dates) => {
    if (!dates || dates.length === 0) return "";

    // Get user tasks for each date
    const tasks = dates.map(date => {
      const duty = userSchedule.days[date] || "";
      return duty === "" ? "空" : duty;
    });

    // Return tasks joined with comma
    return tasks.join('、');
  };

  // Helper to format date for the form (YYYY-MM-DD to MM/DD)
  const formatDateForForm = (dateStr) => {
    const date = new Date(dateStr);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  };

  // Get all dates from the roster data
  const allDates = Object.keys(dataRoster.crew_schedules[0]?.days || {}).sort();

  // Filter out other crew members' schedules based on selected tab
  const otherSchedules = dataRoster.crew_schedules.filter(schedule => {
    // First filter out the current user
    if (schedule.employeeID === userDetails?.employeeID) return false;

    // Then apply the base filter according to the active tab
    if (activeTab === 'ALL') return true;
    return schedule.base === activeTab;
  });

  // Set up scroll synchronization
  useEffect(() => {
    const userTable = document.getElementById('user-schedule-table');
    const crewTable = document.getElementById('crew-schedule-table');

    if (userTable && crewTable) {
      const syncUserTable = () => {
        crewTable.scrollLeft = userTable.scrollLeft;
      };

      const syncCrewTable = () => {
        userTable.scrollLeft = crewTable.scrollLeft;
      };

      userTable.addEventListener('scroll', syncUserTable);
      crewTable.addEventListener('scroll', syncCrewTable);

      return () => {
        userTable.removeEventListener('scroll', syncUserTable);
        crewTable.removeEventListener('scroll', syncCrewTable);
      };
    }
  }, []);

  // Function to get the day of week for a given date
  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[date.getDay()];
  };

  // Function to get employees with the same duty on a given date
  const getEmployeesWithSameDuty = (date, duty) => {
    if (!duty) return [];

    return dataRoster.crew_schedules
      .filter(schedule => schedule.days[date] === duty && schedule.employeeID !== userDetails?.employeeID)
      .map(schedule => {
        return {
          id: schedule.employeeID,
          name: schedule.name || '',
          rank: schedule.rank || '',
          duty: schedule.days[date]
        };
      });
  };

  // Format date for display (e.g., "05/01")
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  };

  // Function to determine if a date cell should be highlighted
  const isDateHighlighted = (date, employeeId) => {
    return highlightedDates[date] === employeeId ||
      (highlightedDates[date] && employeeId === userSchedule.employeeID);
  };

  // Function to get background color for duty
  const getDutyBackgroundColor = (duty) => {
    if (duty === '空' || duty === '休' || duty === '例' || duty === 'G' || duty === '') {
      return 'bg-green-100';
    } else if (duty === 'A/L' || duty === '福補') {
      return 'bg-blue-100';
    }
    return '';
  };

  // Handler for logout
  const handleLogout = () => {
    // In a real app, implement proper logout logic
    window.location.reload();
  };

  // Ensure column width consistency - using a wider column width
  const columnWidth = '65px';

  return (
    <div className="min-h-screen">
      {/* User Navbar */}
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

      <div className="w-full px-2 md:px-4">
        {/* Current Month Display */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold">{dataRoster.month} 班表</h1>
        </div>

        {/* Logged In User Schedule */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3 px-2">Your Schedule</h2>
          {userSchedule ? (
            <div className="overflow-x-auto" id="user-schedule-table">
              <table className="w-full bg-white border border-gray-200 shadow-md rounded-lg">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="sticky left-0 z-10 py-3 px-3 border-b border-r text-left bg-gray-100" style={{ width: '90px' }}>Employee ID</th>
                    <th className="sticky left-24 z-10 py-3 px-3 border-b border-r text-left bg-gray-100" style={{ width: '100px' }}>Name</th>
                    <th className="py-3 px-3 border-b border-r text-left" style={{ width: '70px' }}>Rank</th>
                    <th className="py-3 px-3 border-b border-r text-left" style={{ width: '70px' }}>Base</th>
                    {allDates.map(date => (
                      <th key={date} className="py-3 px-2 border-b border-r text-center" style={{ width: columnWidth, minWidth: columnWidth }}>
                        <div>{formatDate(date)}</div>
                        <div className="text-xs text-gray-500">({getDayOfWeek(date)})</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="sticky left-0 z-10 py-3 px-3 border-b border-r bg-white">{userSchedule.employeeID}</td>
                    <td className="sticky left-24 z-10 py-3 px-3 border-b border-r bg-white">{userSchedule.name || '-'}</td>
                    <td className="py-3 px-3 border-b border-r">{userSchedule.rank || '-'}</td>
                    <td className="py-3 px-3 border-b border-r">{userSchedule.base}</td>
                    {allDates.map(date => {
                      const duty = userSchedule.days[date];
                      const displayDuty = duty || "空";
                      const sameEmployees = getEmployeesWithSameDuty(date, duty);
                      const isHighlighted = Object.keys(highlightedDates).includes(date);
                      const bgColorClass = getDutyBackgroundColor(duty);

                      return (
                        <td
                          key={date}
                          className={`py-3 px-2 border-b border-r text-center relative 
                            ${bgColorClass}
                            ${isHighlighted ? 'bg-orange-200' : ''}
                          `}
                          style={{ width: columnWidth, minWidth: columnWidth }}
                        >
                          <div className="group cursor-pointer">
                            {displayDuty}

                            {sameEmployees.length > 0 && (
                              <div className="hidden group-hover:block absolute z-50 bg-black text-white p-2 rounded shadow-lg w-64 text-left -ml-24 mt-1">
                                <div className="font-semibold mb-1">Same duty ({displayDuty}):</div>
                                {sameEmployees.map(emp => (
                                  <div key={emp.id} className="text-sm mb-1">
                                    <div><span className="font-semibold">ID:</span> {emp.id}</div>
                                    <div><span className="font-semibold">Name:</span> {emp.name || 'N/A'}</div>
                                    <div><span className="font-semibold">Rank:</span> {emp.rank || 'N/A'}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-red-500">Your schedule data not found.</p>
          )}
        </div>

        {/* Filter Tabs for Crew Members' Schedule */}
        <div className="mb-3">
          <h2 className="text-xl font-semibold mb-2 px-2">Crew Members' Schedule</h2>
          <div className="flex border-b border-gray-200 mb-3 px-2">
            <button
              className={`px-6 py-2 font-medium ${activeTab === 'TSA' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('TSA')}
            >
              TSA
            </button>
            <button
              className={`px-6 py-2 font-medium ${activeTab === 'RMQ' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('RMQ')}
            >
              RMQ
            </button>
            <button
              className={`px-6 py-2 font-medium ${activeTab === 'KHH' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('KHH')}
            >
              KHH
            </button>
            <button
              className={`px-6 py-2 font-medium ${activeTab === 'ALL' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('ALL')}
            >
              ALL
            </button>
          </div>
        </div>

        {/* Other Crew Members' Schedule */}
        <div>
          <div className="overflow-x-auto" id="crew-schedule-table">
            <table className="w-full bg-white border border-gray-200 shadow-md rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="sticky left-0 z-10 py-3 px-3 border-b border-r text-left bg-gray-100" style={{ width: '90px' }}>Employee ID</th>
                  <th className="sticky left-24 z-10 py-3 px-3 border-b border-r text-left bg-gray-100" style={{ width: '100px' }}>Name</th>
                  <th className="py-3 px-3 border-b border-r text-left" style={{ width: '70px' }}>Rank</th>
                  <th className="py-3 px-3 border-b border-r text-left" style={{ width: '70px' }}>Base</th>
                  {allDates.map(date => (
                    <th key={date} className="py-3 px-2 border-b border-r text-center" style={{ width: columnWidth, minWidth: columnWidth }}>
                      <div>{formatDate(date)}</div>
                      <div className="text-xs text-gray-500">({getDayOfWeek(date)})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otherSchedules.map(schedule => (
                  <tr key={schedule.employeeID}>
                    <td className="sticky left-0 z-10 py-3 px-3 border-b border-r bg-white">{schedule.employeeID}</td>
                    <td className="sticky left-24 z-10 py-3 px-3 border-b border-r bg-white">{schedule.name || '-'}</td>
                    <td className="py-3 px-3 border-b border-r">{schedule.rank || '-'}</td>
                    <td className="py-3 px-3 border-b border-r">{schedule.base}</td>
                    {allDates.map(date => {
                      const duty = schedule.days[date];
                      const displayDuty = duty || "空";
                      const userDuty = userSchedule?.days[date];
                      const sameEmployees = getEmployeesWithSameDuty(date, duty);
                      const isSelected = selectedDuties.some(item =>
                        item.employeeId === schedule.employeeID && item.date === date
                      );
                      const isHighlighted = isDateHighlighted(date, schedule.employeeID);
                      const bgColorClass = getDutyBackgroundColor(duty);

                      return (
                        <td
                          key={date}
                          className={`py-3 px-2 border-b border-r text-center relative cursor-pointer
                            ${bgColorClass}
                            ${isSelected ? 'ring-2 ring-blue-500' : ''}
                            ${isHighlighted ? 'bg-orange-200' : ''}
                          `}
                          style={{ width: columnWidth, minWidth: columnWidth }}
                          onClick={() => handleDutySelect(
                            schedule.employeeID,
                            schedule.name,
                            date,
                            duty
                          )}
                        >
                          <div className="group cursor-pointer">
                            {displayDuty}

                            {(duty || duty === '') && (
                              <div className="hidden group-hover:block absolute z-50 bg-black text-white p-2 rounded shadow-lg w-64 text-left -ml-24 mt-1">
                                <div className="font-semibold mb-1">Duty: {displayDuty}</div>
                                {sameEmployees.length > 0 ? (
                                  <>
                                    <div className="text-sm font-semibold mt-1">Others with same duty:</div>
                                    {sameEmployees.map(emp => (
                                      <div key={emp.id} className="text-sm mb-1">
                                        <div><span className="font-semibold">ID:</span> {emp.id}</div>
                                        <div><span className="font-semibold">Name:</span> {emp.name || 'N/A'}</div>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <div className="text-sm">No other employees with this duty</div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add buttons at the bottom of the page */}
        <div className="mt-8 flex justify-center space-x-4 mb-8 p-4">
          <button
            onClick={prepareForDutyChange}
            className="dutyChangeButton px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-lg font-medium"
          >
            提交換班申請
          </button>
        </div>
      </div>
    </div>
  );
};

export default Schedule;